"""
Configuracion de la aplicacion Backend V2
"""

from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Configuracion(BaseSettings):
    """Configuracion cargada desde variables de entorno"""

    # Base de datos (Campos individuales para autoconstrucción)
    db_user: str = "user"
    db_pass: str = "password"
    db_host: str = "localhost"
    db_port: str = "5432"
    db_name: str = "project_manager"
    database_url: Optional[str] = None

    def __init__(self, **values):
        super().__init__(**values)
        if not self.database_url:
            self.database_url = f"postgresql+asyncpg://{self.db_user}:{self.db_pass}@{self.db_host}:{self.db_port}/{self.db_name}"
        # Aseguramos que use asyncpg
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # ERP Externo
    erp_database_url: str = (
        "postgresql://user:pass@localhost:5432/erp_db"  # [CONTROLADO]
    )
    sync_external_url: str = "http://localhost:8099/sync"

    # Seguridad JWT
    jwt_secret_key: str = "clave-segura-cambiar"  # [CONTROLADO]
    algorithm: str = "HS256"
    jwt_token_expire_minutes: int = 30  # [CONTROLADO]

    # Ambiente
    environment: str = "development"

    # CORS y Links de Verificación
    frontend_url: str = "http://localhost:5173"
    hostveremail: Optional[str] = None  # Si es None, se usará frontend_url

    # Almacenamiento Local
    storage_path: str = "/app/storage/attachments"
    storage_max_size_mb: int = 25  # Límite por archivo

    # Notificaciones Email (Opcional)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    smtp_from: Optional[str] = None
    smtp_use_ssl: bool = True

    class Config:
        # Buscamos el .env en la raíz del proyecto (un nivel arriba de backend_v2)
        # o en la carpeta actual de ejecución.
        env_file = (".env", "../.env", "../../.env")
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def obtener_configuracion() -> Configuracion:
    """Obtiene la configuracion cacheada"""
    return Configuracion()


config = obtener_configuracion()
