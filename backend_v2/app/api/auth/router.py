"""
API de Autenticacion - Backend V2 (Async + SQLModel)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db
from app.models.auth.usuario import (
    Usuario, UsuarioCrear, UsuarioPublico,
    TokenRespuesta, LoginRequest, AnalistaCrear, PasswordCambiar
)
from app.services.auth.servicio import ServicioAuth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v2/auth/login")


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(obtener_db)):
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
            
        # 3. Generar token (sync)
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
                "email": usuario.correo
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


async def obtener_usuario_actual_db(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(obtener_db)):
    """Dependencia para obtener el objeto usuario completo del token"""
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
        return usuario
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al validar usuario: {str(e)}")


@router.get("/yo", response_model=UsuarioPublico)
async def obtener_usuario_actual(usuario: Usuario = Depends(obtener_usuario_actual_db)):
    """Endpoint para obtener los datos del usuario actual"""
    return usuario


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
