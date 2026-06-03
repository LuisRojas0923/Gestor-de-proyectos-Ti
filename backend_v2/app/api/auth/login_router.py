from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm  # @audit-ok
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db_opcional
from app.services.auth.servicio import ServicioAuth
from app.models.auth.usuario import (
    LoginRequest, RecoveryRequest, PasswordReset, UsuarioRegistro, Usuario,
)
from app.services.notifications.email_service import EmailService
from app.core.rate_limiter import limiter
from app.config import config

router = APIRouter()


@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),  # @audit-ok
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Endpoint para inicio de sesion (OAuth2 compatible)"""
    try:
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, form_data.username)

        if not usuario:
            jit_creado = False
            if db_erp:
                try:
                    from app.services.erp.empleados_service import EmpleadosService
                    empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, form_data.username)
                except HTTPException:
                    raise
                except Exception:
                    empleado = None
                if empleado:
                    hash_pendiente = ServicioAuth.obtener_hash_contrasena(config.portal_pending_pwd)
                    id_usuario = f"USR-P-{form_data.username}"
                    viaticante_val = bool(empleado.get("viaticante"))
                    nuevo_usuario = Usuario(
                        id=id_usuario,
                        cedula=form_data.username,
                        nombre=empleado["nombre"],
                        hash_contrasena=hash_pendiente,
                        rol="viaticante" if viaticante_val else "usuario",
                        esta_activo=True,
                        area=empleado.get("area"),
                        cargo=empleado.get("cargo"),
                        sede=empleado.get("ciudadcontratacion"),
                        centrocosto=empleado.get("centrocosto"),
                        viaticante=viaticante_val,
                        baseviaticos=empleado.get("baseviaticos"),
                        correo=empleado.get("correocorporativo", "").strip()
                        if empleado.get("correocorporativo")
                        else None,
                        correo_actualizado=bool(empleado.get("correocorporativo")),
                        correo_verificado=False,
                    )
                    db.add(nuevo_usuario)
                    await db.commit()
                    jit_creado = True
            if jit_creado:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Contraseña no configurada",
                    headers={"X-Password-Not-Set": "true"},
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña no configurada",
                headers={"X-Password-Not-Set": "true"},
            )

        if not ServicioAuth.verificar_contrasena(
            form_data.password, usuario.hash_contrasena  # @audit-ok
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not usuario.esta_activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta está desactivada. Por favor, contacte al administrador.",
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
            "access_token": token_acceso,  # @audit-ok
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
                "email_needs_update": not usuario.correo_actualizado,
                "correo_verificado": usuario.correo_verificado,
                "password_set": ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula),
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


@router.post("/setup-password")
@limiter.limit("30/hour")
async def setup_password(
    request: Request,
    datos: LoginRequest,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Configura la contraseña por primera vez para usuarios con password_set=False.
    No requiere autenticación ni contraseña actual. Sigue el mismo patrón que
    /viaticos/configurar pero sin restricción de rol."""
    try:
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, datos.cedula)

        if usuario:
            if ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula):
                raise HTTPException(
                    status_code=400,
                    detail="El usuario ya tiene una contraseña configurada",
                )
            await ServicioAuth.cambiar_contrasena(db, usuario.id, datos.contrasena)
            return {"message": "Contraseña configurada exitosamente", "cedula": usuario.cedula}

        if not db_erp:
            raise HTTPException(
                status_code=503,
                detail="Servicio ERP no disponible para crear el usuario",
            )

        from app.services.erp import EmpleadosService

        empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, datos.cedula)
        if not empleado:
            raise HTTPException(
                status_code=404,
                detail="Usuario no encontrado en el sistema. Debe registrarse primero o contactar al administrador.",
            )

        nuevo_usuario = await ServicioAuth.crear_usuario_portal_desde_erp(
            db, db_erp, datos.cedula, datos.contrasena
        )
        return {"message": "Usuario creado y contraseña configurada exitosamente", "cedula": nuevo_usuario.cedula}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR CRITICO en setup-password API: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor",
        )


@router.get("/password-status/{cedula}")
async def password_status(
    cedula: str,
    db: AsyncSession = Depends(obtener_db),
):
    """Verifica si un usuario tiene la contraseña configurada."""
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if not usuario:
        return {"configurado": False, "existe": False}
    configurado = ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula)
    return {"configurado": configurado, "existe": True}


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


@router.post("/forgot-password")
async def forgot_password(
    payload: RecoveryRequest,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
):
    """Genera un token de recuperación y envía un correo al usuario"""
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, payload.cedula)
    
    if not usuario:
        # Por seguridad, no revelamos si el usuario existe, pero informamos si no hay correo
        return {"message": "Si el usuario está registrado, se ha enviado un correo de recuperación."}

    if not usuario.correo or not usuario.correo_actualizado:
        raise HTTPException(
            status_code=400,
            detail="El usuario no tiene un correo corporativo validado. Por favor, contacte al administrador."
        )

    token = ServicioAuth.crear_token_recuperacion(usuario.id)
    reset_url = f"{EmailService.get_frontend_url()}/reset-password?token={token}"

    enviado = await EmailService.enviar_recuperacion_contrasena(
        usuario.correo, usuario.nombre, reset_url
    )

    if not enviado:
        raise HTTPException(
            status_code=500,
            detail="No se pudo enviar el correo de recuperación. Intente más tarde."
        )

    return {"message": "Se ha enviado un correo con instrucciones para restablecer su contraseña."}


@router.post("/reset-password")
async def reset_password(
    payload: PasswordReset,
    db: AsyncSession = Depends(obtener_db),
):
    """Restablece la contraseña de un usuario usando un token válido"""
    usuario_id = ServicioAuth.validar_token_recuperacion(payload.token)
    
    if not usuario_id:
        raise HTTPException(
            status_code=400,
            detail="Token de recuperación inválido o expirado."
        )

    try:
        await ServicioAuth.cambiar_contrasena(db, usuario_id, payload.nueva_contrasena)
        # Opcionalmente invalidar sesiones antiguas
        await ServicioAuth.invalidar_sesiones_usuario(db, usuario_id)
        
        return {"message": "Contraseña restablecida exitosamente. Ya puede iniciar sesión."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"ERROR en Reset Password API: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno al restablecer la contraseña.")


@router.post("/registro")
async def registro_usuario_portal(
    payload: UsuarioRegistro,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Endpoint público para registro de usuarios en el portal (pendiente de aprobación)"""
    # 1. Validar que las contraseñas coincidan
    if payload.contrasena != payload.contrasena_confirmar:
        raise HTTPException(
            status_code=400, detail="Las contraseñas no coinciden"
        )

    # 2. Validar que la contraseña no sea igual a la cédula
    if payload.contrasena.lower() == payload.cedula.lower():
        raise HTTPException(
            status_code=400, detail="La contraseña no puede ser igual a la cédula"
        )

    # 3. Validar formato de correo si se proporciona
    if payload.correo and ("@" not in payload.correo or "." not in payload.correo):
        raise HTTPException(
            status_code=400, detail="Formato de correo inválido"
        )

    try:
        usuario = await ServicioAuth.registrar_usuario_portal(
            db=db,
            db_erp=db_erp,
            cedula=payload.cedula,
            nombre=payload.nombre,
            correo=payload.correo,
            contrasena=payload.contrasena,
        )
        return {
            "message": "Cuenta creada exitosamente. Pendiente de aprobación por un administrador.",
            "user_id": usuario.id,
            "cedula": usuario.cedula,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"ERROR en Registro API: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error interno al registrar la cuenta"
        )
