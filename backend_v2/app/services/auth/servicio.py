"""
Servicio de Autenticacion - Backend V2 (Async + SQLModel)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.config import config
from app.core.config import obtener_configuracion
from app.models.auth.usuario import Usuario, PermisoRol
from app.services.erp import EmpleadosService
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
    def crear_token_acceso(datos: dict, tiempo_expiracion: Optional[timedelta] = None):
        a_codificar = datos.copy()
        if tiempo_expiracion:
            expira = datetime.now(timezone.utc) + tiempo_expiracion
        else:
            expira = datetime.now(timezone.utc) + timedelta(
                minutes=config.jwt_token_expire_minutes
            )

        a_codificar.update({"exp": expira})
        token_jwt = jwt.encode(
            a_codificar, config.jwt_secret_key, algorithm=config.algorithm
        )
        return token_jwt

    @staticmethod
    def crear_token_verificacion(usuario_id: str) -> str:
        """Genera un token JWT para verificacion de correo (Scope: verify_email)"""
        expira = datetime.now(timezone.utc) + timedelta(hours=24)
        a_codificar = {"sub": usuario_id, "exp": expira, "scope": "verify_email"}
        return jwt.encode(
            a_codificar, config.jwt_secret_key, algorithm=config.algorithm
        )

    @staticmethod
    def crear_token_recuperacion(usuario_id: str) -> str:
        """Genera un token JWT para recuperación de contraseña (Scope: password_recovery)"""
        expira = datetime.now(timezone.utc) + timedelta(hours=1)
        a_codificar = {"sub": usuario_id, "exp": expira, "scope": "password_recovery"}
        return jwt.encode(
            a_codificar, config.jwt_secret_key, algorithm=config.algorithm
        )

    @staticmethod
    def validar_token_recuperacion(token: str) -> Optional[str]:
        """Valida un token de recuperación y retorna el usuario_id si es válido"""
        try:
            payload = jwt.decode(
                token, config.jwt_secret_key, algorithms=[config.algorithm]
            )
            if payload.get("scope") != "password_recovery":
                return None
            return payload.get("sub")
        except Exception:
            return None

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
            usuario.hash_contrasena = ServicioAuth.obtener_hash_contrasena(portal_pending)
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

        usuario.hash_contrasena = ServicioAuth.obtener_hash_contrasena(nueva_contrasena)
        await db.commit()
        await db.refresh(usuario)
        return usuario

    @staticmethod
    async def sincronizar_perfil_desde_erp(
        db: AsyncSession, db_erp, usuario: Usuario
    ) -> Usuario:
        """Sincroniza los datos de perfil de un usuario existente con Solid ERP."""
        datos_erp = await EmpleadosService.obtener_empleado_por_cedula(
            db_erp, usuario.cedula
        )

        if datos_erp:
            usuario.area = (
                datos_erp.get("area").strip() if datos_erp.get("area") else None
            )
            usuario.cargo = (
                datos_erp.get("cargo").strip() if datos_erp.get("cargo") else None
            )
            usuario.sede = (
                datos_erp.get("ciudadcontratacion").strip()
                if datos_erp.get("ciudadcontratacion")
                else None
            )
            usuario.centrocosto = (
                datos_erp.get("centrocosto").strip()
                if datos_erp.get("centrocosto")
                else None
            )
            usuario.nombre = (
                datos_erp.get("nombre").strip()
                if datos_erp.get("nombre")
                else usuario.nombre
            )
            val_viaticante = datos_erp.get("viaticante")
            usuario.viaticante = (
                bool(val_viaticante) if val_viaticante is not None else False
            )
            usuario.baseviaticos = datos_erp.get("baseviaticos")
            
            # Sincronización de correo corporativo
            if datos_erp.get("correocorporativo"):
                usuario.correo = datos_erp.get("correocorporativo").strip()
            
            await db.commit()
            await db.refresh(usuario)
        return usuario

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
    registrar_sesion = staticmethod(registrar_sesion)
    marcar_fin_sesion = staticmethod(marcar_fin_sesion)
    invalidar_sesiones_usuario = staticmethod(invalidar_sesiones_usuario)
