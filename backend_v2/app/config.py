"""
Configuracion de la aplicacion Backend V2
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Configuracion(BaseSettings):
    """Configuracion cargada desde variables de entorno"""
    
    # Base de datos
    database_url: str = "postgresql://user:password@localhost:5432/project_manager"
    
    # Seguridad JWT
    secret_key: str = "clave-secreta-cambiar-en-produccion"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Ambiente
    environment: str = "development"
    
    # CORS
    frontend_url: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def obtener_configuracion() -> Configuracion:
    """Obtiene la configuracion cacheada"""
    return Configuracion()


config = obtener_configuracion()
