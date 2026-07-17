"""Endpoints con sesion: /login y /logout.

Los demas endpoints de auth viven en routers hermanos (public_auth_router,
refresh_router, mcp_token_router). Este archivo solo conserva los flujos
que tocan Sesion / JWT directo.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm  # @audit-ok
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.core.config import obtener_configuracion
from app.core.rate_limiter import (
    _login_key_func,
    _logout_key_func,
    _registrar_fallo_cedula,
    _verificar_lockout_cedula,
    limiter,
)
from app.database import obtener_db, obtener_erp_db_opcional
from app.models.auth.usuario import Usuario
from app.database import AsyncSessionLocal
from app.models.auditoria.accion_usuario import AccionAuditoria
from app.services.auditoria.servicio import ServicioAuditoria
from app.services.auth.servicio import (
    ServicioAuth,
    enmascarar_pii,
    normalizar_cedula,
)


logger = logging.getLogger(__name__)
router = APIRouter()
_settings = obtener_configuracion()


async def _auditar_login(
    *,
    usuario_id: str,
    usuario_nombre: str | None,
    rol: str | None,
    exitoso: bool,
    motivo: str,
    request: Request,
) -> None:
    correlacion_id = getattr(request.state, "correlacion_id", None)
    async with AsyncSessionLocal() as audit_db:
        await ServicioAuditoria.registrar(
            audit_db,
            usuario_id=usuario_id,
            usuario_nombre=usuario_nombre,
            rol=rol,
            modulo="auth",
            accion=AccionAuditoria.LOGIN,
            resultado="exito" if exitoso else "fallo",
            metodo_http="POST",
            ruta="/api/v2/auth/login",
            direccion_ip=request.client.host if request.client else None,
            agente_usuario=request.headers.get("user-agent"),
            correlacion_id=correlacion_id,
            metadatos={"motivo": motivo},
        )


@router.post("/login")
@limiter.limit(_settings.rate_limit_login, key_func=_login_key_func)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),  # @audit-ok
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Endpoint para inicio de sesion (OAuth2 compatible)"""
    try:
        cedula_normalizada = normalizar_cedula(form_data.username)
        password_normalizada = (form_data.password or "").strip()

        # Lockout por cuenta: defense-in-depth sobre el rate limit por IP.
        # Si la cuenta esta lockeada en Redis, rechazamos con 429 sin tocar DB.
        lockout_segundos = _verificar_lockout_cedula(cedula_normalizada)
        if lockout_segundos:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Cuenta temporalmente bloqueada por multiples intentos fallidos. Reintente en {lockout_segundos // 60} minutos.",
                headers={"Retry-After": str(lockout_segundos)},
            )

        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula_normalizada)

        if not usuario:
            jit_creado = False
            if db_erp:
                from app.services.erp.empleados_service import (
                    EmpleadosService,
                    normalizar_bool_erp,
                )
                empleado = await EmpleadosService.validar_empleado_activo_autogestion(
                    db_erp, cedula_normalizada
                )
                if empleado:
                    if password_normalizada.lower() == cedula_normalizada:
                        raise HTTPException(
                            status_code=400,
                            detail="La contraseña no puede ser igual a la cédula. Por favor, elige una contraseña diferente.",
                        )
                    if not config.portal_pending_pwd:
                        raise HTTPException(
                            status_code=503,
                            detail="El alta automática no está disponible temporalmente.",
                        )
                    hash_pendiente = ServicioAuth.obtener_hash_contrasena(config.portal_pending_pwd)
                    id_usuario = f"USR-P-{cedula_normalizada}"
                    viaticante_val = normalizar_bool_erp(empleado.get("viaticante"))
                    nuevo_usuario = Usuario(
                        id=id_usuario,
                        cedula=cedula_normalizada,
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
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Contraseña no configurada",
                    headers={"X-Password-Not-Set": "true"},
                )
            if not usuario:
                # Cedula no existe: contar como fallo para lockout per-cuenta.
                _registrar_fallo_cedula(cedula_normalizada)
                await _auditar_login(
                    usuario_id="desconocido",
                    usuario_nombre=None,
                    rol=None,
                    exitoso=False,
                    motivo="usuario_no_encontrado",
                    request=request,
                )
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

        if not ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña no configurada",
                headers={"X-Password-Not-Set": "true"},
            )

        if not ServicioAuth.verificar_contrasena(
            password_normalizada, usuario.hash_contrasena  # @audit-ok
        ):
            # Password incorrecto: contar como fallo para lockout per-cuenta.
            _registrar_fallo_cedula(cedula_normalizada)
            await _auditar_login(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre,
                rol=usuario.rol,
                exitoso=False,
                motivo="contrasena_incorrecta",
                request=request,
            )
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
                logger.warning("Error no crítico sincronizando perfil en login: %s", enmascarar_pii(str(e)))

        permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
        # Stamp last_ip en el JWT: la IP real de la conexión (no el XFF claim).
        # El key func de endpoints autenticados usa este claim para validar
        # que el XFF no haya sido manipulado entre logins.
        token_acceso = ServicioAuth.crear_token_acceso(
            datos={"sub": usuario.cedula, "rol": usuario.rol},
            last_ip=request.client.host if request.client else None,
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

        await _auditar_login(
            usuario_id=usuario.id,
            usuario_nombre=usuario.nombre,
            rol=usuario.rol,
            exitoso=True,
            motivo="exito",
            request=request,
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


@router.post("/logout")
@limiter.limit(_settings.rate_limit_logout, key_func=_logout_key_func)
async def logout(
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    token: str = Depends(ServicioAuth.oauth2_scheme),
):
    """Cierra la sesion actual del usuario"""
    try:
        payload = ServicioAuth.obtener_payload_token(token)
        cedula = payload.get("sub") if payload else None
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula) if cedula else None

        exito = await ServicioAuth.marcar_fin_sesion(db, token)
        if not exito:
            raise HTTPException(status_code=401, detail="Sesion no activa")

        if usuario:
            correlacion_id = getattr(request.state, "correlacion_id", None)
            async with AsyncSessionLocal() as audit_db:
                await ServicioAuditoria.registrar(
                    audit_db,
                    usuario_id=usuario.id,
                    usuario_nombre=usuario.nombre,
                    rol=usuario.rol,
                    modulo="auth",
                    accion=AccionAuditoria.LOGOUT,
                    metodo_http="POST",
                    ruta="/api/v2/auth/logout",
                    direccion_ip=request.client.host if request.client else None,
                    agente_usuario=request.headers.get("user-agent"),
                    correlacion_id=correlacion_id,
                )

        return {"message": "Sesion cerrada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Logout API error", exc_info=True, extra={"detail": enmascarar_pii(str(e))})
        raise HTTPException(status_code=503, detail="No fue posible cerrar la sesion")
