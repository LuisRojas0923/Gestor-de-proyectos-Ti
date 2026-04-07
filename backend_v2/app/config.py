"""
Configuracion de la aplicacion Backend V2
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Configuracion(BaseSettings):
    """Configuracion cargada desde variables de entorno"""
    
    # Base de datos
    database_url: str = "postgresql://user:pass@localhost:5432/project_manager" # [CONTROLADO]
    
    # ERP Externo
    erp_database_url: str = "postgresql://user:pass@localhost:5432/erp_db" # [CONTROLADO]
    sync_external_url: str = "http://localhost:8099/sync"
    
    # Seguridad JWT
    jwt_secret_key: str = "clave-segura-cambiar" # [CONTROLADO]
    algorithm: str = "HS256"
    jwt_token_expire_minutes: int = 30 # [CONTROLADO]
    
    # Ambiente
    environment: str = "development"
    
    # CORS
    frontend_url: str = "http://localhost:5173"
    
    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def obtener_configuracion() -> Configuracion:
    """Obtiene la configuracion cacheada"""
    return Configuracion()


config = obtener_configuracion()
