from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db_opcional
from app.services.auth.servicio import ServicioAuth

router = APIRouter()


@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Endpoint para inicio de sesion (OAuth2 compatible)"""
    try:
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, form_data.username)

        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not ServicioAuth.verificar_contrasena(
            form_data.password, usuario.hash_contrasena
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if db_erp and (not usuario.area or not usuario.sede):
            try:
                usuario = await ServicioAuth.sincronizar_perfil_desde_erp(
                    db, db_erp, usuario
                )
            except Exception as e:
                print(f"DEBUG: Error no crítico sincronizando perfil en login: {e}")

        permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
        token_acceso = ServicioAuth.crear_token_acceso(
            datos={"sub": usuario.cedula, "rol": usuario.rol}
        )

        await ServicioAuth.registrar_sesion(
            db=db,
            usuario_id=usuario.id,
            token_jwt=token_acceso,
            nombre_usuario=usuario.nombre,
            rol_usuario=usuario.rol,
            direccion_ip=request.client.host if request.client else None,
            agente_usuario=request.headers.get("user-agent"),
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
                "centrocosto": usuario.centrocosto,
                "viaticante": usuario.viaticante,
                "baseviaticos": usuario.baseviaticos,
                "permissions": permisos,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR CRITICO en Login API: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor durante la autenticacion",
        )


@router.post("/portal-login")
async def portal_login(
    request: Request,
    payload: dict,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Endpoint para inicio de sesion simplificado del portal (solo cedula)"""
    cedula = payload.get("username")
    if not cedula:
        raise HTTPException(status_code=400, detail="Cedula requerida")

    if not db_erp:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio ERP no disponible para validacion de portal",
        )

    try:
        from app.services.erp import EmpleadosService

        empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula)
    except Exception as e:
        print(f"ERROR ERP en portal-login: {e}")
        raise HTTPException(status_code=503, detail="Error de conexion con ERP")

    if not empleado:
        raise HTTPException(
            status_code=404, detail="Usuario no encontrado en el sistema"
        )

    usuario_local = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)

    user_data = {
        "id": usuario_local.id if usuario_local else f"USR-P-{cedula}",
        "cedula": cedula,
        "nombre": empleado["nombre"],
        "rol": usuario_local.rol if usuario_local else "usuario",
        "area": empleado.get("area"),
        "cargo": empleado.get("cargo"),
        "sede": empleado.get("ciudadcontratacion"),
        "centrocosto": empleado.get("centrocosto"),
        "viaticante": bool(empleado.get("viaticante")),
        "baseviaticos": empleado.get("baseviaticos"),
    }

    if usuario_local:
        try:
            usuario_local.area = user_data["area"]
            usuario_local.cargo = user_data["cargo"]
            usuario_local.sede = user_data["sede"]
            usuario_local.centrocosto = user_data["centrocosto"]
            usuario_local.nombre = user_data["nombre"]
            usuario_local.viaticante = user_data["viaticante"]
            usuario_local.baseviaticos = user_data["baseviaticos"]
            await db.commit()
        except Exception as e:
            print(f"DEBUG: Error sincronizando usuario local existente: {e}")
            await db.rollback()

    permisos = (
        await ServicioAuth.obtener_permisos_por_rol(db, usuario_local.rol)
        if usuario_local
        else ["service-portal"]
    )

    token_acceso = ServicioAuth.crear_token_acceso(
        datos={"sub": user_data["cedula"], "rol": user_data["rol"]}
    )

    await ServicioAuth.registrar_sesion(
        db=db,
        usuario_id=user_data["id"],
        token_jwt=token_acceso,
        nombre_usuario=user_data["nombre"],
        rol_usuario=user_data["rol"],
        direccion_ip=request.client.host if request.client else None,
        agente_usuario=request.headers.get("user-agent"),
    )

    return {
        "access_token": token_acceso,
        "token_type": "bearer",
        "user": {
            "id": user_data["id"],
            "cedula": user_data["cedula"],
            "name": user_data["nombre"],
            "role": user_data["rol"],
            "email": usuario_local.correo if usuario_local else "usuario@dominio.com",
            "area": user_data["area"],
            "cargo": user_data["cargo"],
            "sede": user_data["sede"],
            "centrocosto": user_data["centrocosto"],
            "viaticante": user_data["viaticante"],
            "baseviaticos": user_data["baseviaticos"],
            "permissions": permisos,
        },
    }


@router.post("/portal-init")
async def portal_init(
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
    token: str = Depends(ServicioAuth.oauth2_scheme),  # Usamos el esquema del servicio
):
    """Endpoint para inicializar físicamente un usuario del portal en la DB local."""
    cedula = ServicioAuth.obtener_cedula_desde_token(token)
    if not cedula:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    usuario_local = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if usuario_local:
        return {"status": "already_exists", "user_id": usuario_local.id}

    if not db_erp:
        raise HTTPException(
            status_code=503, detail="Servicio ERP no disponible para inicialización"
        )

    from app.services.erp.empleados_service import EmpleadosService

    empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula)

    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado en el ERP")

    id_usuario = f"USR-P-{cedula}"
    hash_temporal = ServicioAuth.obtener_hash_contrasena(cedula)

    try:
        from app.models.auth.usuario import Usuario

        nuevo_usuario = Usuario(
            id=id_usuario,
            cedula=cedula,
            nombre=empleado["nombre"],
            hash_contrasena=hash_temporal,
            rol="user",
            esta_activo=True,
            area=empleado.get("area"),
            cargo=empleado.get("cargo"),
            sede=empleado.get("ciudadcontratacion"),
            centrocosto=empleado.get("centrocosto"),
            viaticante=bool(empleado.get("viaticante")),
            baseviaticos=empleado.get("baseviaticos"),
        )
        db.add(nuevo_usuario)
        await db.commit()
        await db.refresh(nuevo_usuario)
        return {
            "status": "created",
            "user_id": nuevo_usuario.id,
            "message": "Usuario inicializado",
        }
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error al crear el registro local")


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    token: str = Depends(ServicioAuth.oauth2_scheme),
):
    """Cierra la sesion actual del usuario"""
    try:
        exito = await ServicioAuth.marcar_fin_sesion(db, token)
        if not exito:
            # No lanzamos error para que el frontend pueda limpiar localmente de todos modos
            print(
                "DEBUG: No se encontro sesion activa para el token al intentar logout"
            )

        return {"message": "Sesion cerrada correctamente"}
    except Exception as e:
        print(f"ERROR en Logout API: {str(e)}")
        return {"message": "Sesion cerrada localmente con errores en servidor"}
