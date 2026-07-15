"""
Configuración central del backend mediante variables de entorno.

Usa pydantic-settings para validar y tipar las variables.
Si una variable requerida no está definida, se usa el valor por defecto
o se lanza un error en producción.
"""
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración global del backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    entorno: Literal["desarrollo", "produccion", "tests"] = "desarrollo"

    verify_admin_rate_limit: str = "5/5minute"

    auditoria_evento_limpiar_dias: int = 365

    base_datos_url_async: str = ""

    jwt_secreto: str = "cambiar-en-produccion"
    jwt_expiracion_minutos: int = 60
    jwt_algoritmo: str = "HS256"

    cors_origenes_permitidos: str = "*"

    # Auth: contraseña temporal del portal para usuarios JIT.
    # En producción NO puede estar vacía ni ser el literal "PORTAL_PENDING_PWD".
    portal_pending_pwd: str = ""

    # Auth: flag para que el JIT auto-apruebe (esta_activo=True) usuarios nuevos.
    # Default False en prod (cumple política de aprobación).
    # True solo en desarrollo. Cambiar en runtime vía env sin redeploy.
    jit_auto_aprobar: bool = False

    # Rate limiting (SlowAPI). Redis-backed para compartir bucket entre workers.
    redis_url: str = "redis://localhost:6379/0"

    # IPs (separadas por coma) de proxies en los que se confía el header
    # X-Forwarded-For. Vacío = no se confía en ningún proxy (cae al IP de
    # la conexión TCP real). "*" está prohibido por seguridad.
    trusted_proxy_ips: str = ""

    # Límites por endpoint. Documentados en docs/GUIA_DESARROLLO.md.
    rate_limit_login: str = "5/minute;20/hour"
    rate_limit_setup_password: str = "30/hour"
    rate_limit_forgot_password: str = "3/hour"
    rate_limit_reset_password: str = "5/hour"
    rate_limit_registro: str = "5/hour"
    rate_limit_password_status: str = "5/minute"
    rate_limit_logout: str = "10/minute"
    rate_limit_mcp_token: str = "5/hour"
    rate_limit_mcp_tokens_list: str = "30/minute"
    rate_limit_mcp_tokens_revoke: str = "10/minute"
    # /auth/refresh: el usuario ya esta autenticado, pero limitamos por IP
    # para evitar que un atacante con un token robado haga refresh infinito.
    rate_limit_refresh: str = "20/hour"

    # Lockout por cuenta: tras N fallos de login consecutivos en una ventana
    # corta, se bloquea el acceso a esa cuenta (no por IP) durante
    # `lockout_duracion_minutos`. Defense-in-depth sobre el rate limit por IP.
    lockout_umbral_fallos: int = 10
    lockout_ventana_minutos: int = 15
    lockout_duracion_minutos: int = 15

    @field_validator("portal_pending_pwd")
    @classmethod
    def _validar_portal_pending_pwd(cls, v: str) -> str:
        if v and v == "PORTAL_PENDING_PWD":
            raise ValueError(
                "portal_pending_pwd no puede ser el literal 'PORTAL_PENDING_PWD'. "
                "Define un valor seguro en el .env o déjalo vacío para desarrollo."
            )
        return v

    @field_validator("jit_auto_aprobar", mode="before")
    @classmethod
    def _coercion_jit_flag(cls, v):
        if isinstance(v, str):
            return v.strip().lower() in ("1", "true", "yes", "on")
        return bool(v)

    @field_validator("trusted_proxy_ips")
    @classmethod
    def _rechazar_trusted_proxy_wildcard(cls, v: str) -> str:
        # "*" en una allowlist es un footgun clásico: si alguien lo pone
        # "para que funcione", toda IP queda autorizada a inyectar
        # X-Forwarded-For y se anula el rate limit por IP.
        if v and v.strip() == "*":
            raise ValueError(
                "trusted_proxy_ips no puede ser '*'. "
                "Lista las IPs de tus proxies separadas por coma en .env (ver .env.example)."
            )
        return v

    @property
    def es_produccion(self) -> bool:
        return self.entorno == "produccion"

    @property
    def cors_origenes_lista(self) -> list[str]:
        if self.cors_origenes_permitidos == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origenes_permitidos.split(",") if o.strip()]

    @property
    def trusted_proxy_ips_set(self) -> set[str]:
        return {ip.strip() for ip in self.trusted_proxy_ips.split(",") if ip.strip()}


@lru_cache(maxsize=1)
def obtener_configuracion() -> Settings:
    """Retorna la instancia singleton de Settings."""
    return Settings()
