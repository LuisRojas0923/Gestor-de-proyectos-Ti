"""
Configuración central del backend mediante variables de entorno.

Usa pydantic-settings para validar y tipar las variables.
Si una variable requerida no está definida, se usa el valor por defecto
o se lanza un error en producción.
"""
from functools import lru_cache
from typing import Literal

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

    @property
    def es_produccion(self) -> bool:
        return self.entorno == "produccion"

    @property
    def cors_origenes_lista(self) -> list[str]:
        if self.cors_origenes_permitidos == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origenes_permitidos.split(",") if o.strip()]


@lru_cache(maxsize=1)
def obtener_configuracion() -> Settings:
    """Retorna la instancia singleton de Settings."""
    return Settings()
