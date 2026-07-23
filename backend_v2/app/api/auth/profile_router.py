from typing import Any, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db_opcional
from app.models.auth.usuario import Sesion, Token, Usuario, UsuarioPublico, PasswordCambiar, EmailActualizar
from app.database import AsyncSessionLocal
from app.models.auditoria.accion_usuario import AccionAuditoria
from app.services.auditoria.servicio import ServicioAuditoria
from app.services.auth.servicio import ServicioAuth
from app.services.erp import EmpleadosService
from app.services.notifications.email_service import EmailService
from app.utils_date import get_bogota_now

logger = logging.getLogger(__name__)
router = APIRouter()


async def obtener_usuario_actual_db(
    request: Request,
    token: str = Depends(ServicioAuth.oauth2_scheme),
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    """Dependencia para obtener el objeto usuario completo del token y sincronizar si es necesario.

    Validacion adicional para tokens MCP (ver docs/PLAN_SERVIDOR_MCP.md seccion 4.5):
    - Si token_type == 'mcp', se valida que la sesion correspondiente (por jti)
      este activa (fin_sesion IS NULL, expira_en > now).
    - Backwards compatible: tokens existentes sin token_type se tratan como 'session'.
    """
    try:
        # Decodificar payload completo para detectar token_type='mcp'
        payload = ServicioAuth.obtener_payload_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        cedula = payload.get("sub")
        if not cedula:
            raise HTTPException(401, "Token sin sujeto")

        # ── Validacion especifica para tokens MCP ──
        if payload.get("token_type") == "mcp":
            jti = payload.get("jti")
            if not jti:
                raise HTTPException(401, "Token MCP sin jti")
            sesion = (
                await db.execute(
                    select(Sesion).where(
                        Sesion.jti == jti,
                        Sesion.tipo_sesion == "mcp",
                    )
                )
            ).scalars().first()
            # Chequear primero si la sesion existe antes de acceder a sus atributos
            if not sesion:
                raise HTTPException(401, "Token MCP revocado o expirado")
            # Normalizar: sesion.expira_en viene AWARE (asyncpg), get_bogota_now() es naive
            expira_naive = sesion.expira_en.replace(tzinfo=None) if sesion.expira_en else None
            if sesion.fin_sesion is not None or (expira_naive and expira_naive < get_bogota_now()):
                raise HTTPException(401, "Token MCP revocado o expirado")
            # Throttle: actualizar ultima_actividad_en solo si > 5 min desde la ultima
            ahora = get_bogota_now()
            ultima = sesion.ultima_actividad_en.replace(tzinfo=None) if sesion.ultima_actividad_en else None
            if not ultima or (ahora - ultima).total_seconds() > 300:
                sesion.ultima_actividad_en = ahora
                try:
                    await db.commit()
                except Exception:
                    await db.rollback()
        elif payload.get("token_type", "session") == "session":
            sesion = await ServicioAuth.obtener_sesion_web_activa(db, token)
            if not sesion:
                raise HTTPException(401, "Sesion web revocada o expirada")
        else:
            raise HTTPException(401, "Tipo de token no permitido")

        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)

        if not usuario:
            # Usuario estándar: existe en ERP pero no persiste localmente (Rol usuario)
            if not db_erp:
                raise HTTPException(
                    status_code=503,
                    detail="Servicio ERP no disponible para validar perfil de usuario",
                )
            from app.services.erp.empleados_service import EmpleadosService

            empleado = await EmpleadosService.obtener_empleado_por_cedula(
                db_erp, cedula
            )
            if not empleado:
                raise HTTPException(
                    status_code=404,
                    detail="Usuario no encontrado en la base local ni en el ERP",
                )

            # Instanciar modelo en memoria para responder al Auth profile
            usuario = Usuario(
                id=f"USR-P-{cedula}",
                cedula=cedula,
                nombre=empleado.get("nombre", "Usuario Portal"),
                hash_contrasena="N/A",
                rol="usuario",  # Asumimos rol usuario para portal estándar
                esta_activo=True,
                area=empleado.get("area"),
                cargo=empleado.get("cargo"),
                sede=empleado.get("ciudadcontratacion"),
                centrocosto=empleado.get("centrocosto"),
                viaticante=bool(empleado.get("viaticante")),
                baseviaticos=empleado.get("baseviaticos"),
            )
            request.state.usuario_id = usuario.id
            request.state.token_type = payload.get("token_type", "session")
            return usuario

        if not usuario.esta_activo:
            raise HTTPException(401, "Cuenta desactivada")

        # Si el usuario es local y no tiene area/sede pero hay ERP disponible, sincronizar:
        if db_erp and (not usuario.area or not usuario.sede):
            try:
                usuario = await ServicioAuth.sincronizar_perfil_desde_erp(
                    db, db_erp, usuario
                )
            except Exception:
                logger.warning("No fue posible sincronizar el perfil local con ERP")

        request.state.usuario_id = usuario.id
        request.state.usuario_nombre = usuario.nombre
        request.state.usuario_rol = usuario.rol
        request.state.token_type = payload.get("token_type", "session")
        return usuario
    except HTTPException:
        raise
    except Exception:
        logger.error("obtener_usuario_actual_db: error inesperado")
        raise HTTPException(status_code=500, detail="Error al validar usuario")


async def obtener_usuario_actual_opcional(
    request: Request,
    token: Optional[str] = Depends(ServicioAuth.oauth2_scheme_opcional),
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
) -> Optional[Usuario]:
    """
    Versión opcional de obtener_usuario_actual_db.
    Si no hay token o es inválido, retorna None en lugar de lanzar 401.
    """
    if not token:
        return None
    try:
        return await obtener_usuario_actual_db(request, token, db, db_erp)
    except Exception:
        return None


@router.get("/yo")
async def obtener_usuario_actual(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Endpoint para obtener los datos del usuario actual con sus permisos"""
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)

    # Fallback para el rol 'usuario' (estándar del portal) si no hay permisos configurados implícitamente
    if not permisos and (usuario.rol == "usuario" or usuario.rol == "user"):
        permisos = ["service-portal"]

    user_data = usuario.model_dump()
    user_data["permissions"] = permisos
    user_data["email_needs_update"] = not usuario.correo_actualizado
    user_data["password_set"] = ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula)
    return user_data


@router.patch("/password", response_model=UsuarioPublico)
async def cambiar_contrasena(
    request: Request,
    datos: PasswordCambiar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Cambia la contrasena del usuario actual"""
    try:
        if not ServicioAuth.verificar_contrasena(
            datos.contrasena_actual, usuario.hash_contrasena
        ):
            async with AsyncSessionLocal() as audit_db:
                await ServicioAuditoria.registrar(
                    audit_db,
                    usuario_id=usuario.id,
                    usuario_nombre=usuario.nombre,
                    rol=usuario.rol,
                    modulo="auth",
                    accion=AccionAuditoria.ACTUALIZAR,
                    resultado="fallo",
                    entidad_tipo="usuario",
                    entidad_id=usuario.id,
                    metodo_http="PATCH",
                    ruta="/api/v2/auth/password",
                    direccion_ip=request.client.host if request.client else None,
                    agente_usuario=request.headers.get("user-agent"),
                    correlacion_id=getattr(request.state, "correlacion_id", None),
                    metadatos={"motivo": "contrasena_actual_incorrecta"},
                )
            raise HTTPException(
                status_code=400, detail="La contrasena actual es incorrecta"
            )
        resultado = await ServicioAuth.cambiar_contrasena(
            db, usuario.id, datos.nueva_contrasena
        )
        async with AsyncSessionLocal() as audit_db:
            await ServicioAuditoria.registrar(
                audit_db,
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre,
                rol=usuario.rol,
                modulo="auth",
                accion=AccionAuditoria.ACTUALIZAR,
                entidad_tipo="usuario",
                entidad_id=usuario.id,
                metodo_http="PATCH",
                ruta="/api/v2/auth/password",
                direccion_ip=request.client.host if request.client else None,
                agente_usuario=request.headers.get("user-agent"),
                correlacion_id=getattr(request.state, "correlacion_id", None),
                metadatos={"campo": "contrasena"},
            )
        return resultado
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.error("Error al cambiar contrasena")
        raise HTTPException(status_code=500, detail="Error al cambiar contrasena")


@router.patch("/update-email", response_model=UsuarioPublico)
async def actualizar_correo(
    datos: EmailActualizar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza el correo corporativo en el sistema y en el ERP"""
    usuario = (
        await db.execute(
            select(Usuario).where(Usuario.id == usuario.id).with_for_update()
        )
    ).scalars().one()
    if not usuario.esta_activo:
        raise HTTPException(status_code=403, detail="Cuenta desactivada")

    # 1. Validar formato de correo (básico)
    if "@" not in datos.correo or "." not in datos.correo:
        raise HTTPException(status_code=400, detail="Formato de correo inválido")

    # 2. Actualizar en ERP (Solid) - Requiere conexión ERP
    exito_erp = False
    try:
        from app.database import SessionErp
        with SessionErp() as db_erp:
            exito_erp = await EmpleadosService.actualizar_correo_erp(
                db_erp, usuario.cedula, datos.correo
            )
    except Exception:
        logger.warning("Error conectando a ERP para actualizar correo")
        # No bloqueamos si el ERP falla, pero notificamos el error
        raise HTTPException(status_code=503, detail="No se pudo conectar con el ERP para actualizar el correo")

    if not exito_erp:
        raise HTTPException(status_code=500, detail="Error al actualizar el correo en el ERP")

    # 3. Actualizar localmente
    try:
        usuario.correo = datos.correo
        usuario.correo_actualizado = True
        usuario.correo_verificado = False  # Resetear verificacion al cambiar correo
        await db.execute(
            update(Token)
            .where(
                Token.usuario_id == usuario.id,
                Token.tipo_token == "password_recovery",
                Token.ultimo_uso_en.is_(None),
            )
            .values(ultimo_uso_en=get_bogota_now())
        )
        db.add(usuario)
        await db.commit()
        await db.refresh(usuario)
        
        # 4. Enviar correo de verificación (Trigger confirmación)
        try:
            from app.config import config
            token = ServicioAuth.crear_token_verificacion(usuario.id, usuario.correo)
            verify_url = f"{EmailService.get_frontend_url()}/verify-email?token={token}"
            
            sent = await EmailService.enviar_confirmacion_registro(usuario.correo, usuario.nombre, verify_url)
            if not sent:
                # No bloqueamos la actualización porque ya se hizo en el ERP, pero informamos el fallo de entrega
                raise HTTPException(
                    status_code=400,
                    detail="Correo actualizado en ERP, pero el servidor rechazó el envío de verificación. Por favor verifica tu dirección."
                )
        except HTTPException:
            raise
        except Exception:
            logger.warning("No se pudo enviar correo de verificacion")

        return usuario
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logger.error("Error al actualizar registro local")
        raise HTTPException(status_code=500, detail="Error al actualizar registro local")


@router.get("/verify-email")
async def confirmar_correo(
    token: str,
    db: AsyncSession = Depends(obtener_db)
):
    """Verifica el token de correo y marca el usuario como verificado"""
    try:
        usuario_id = ServicioAuth.validar_token_verificacion(token)
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Token de verificación inválido o expirado"
            )
        
        from sqlmodel import select
        result = await db.execute(
            select(Usuario).where(Usuario.id == usuario_id).with_for_update()
        )
        usuario = result.scalars().first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if ServicioAuth.validar_token_verificacion(token, usuario.correo) != usuario.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificación inválido o expirado",
            )
        
        if usuario.correo_verificado:
            return {"message": "El correo ya estaba verificado"}
            
        usuario.correo_verificado = True
        db.add(usuario)
        await db.commit()
        
        # Enviar notificación de éxito
        try:
            await EmailService.enviar_exito_verificacion(usuario.correo, usuario.nombre)
        except Exception:
            logger.warning("No se pudo enviar confirmacion de verificacion")
        
        return {"message": "Correo verificado exitosamente"}
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logger.error("Error inesperado durante la verificacion")
        raise HTTPException(status_code=500, detail="Error durante la verificacion")


@router.post("/resend-verification")
async def reenviar_verificacion(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Reenvía el correo de verificación al usuario actual"""
    usuario = (
        await db.execute(
            select(Usuario).where(Usuario.id == usuario.id).with_for_update()
        )
    ).scalars().one()
    if not usuario.correo or not usuario.correo_actualizado:
        raise HTTPException(status_code=400, detail="No hay un correo corporativo configurado")
    
    if usuario.correo_verificado:
        raise HTTPException(status_code=400, detail="El correo ya se encuentra verificado")
        
    try:
        from app.config import config
        token = ServicioAuth.crear_token_verificacion(usuario.id, usuario.correo)
        base_url = (config.hostveremail or config.frontend_url).rstrip("/")
        verify_url = f"{base_url}/verify-email?token={token}"
        
        sent = await EmailService.enviar_confirmacion_registro(usuario.correo, usuario.nombre, verify_url)
        if not sent:
            raise HTTPException(
                status_code=400, 
                detail="El servidor de correo rechazó la entrega. Verifica que la dirección sea correcta o intenta más tarde."
            )
        return {"message": "Correo de verificación reenviado"}
    except HTTPException:
        raise
    except Exception:
        logger.error("Error al enviar correo de verificacion")
        raise HTTPException(status_code=500, detail="Error al enviar el correo")
