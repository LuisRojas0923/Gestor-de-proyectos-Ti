"""
Servicio de Autenticacion - Backend V2 (Async + SQLModel)
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.config import config
from app.core.config import obtener_configuracion
from app.services.auth.protected_identity_service import (
    actualizar_hash_protegido,
    actualizar_hash_si_vigente,
)
from app.services.auth.recovery_token_service import (
    crear_token_recuperacion,
    validar_token_recuperacion,
)
from app.models.auth.usuario import Usuario, PermisoRol
from app.services.auth.sincronizacion_perfiles_service import (
    sincronizar_usuario_desde_erp,
)
from .sesion_service import (
    registrar_sesion,
    marcar_fin_sesion,
    invalidar_sesiones_usuario,
)
from .provisioning_service import (
    crear_analista_desde_erp,
    crear_usuario_portal_desde_erp,
    registrar_usuario_portal,
)


from fastapi.security import OAuth2PasswordBearer


def normalizar_cedula(s: Optional[str]) -> str:
    """Normaliza una cédula para comparaciones: strip + lower.

    Las cédulas se almacenan en minúsculas en BD. Esta función se usa en
    todos los puntos de entrada (login, setup-password, registro) para
    evitar inconsistencias de case y whitespace que pueden crear cuentas
    duplicadas o romper el rate limit por usuario.
    """
    if s is None:
        return ""
    return s.strip().lower()


def extraer_cedula_desde_identificador(identificador: str) -> str:
    """Deriva la cédula desde cédula plana, USR-{cedula} o USR-P-{cedula}."""
    valor = (identificador or "").strip()
    if valor.startswith("USR-P-"):
        return valor[6:]
    if valor.startswith("USR-"):
        return valor[4:]
    return valor


def ids_creador_ticket_equivalentes(
    identificador: str, usuario: Optional["Usuario"] = None
) -> list[str]:
    """IDs históricos posibles de creador_id en tickets para un mismo usuario."""
    valor = (identificador or "").strip()
    cedula = extraer_cedula_desde_identificador(valor)
    ids = {valor, cedula, f"USR-{cedula}", f"USR-P-{cedula}"}
    if usuario:
        ids.add(usuario.id)
        ids.add(usuario.cedula)
        ids.add(f"USR-{usuario.cedula}")
        ids.add(f"USR-P-{usuario.cedula}")
    return sorted(ids)


def id_creador_ticket_canonico(usuario: "Usuario") -> str:
    """Formato canónico al persistir creador_id en tickets nuevos."""
    return f"USR-P-{usuario.cedula}"


def enmascarar_pii(texto: Optional[str]) -> str:
    """Enmascara PII (correos, contraseñas) en mensajes de log para evitar filtraciones."""
    if not texto:
        return ""
    import re
    texto = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[EMAIL]", texto)
    texto = re.sub(r"(?i)(password|contraseña|contrasena)\s*[=:]\s*\S+", r"\1=[REDACTED]", texto)
    return texto


class ServicioAuth:
    """Clase principal para logica de autenticacion (Async)"""

    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v2/auth/login")
    oauth2_scheme_opcional = OAuth2PasswordBearer(tokenUrl="api/v2/auth/login", auto_error=False)

    @staticmethod
    def _es_hash_bcrypt_valido(hash_contrasena: str) -> bool:
        """Verifica si el string tiene formato de hash bcrypt válido ($2b$, $2a$ o $2y$)."""
        try:
            if not hash_contrasena or len(hash_contrasena) < 20:
                return False
            return hash_contrasena.startswith(("$2b$", "$2a$", "$2y$"))
        except (ValueError, TypeError, AttributeError):
            return False

    @staticmethod
    def es_password_configurado(hash_contrasena: str, cedula: Optional[str] = None) -> bool:
        """
        Verifica si el usuario ya cambió su contraseña inicial.
        No se considera configurada si:
          - El hash no es bcrypt válido (texto plano)
          - Coincide con la clave genérica del portal
          - Coincide con su cédula
        """
        if not ServicioAuth._es_hash_bcrypt_valido(hash_contrasena):
            return False

        portal_pending = obtener_configuracion().portal_pending_pwd or config.portal_pending_pwd
        if portal_pending and ServicioAuth.verificar_contrasena(portal_pending, hash_contrasena):
            return False

        if cedula and ServicioAuth.verificar_contrasena(cedula, hash_contrasena):
            return False

        return True

    @staticmethod
    def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
        """Verifica si la contrasena plana coincide con el hash."""
        try:
            if not contrasena_hasheada or not contrasena_plana:
                return False
            return bcrypt.checkpw(
                contrasena_plana.encode("utf-8"), contrasena_hasheada.encode("utf-8")
            )
        except (ValueError, TypeError):
            # Captura 'Invalid salt' y otros errores de formato de hash
            return False

    @staticmethod
    def obtener_hash_contrasena(contrasena: str) -> str:
        """Genera un hash bcrypt para la contrasena dada."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(contrasena.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def crear_token_acceso(
        datos: dict,
        tiempo_expiracion: Optional[timedelta] = None,
        tipo_token: str = "session",
        jti: Optional[str] = None,
        last_ip: Optional[str] = None,
    ):
        """Crea un JWT firmado. Acepta `tipo_token` ('session' | 'mcp') para
        distinguir tokens web de tokens MCP (ver docs/PLAN_SERVIDOR_MCP.md).

        Si se pasa `jti`, se usa ese (necesario para tokens MCP donde el jti
        del JWT debe coincidir con el jti guardado en la tabla `sesiones`
        para validar revocacion). Si no, se genera uno nuevo.

        Si se pasa `last_ip`, se estampa como claim `last_ip` (la IP real
        de la conexion TCP del login, no el claim X-Forwarded-For). Esto
        permite al rate limiter validar que la IP de la peticion actual
        no haya sido manipulada respecto al login. Tokens en vuelo antes
        de este cambio no tienen `last_ip`; el key func lo trata como
        ausente (cae al path de first-login: ignora XFF, usa connection IP).

        Backwards compatible: tokens emitidos antes de este cambio no tenian
        `jti` ni `token_type`, y el codigo de validacion los trata como
        `token_type="session"` por default.
        """
        a_codificar = datos.copy()
        if tiempo_expiracion:
            expira = datetime.now(timezone.utc) + tiempo_expiracion
        else:
            expira = datetime.now(timezone.utc) + timedelta(
                minutes=config.jwt_token_expire_minutes
            )

        a_codificar.update({
            "exp": expira,
            "jti": jti or str(uuid.uuid4()),
            "token_type": tipo_token,
        })
        if last_ip:
            a_codificar["last_ip"] = last_ip
        token_jwt = jwt.encode(
            a_codificar, config.jwt_secret_key, algorithm=config.algorithm
        )
        return token_jwt

    @staticmethod
    def obtener_payload_token(token: str) -> Optional[dict]:
        """Decodifica un JWT y retorna el payload completo (incluyendo jti,
        token_type, scope, exp). Retorna None si la firma es invalida o
        el token esta expirado.

        Usado por el anti-orfandad en /auth/mcp-token y por la validacion
        de jti en profile_router.obtener_usuario_actual_db.
        """
        try:
            return jwt.decode(
                token, config.jwt_secret_key, algorithms=[config.algorithm]
            )
        except Exception:
            return None

    @staticmethod
    def crear_token_verificacion(usuario_id: str) -> str:
        """Genera un token JWT para verificacion de correo (Scope: verify_email)"""
        expira = datetime.now(timezone.utc) + timedelta(hours=24)
        a_codificar = {"sub": usuario_id, "exp": expira, "scope": "verify_email"}
        return jwt.encode(
            a_codificar, config.jwt_secret_key, algorithm=config.algorithm
        )

    @staticmethod
    def validar_token_verificacion(token: str) -> Optional[str]:
        """Valida un token de verificación de correo y retorna el usuario_id si es válido"""
        try:
            payload = jwt.decode(
                token, config.jwt_secret_key, algorithms=[config.algorithm]
            )
            if payload.get("scope") != "verify_email":
                return None
            return payload.get("sub")
        except Exception:
            return None

    @staticmethod
    def obtener_cedula_desde_token(token: str) -> Optional[str]:
        """Decodifica el token y extrae la cedula (sub)."""
        try:
            payload = jwt.decode(
                token, config.jwt_secret_key, algorithms=[config.algorithm]
            )
            cedula: str = payload.get("sub")
            if cedula is None:
                return None
            return cedula
        except Exception:
            return None

    @staticmethod
    async def obtener_usuario_por_cedula(
        db: AsyncSession, cedula: str
    ) -> Optional[Usuario]:
        """Obtiene un usuario por cedula (Async)."""
        result = await db.execute(select(Usuario).where(Usuario.cedula == cedula))
        return result.scalars().first()

    @staticmethod
    async def reparar_hash_invalido(db: AsyncSession, usuario: Usuario) -> bool:
        """
        Detecta si el hash actual es inválido (ej: 'N/A') y lo repara con el hash temporal.
        Retorna True si hubo reparación.
        """
        es_invalido = False
        
        # 1. Detección por valor explícito heredado
        if usuario.hash_contrasena in ["N/A", "", "NULL", "PENDIENTE"]:
            es_invalido = True
        
        # 2. Detección por validación de bcrypt (si no se detectó antes)
        if not es_invalido:
            try:
                # Intentamos una verificación dummy para ver si el salt es válido
                bcrypt.checkpw(b"test", usuario.hash_contrasena.encode("utf-8"))
            except (ValueError, TypeError):
                es_invalido = True
        
        if es_invalido:
            import logging
            logging.info(f"REPARACIÓN: Corrigiendo hash inválido para usuario {usuario.cedula}")
            portal_pending = obtener_configuracion().portal_pending_pwd or config.portal_pending_pwd
            await actualizar_hash_protegido(
                db,
                usuario.id,
                ServicioAuth.obtener_hash_contrasena(portal_pending),
            )
            await db.commit()
            await db.refresh(usuario)
            return True
            
        return False

    @staticmethod
    async def cambiar_contrasena(
        db: AsyncSession, usuario_id: str, nueva_contrasena: str
    ) -> Usuario:
        """Cambia la contrasena de un usuario (Async)."""
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalars().first()
        if not usuario:
            raise ValueError("Usuario no encontrado")

        try:
            await actualizar_hash_protegido(
                db,
                usuario.id,
                ServicioAuth.obtener_hash_contrasena(nueva_contrasena),
            )
            await invalidar_sesiones_usuario(db, usuario.id)
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        await db.refresh(usuario)
        return usuario

    @staticmethod
    async def cambiar_contrasena_si_vigente(
        db: AsyncSession,
        usuario_id: str,
        hash_esperado: str,
        nueva_contrasena: str,
    ) -> None:
        """Consume un token de recuperación mediante CAS sobre el hash vigente."""
        try:
            actualizado = await actualizar_hash_si_vigente(
                db,
                usuario_id,
                hash_esperado,
                ServicioAuth.obtener_hash_contrasena(nueva_contrasena),
            )
            if not actualizado:
                raise ValueError("Token de recuperación inválido o expirado.")
            await invalidar_sesiones_usuario(db, usuario_id)
            await db.commit()
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def obtener_permisos_por_rol(db: AsyncSession, rol: str) -> list[str]:
        """Obtiene la lista de módulos permitidos para un rol que estén activos globalmente."""
        from app.models.auth.usuario import ModuloSistema

        # Unimos PermisoRol con ModuloSistema para filtrar por su estado global 'esta_activo'
        result = await db.execute(
            select(PermisoRol.modulo)
            .join(ModuloSistema, PermisoRol.modulo == ModuloSistema.id)
            .where(
                PermisoRol.rol == rol,  # FILTRO CRÍTICO: Solo permisos del rol solicitado
                PermisoRol.permitido,
                ModuloSistema.esta_activo,  # REFUERZO: El módulo debe estar activo globalmente
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def tiene_acceso_panel_admin(db: AsyncSession, usuario) -> bool:
        """
        Verifica si el usuario tiene acceso a módulos del Panel Maestro.

        Implementa el RBAC dinámico: consulta PermisoRol JOIN ModuloSistema
        WHERE categoria = 'panel'. No usa whitelist hardcodeada.

        Esto permite que un admin revoque el acceso de un rol desde la UI
        de permisos y surta efecto inmediato en el endpoint /verify-admin.

        Args:
            db: Sesión async de SQLAlchemy.
            usuario: Instancia de Usuario con atributo .rol.

        Returns:
            True si el rol del usuario tiene al menos un permiso activo
            en categoría 'panel'. False en caso contrario.
        """
        from app.models.auth.usuario import ModuloSistema

        stmt = (
            select(PermisoRol.rol)
            .join(ModuloSistema, ModuloSistema.id == PermisoRol.modulo)
            .where(
                PermisoRol.rol == usuario.rol,
                PermisoRol.permitido == True,  # noqa: E712
                ModuloSistema.categoria == "panel",
                ModuloSistema.esta_activo == True,  # noqa: E712
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def registrar_verificacion_panel(
        db: AsyncSession,
        usuario_id: str,
        rol: str,
        exitosa: bool,
        motivo: str,
        direccion_ip: Optional[str] = None,
        agente_usuario: Optional[str] = None,
    ) -> None:
        """
        Registra un evento de auditoría para /verify-admin.

        El log nunca almacena la contraseña (ni en claro ni hasheada).
        Si la inserción falla, NO bloquea el flujo de auth (try/except interno).

        Args:
            db: Sesión async de SQLAlchemy.
            usuario_id: ID del usuario que intentó verificar.
            rol: Rol del usuario.
            exitosa: True si la verificación fue exitosa.
            motivo: Texto corto: 'exito', 'fallo_contrasena', 'fallo_sin_permiso',
                    'rate_limit_excedido', 'token_invalido', etc.
            direccion_ip: IP del cliente (opcional).
            agente_usuario: User-Agent (opcional).
        """
        try:
            from app.models.auth.auditoria_evento import AuditoriaEvento
            from sqlalchemy import insert

            stmt = insert(AuditoriaEvento).values(
                usuario_id=usuario_id,
                rol=rol,
                direccion_ip=direccion_ip,
                agente_usuario=agente_usuario,
                resultado="exito" if exitosa else "fallo",
                motivo=motivo,
            )
            await db.execute(stmt)
            await db.commit()
        except Exception as e:
            # El audit log NUNCA debe tumbar el flujo de auth.
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error registrando auditoria verify-admin: {e}")
            try:
                await db.rollback()
            except Exception:
                pass

    # ── Métodos delegados a módulos extraídos ──
    crear_analista_desde_erp = staticmethod(crear_analista_desde_erp)
    crear_usuario_portal_desde_erp = staticmethod(crear_usuario_portal_desde_erp)
    registrar_usuario_portal = staticmethod(registrar_usuario_portal)
    sincronizar_perfil_desde_erp = staticmethod(sincronizar_usuario_desde_erp)
    registrar_sesion = staticmethod(registrar_sesion)
    marcar_fin_sesion = staticmethod(marcar_fin_sesion)
    invalidar_sesiones_usuario = staticmethod(invalidar_sesiones_usuario)
    crear_token_recuperacion = staticmethod(crear_token_recuperacion)
    validar_token_recuperacion = staticmethod(validar_token_recuperacion)
