"""
API de Autenticacion - Backend V2 (Async + SQLModel)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import obtener_db, obtener_erp_db
from app.models.auth.usuario import (
    Usuario, UsuarioCrear, UsuarioPublico, PermisoRol,
    TokenRespuesta, LoginRequest, AnalistaCrear, PasswordCambiar
)
from app.services.auth.servicio import ServicioAuth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v2/auth/login")


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db)
):
    """Endpoint para inicio de sesion (OAuth2 compatible)"""
    try:
        # 1. Buscar usuario (async)
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, form_data.username)
        
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # 2. Verificar contrasena (sync, no requiere BD)
        if not ServicioAuth.verificar_contrasena(form_data.password, usuario.hash_contrasena):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # 3. Sincronizar perfil si falta información clave (Auto-parche)
        # Se envuelve en try-except para que un fallo en el ERP no bloquee el login
        if not usuario.area or not usuario.sede:
            try:
                usuario = await ServicioAuth.sincronizar_perfil_desde_erp(db, db_erp, usuario)
            except Exception as e:
                print(f"DEBUG: Error no crítico sincronizando perfil en login: {e}")

        # 4. Obtener permisos del rol
        permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)

        # 5. Generar token (sync)
        token_acceso = ServicioAuth.crear_token_acceso(
            datos={"sub": usuario.cedula, "rol": usuario.rol}
        )
        
        return {
            "access_token": token_acceso, 
            "token_type": "bearer",
            "user": {
                "id": usuario.id,
                "cedula": usuario.cedula,
                "name": usuario.nombre,
                "role": usuario.rol,
                "email": usuario.correo,
                "area": usuario.area,
                "cargo": usuario.cargo,
                "sede": usuario.sede,
                "viaticante": usuario.viaticante,
                "baseviaticos": usuario.baseviaticos,
                "permissions": permisos
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR CRITICO en Login API: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor durante la autenticacion"
        )


@router.post("/registro", response_model=UsuarioPublico)
async def registrar_usuario(usuario: UsuarioCrear, db: AsyncSession = Depends(obtener_db)):
    """Endpoint para registrar un nuevo usuario"""
    # TODO: Implementar logica de registro
    raise HTTPException(status_code=501, detail="Registro no implementado")


async def obtener_usuario_actual_db(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db)
):
    """Dependencia para obtener el objeto usuario completo del token y sincronizar si es necesario"""
    try:
        cedula = ServicioAuth.obtener_cedula_desde_token(token)
        if not cedula:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        # Sincronizar si falta información (Auto-parche)
        if not usuario.area or not usuario.sede:
            try:
                usuario = await ServicioAuth.sincronizar_perfil_desde_erp(db, db_erp, usuario)
            except Exception as e:
                print(f"DEBUG: Error sincronizando perfil en yo: {e}")
                
        return usuario
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al validar usuario: {str(e)}")


@router.get("/yo")
async def obtener_usuario_actual(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Endpoint para obtener los datos del usuario actual con sus permisos"""
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    
    # Convertir a dict para añadir permisos
    user_data = usuario.model_dump()
    user_data["permissions"] = permisos
    return user_data


@router.post("/analistas/crear", response_model=UsuarioPublico)
async def crear_analista(
    datos: AnalistaCrear, 
    db: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db)
):
    """Crea un analista validando contra Solid ERP"""
    try:
        return await ServicioAuth.crear_analista_desde_erp(db, db_erp, datos.cedula)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.patch("/password", response_model=UsuarioPublico)
async def cambiar_contrasena(
    datos: PasswordCambiar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Cambia la contrasena del usuario actual"""
    try:
        # 1. Verificar contrasena actual (sync)
        if not ServicioAuth.verificar_contrasena(datos.contrasena_actual, usuario.hash_contrasena):
            raise HTTPException(status_code=400, detail="La contrasena actual es incorrecta")
            
        return await ServicioAuth.cambiar_contrasena(db, usuario.id, datos.nueva_contrasena)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cambiar contrasena: {str(e)}")


# --- Endpoints de Administración de Usuarios ---

@router.get("/analistas", response_model=List[UsuarioPublico])
async def listar_analistas(
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db)
):
    """Retorna lista de todos los analistas y administradores (Solo Admin)"""
    if admin.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos para ver esta lista")
    
    result = await db.execute(
        select(Usuario).where(Usuario.rol.in_(["analyst", "admin", "director"]))
    )
    return result.scalars().all()


@router.patch("/analistas/{usuario_id}", response_model=UsuarioPublico)
async def actualizar_analista(
    usuario_id: str,
    datos: dict, # Recibe especialidades, areas_asignadas, rol
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db)
):
    """Actualiza metadatos de un analista (Solo Admin)"""
    if admin.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar usuarios")
    
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalars().first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    import json
    if "rol" in datos:
        usuario.rol = datos["rol"]
    if "especialidades" in datos:
        usuario.especialidades = json.dumps(datos["especialidades"])
    if "areas_asignadas" in datos:
        usuario.areas_asignadas = json.dumps(datos["areas_asignadas"])
    if "esta_activo" in datos:
        usuario.esta_activo = datos["esta_activo"]
        
    await db.commit()
    await db.refresh(usuario)
    return usuario


@router.get("/permisos")
async def listar_permisos(
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db)
):
    """Lista todos los permisos configurados (Solo Admin)"""
    if admin.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos para ver esta lista")
    
    result = await db.execute(select(PermisoRol))
    return result.scalars().all()


@router.post("/permisos")
async def actualizar_permisos(
    permisos: List[dict], # Lista de {rol, modulo, permitido}
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db)
):
    """Actualiza la matriz de permisos (Solo Admin)"""
    if admin.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar permisos")
    
    for p in permisos:
        # Buscar si ya existe
        result = await db.execute(
            select(PermisoRol).where(
                PermisoRol.rol == p["rol"],
                PermisoRol.modulo == p["modulo"]
            )
        )
        permiso_db = result.scalars().first()
        
        if permiso_db:
            permiso_db.permitido = p["permitido"]
        else:
            nuevo_permiso = PermisoRol(
                rol=p["rol"],
                modulo=p["modulo"],
                permitido=p["permitido"]
            )
            db.add(nuevo_permiso)
            
    await db.commit()
    return {"mensaje": "Permisos actualizados correctamente"}
@router.get("/viaticos/status/{cedula}")
async def obtener_estado_viaticos(cedula: str, db: AsyncSession = Depends(obtener_db)):
    """Verifica si un empleado ya tiene contraseña configurada para viáticos"""
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    return {"registrado": usuario is not None}


@router.post("/viaticos/configurar")
async def configurar_password_viaticos(
    datos: LoginRequest, 
    db: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db)
):
    """Permite a un empleado del portal configurar su contraseña por primera vez"""
    try:
        usuario = await ServicioAuth.crear_usuario_portal_desde_erp(
            db, db_erp, datos.cedula, datos.contrasena
        )
        return {"mensaje": "Contraseña configurada exitosamente", "usuario": usuario.nombre}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/viaticos/verificar")
async def verificar_password_viaticos(datos: LoginRequest, db: AsyncSession = Depends(obtener_db)):
    """Valida la contraseña de viáticos sin iniciar una sesión administrativa"""
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, datos.cedula)
    
    if not usuario or not ServicioAuth.verificar_contrasena(datos.contrasena, usuario.hash_contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta"
        )
    
    return {"mensaje": "Identidad verificada", "nombre": usuario.nombre}
