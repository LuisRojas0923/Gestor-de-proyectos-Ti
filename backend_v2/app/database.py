"""
Configuracion de Base de Datos - Backend V2
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import config

# URL de conexion
SQLALCHEMY_DATABASE_URL = config.database_url

# Engine de SQLAlchemy con encoding forzado para evitar problemas en Windows
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"options": "-c client_encoding=utf8"}
)

# Sesion de base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()


def obtener_db():
    """Generador de sesion de base de datos para inyeccion de dependencias"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
