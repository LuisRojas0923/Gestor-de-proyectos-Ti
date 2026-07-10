"""Endpoints publicos de auth sin sesion: setup-password, password-status,
forgot-password, reset-password y registro. Extraido de login_router.py para
mantener ese archivo bajo el limite de lineas (regla enforced por el
pre-commit hook `enforce-architecture-backend`).
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import obtener_configuracion
from app.core.rate_limiter import (
    _generic_json_body_key_func,
    _password_status_key_func,
    _setup_password_key_func,
    limiter,
)
from app.database import obtener_db, obtener_erp_db_opcional
from app.models.auth.usuario import (
    LoginRequest,
    PasswordReset,
    RecoveryRequest,
    UsuarioRegistro,
)
from app.services.auth.servicio import (
    ServicioAuth,
    enmascarar_pii,
    normalizar_cedula,
)
from app.services.notifications.email_service import EmailService


logger = logging.getLogger(__name__)
router = APIRouter()
_settings = obtener_configuracion()


@router.post("/setup-password")
@limiter.limit(_settings.rate_limit_setup_password, key_func=_setup_password_key_func)
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
        cedula_norm = normalizar_cedula(datos.cedula)
        contrasena_norm = (datos.contrasena or "").strip()
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula_norm)

        if contrasena_norm.lower() == cedula_norm:
            raise HTTPException(
                status_code=400,
                detail="La contraseña no puede ser igual a la cédula. Por favor, elige una contraseña diferente.",
            )

        if usuario:
            if not usuario.esta_activo:
                raise HTTPException(
                    status_code=403,
                    detail="La cuenta está desactivada. Por favor, contacte al administrador.",
                )
            if ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula):
                raise HTTPException(
                    status_code=400,
                    detail="El usuario ya tiene una contraseña configurada",
                )
            await ServicioAuth.cambiar_contrasena(db, usuario.id, contrasena_norm)
            return {"message": "Contraseña configurada exitosamente", "cedula": usuario.cedula}

        if not db_erp:
            raise HTTPException(
                status_code=400,
                detail="No fue posible habilitar la cuenta con la informacion proporcionada. Verifique los datos o contacte al administrador.",
            )

        try:
            nuevo_usuario = await ServicioAuth.crear_usuario_portal_desde_erp(
                db, db_erp, cedula_norm, contrasena_norm
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return {"message": "Usuario creado y contraseña configurada exitosamente", "cedula": nuevo_usuario.cedula}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("setup-password API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor",
        )


@router.get("/password-status/{cedula}")
@limiter.limit(_settings.rate_limit_password_status, key_func=_password_status_key_func)
async def password_status(
    request: Request,
    cedula: str,
    db: AsyncSession = Depends(obtener_db),
):
    """Verifica si un usuario tiene la contraseña configurada.

    Limitado por IP+cedula para mitigar enumeracion automatizada de
    cuentas (este endpoint distingue {existe: true} vs {existe: false}).
    La respuesta se mantiene igual por compatibilidad con el frontend;
    endurecerla (unificar shape, gating con captcha) es un ticket aparte.
    """
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if not usuario:
        return {"configurado": False, "existe": False}
    configurado = ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula)
    return {"configurado": configurado, "existe": True}


@router.post("/forgot-password")
@limiter.limit(_settings.rate_limit_forgot_password, key_func=_generic_json_body_key_func)
async def forgot_password(
    request: Request,
    payload: RecoveryRequest,
    db: AsyncSession = Depends(obtener_db),
):
    """Genera un token de recuperación y envía un correo al usuario.

    El mensaje de respuesta es identico exista o no la cuenta, para
    no filtrar informacion de enumeracion. El rate limit por IP+cedula
    cierra el vector de brute-force / spam de correos.
    """
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
@limiter.limit(_settings.rate_limit_reset_password, key_func=_generic_json_body_key_func)
async def reset_password(
    request: Request,
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
        logger.error("Reset Password API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
        raise HTTPException(status_code=500, detail="Error interno al restablecer la contraseña.")


@router.post("/registro")
@limiter.limit(_settings.rate_limit_registro, key_func=_generic_json_body_key_func)
async def registro_usuario_portal(
    request: Request,
    payload: UsuarioRegistro,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Endpoint público para registro de usuarios activos confirmados por ERP."""
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
            "message": "Cuenta creada y habilitada exitosamente.",
            "user_id": usuario.id,
            "cedula": usuario.cedula,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Registro API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
        raise HTTPException(
            status_code=500, detail="Error interno al registrar la cuenta"
        )
