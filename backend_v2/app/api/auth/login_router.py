from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm  # @audit-ok
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db_opcional
from app.services.auth.servicio import ServicioAuth
from app.services.auth.servicio import normalizar_cedula, enmascarar_pii
from app.models.auth.usuario import (
    LoginRequest, RecoveryRequest, PasswordReset, UsuarioRegistro, Usuario,
)
from app.services.notifications.email_service import EmailService
from app.core.rate_limiter import limiter, _login_key_func
from app.config import config
from app.core.config import obtener_configuracion
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login")
@limiter.limit("10/minute;30/hour", key_func=_login_key_func)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),  # @audit-ok
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Endpoint para inicio de sesion (OAuth2 compatible)"""
    settings = obtener_configuracion()
    try:
        cedula_normalizada = normalizar_cedula(form_data.username)
        password_normalizada = (form_data.password or "").strip()
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula_normalizada)

        if not usuario:
            jit_creado = False
            if db_erp:
                try:
                    from app.services.erp.empleados_service import EmpleadosService
                    empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula_normalizada)
                except HTTPException:
                    raise
                except Exception:
                    empleado = None
                if empleado:
                    if password_normalizada.lower() == cedula_normalizada:
                        raise HTTPException(
                            status_code=400,
                            detail="La contraseña no puede ser igual a la cédula. Por favor, elige una contraseña diferente.",
                        )
                    hash_pendiente = ServicioAuth.obtener_hash_contrasena(config.portal_pending_pwd)
                    id_usuario = f"USR-P-{cedula_normalizada}"
                    viaticante_val = bool(empleado.get("viaticante"))
                    nuevo_usuario = Usuario(
                        id=id_usuario,
                        cedula=cedula_normalizada,
                        nombre=empleado["nombre"],
                        hash_contrasena=hash_pendiente,
                        rol="viaticante" if viaticante_val else "usuario",
                        esta_activo=settings.jit_auto_aprobar,
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
                    try:
                        db.add(nuevo_usuario)
                        await db.commit()
                        jit_creado = True
                    except IntegrityError:
                        await db.rollback()
                        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula_normalizada)
                        if not usuario:
                            raise HTTPException(
                                status_code=500,
                                detail="No se pudo crear ni recuperar el usuario JIT",
                            )
            if jit_creado:
                if settings.jit_auto_aprobar:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Contraseña no configurada",
                        headers={"X-Password-Not-Set": "true"},
                    )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tu cuenta está pendiente de aprobación por un administrador. Recibirás un correo cuando sea activada.",
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
            password_normalizada, usuario.hash_contrasena  # @audit-ok
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
                logger.warning("Error no crítico sincronizando perfil en login: %s", enmascarar_pii(str(e)))

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
        logger.error("Login API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
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
        cedula_norm = normalizar_cedula(datos.cedula)
        contrasena_norm = (datos.contrasena or "").strip()
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula_norm)

        if contrasena_norm.lower() == cedula_norm:
            raise HTTPException(
                status_code=400,
                detail="La contraseña no puede ser igual a la cédula. Por favor, elige una contraseña diferente.",
            )

        if usuario:
            if ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula):
                raise HTTPException(
                    status_code=400,
                    detail="El usuario ya tiene una contraseña configurada",
                )
            await ServicioAuth.cambiar_contrasena(db, usuario.id, contrasena_norm)
            return {"message": "Contraseña configurada exitosamente", "cedula": usuario.cedula}

        if not db_erp:
            raise HTTPException(
                status_code=503,
                detail="Servicio ERP no disponible para crear el usuario",
            )

        from app.services.erp import EmpleadosService

        empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula_norm)
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
        logger.error("setup-password API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
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
            logger.info("No se encontro sesion activa para el token al intentar logout")

        return {"message": "Sesion cerrada correctamente"}
    except Exception as e:
        logger.error("Logout API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
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
        logger.error("Reset Password API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
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
        logger.error("Registro API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
        raise HTTPException(
            status_code=500, detail="Error interno al registrar la cuenta"
        )


# ────────────────────────────────────────────────────────────────────
# Endpoints MCP (ver docs/PLAN_SERVIDOR_MCP.md seccion 4.4)
# ────────────────────────────────────────────────────────────────────

def _mcp_token_key_func(request) -> str:
    """Key function para /auth/mcp-token: bucket por IP.
    No usa _login_key_func porque ese parsea form-urlencoded y este
    endpoint recibe JSON payload."""
    return f"mcp_token:{get_remote_address(request)}"


@router.post("/mcp-token")
@limiter.limit("5/hour", key_func=_mcp_token_key_func)
async def emitir_token_mcp(
    request: Request,
    payload: dict,
    usuario_actual: Usuario = Depends(
        __import__("app.api.auth.profile_router", fromlist=["obtener_usuario_actual_db"]).obtener_usuario_actual_db
    ),
    db: AsyncSession = Depends(obtener_db),
):
    """Emite un token MCP de larga duracion para el usuario autenticado.

    ANTI-ORFANDAD: solo sesiones web (token_type='session') pueden emitir
    tokens MCP. Un token MCP no puede generar otro token MCP.
    """
    # Anti-orfandad: validar tipo de credencial entrante
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token_entrante = auth_header[7:]
        payload_in = ServicioAuth.obtener_payload_token(token_entrante)
        if payload_in and payload_in.get("token_type") == "mcp":
            raise HTTPException(
                status_code=403,
                detail="Los tokens MCP no pueden emitir otros tokens MCP. "
                       "Inicia sesion web para generar un token MCP nuevo.",
            )

    from app.services.auth.mcp_service import emitir_token_mcp as svc

    return await svc(
        db,
        usuario_actual,
        vigencia_dias=payload.get("vigencia_dias", 30),
        scope=payload.get("scope", "read"),
        motivo=enmascarar_pii(payload.get("motivo", "")),
        direccion_ip=request.client.host if request.client else None,
    )


@router.get("/mcp-tokens")
async def listar_mis_tokens_mcp(
    usuario_actual: Usuario = Depends(
        __import__("app.api.auth.profile_router", fromlist=["obtener_usuario_actual_db"]).obtener_usuario_actual_db
    ),
    db: AsyncSession = Depends(obtener_db),
):
    """Lista los tokens MCP activos del usuario autenticado."""
    from app.services.auth.mcp_service import listar_tokens_mcp_activos

    return {"tokens": await listar_tokens_mcp_activos(db, usuario_actual)}


@router.delete("/mcp-tokens/{jti}")
async def revocar_mi_token_mcp(
    jti: str,
    usuario_actual: Usuario = Depends(
        __import__("app.api.auth.profile_router", fromlist=["obtener_usuario_actual_db"]).obtener_usuario_actual_db
    ),
    db: AsyncSession = Depends(obtener_db),
):
    """Revoca un token MCP propio por jti."""
    from app.services.auth.mcp_service import revocar_token_mcp

    ok = await revocar_token_mcp(db, usuario_actual, jti)
    if not ok:
        raise HTTPException(404, "Token no encontrado o no te pertenece")
    return {"message": "Token revocado"}
