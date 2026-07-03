import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class EngineSettings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    deepface_model: str = "Facenet"
    deepface_detector: str = "opencv"
    anti_spoofing: bool = True
    biometria_engine_token: str = ""
    environment: str = "development"
    max_image_bytes: int = 6 * 1024 * 1024

    @property
    def es_entorno_local(self) -> bool:
        return self.environment.lower() in {"development", "desarrollo", "local", "test", "tests"}

    def validar_token_inicio(self) -> None:
        token = self.biometria_engine_token.strip()
        if not token and self.es_entorno_local:
            return
        if not token or token.lower() in {"changeme", "placeholder", "secret", "token"}:
            raise RuntimeError("BIOMETRIA_ENGINE_TOKEN debe ser fuerte y no vacio fuera de local")


@lru_cache
def obtener_settings() -> EngineSettings:
    settings = EngineSettings()
    if not settings.environment:
        settings.environment = os.getenv("ENTORNO", "development")
    return settings
