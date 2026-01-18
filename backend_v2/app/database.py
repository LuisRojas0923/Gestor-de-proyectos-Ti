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

# --- Configuración ERP Externo ---
ERP_DATABASE_URL = config.erp_database_url
erp_engine = create_engine(
    ERP_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)
SessionErp = sessionmaker(autocommit=False, autoflush=False, bind=erp_engine)


def obtener_db():
    """Generador de sesion de base de datos para inyeccion de dependencias"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def obtener_erp_db():
    """Generador de sesion para la base de datos del ERP"""
    db = SessionErp()
    try:
        yield db
    finally:
        db.close()
