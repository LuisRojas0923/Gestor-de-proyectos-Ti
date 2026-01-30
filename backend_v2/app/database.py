"""
Configuracion de Base de Datos - Backend V2 (Async + SQLModel)
"""
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlmodel import SQLModel
from .config import config

# URL de conexion ASINCRONA (asyncpg)
# El driver asyncpg requiere el prefijo postgresql+asyncpg://
ASYNC_DATABASE_URL = config.database_url.replace(
    "postgresql://", "postgresql+asyncpg://"
).split("?")[0]  # asyncpg no soporta client_encoding en query string

# URL de conexion SINCRONA (psycopg2) - para migraciones y scripts
SYNC_DATABASE_URL = config.database_url

# Engine ASINCRONO principal
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=40,          # Aumentado para soportar 2 workers y 400+ usuarios
    max_overflow=80,       # Permite hasta 120 conexiones simultáneas
    pool_timeout=60,       # Aumentado el tiempo de espera en cola
    pool_recycle=1800
)

# SessionMaker ASINCRONO
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Engine SINCRONO para compatibilidad (migraciones, seed, etc.)
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"options": "-c client_encoding=utf8"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

# Base para modelos (compatibilidad con SQLAlchemy puro)
Base = declarative_base()

# Alias para compatibilidad
engine = sync_engine

# --- Configuracion ERP Externo (se mantiene sincrono) ---
ERP_DATABASE_URL = config.erp_database_url
erp_engine = create_engine(
    ERP_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)
SessionErp = sessionmaker(autocommit=False, autoflush=False, bind=erp_engine)


async def obtener_db():
    """Generador de sesion ASINCRONA para inyeccion de dependencias"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def obtener_db_sync():
    """Generador de sesion SINCRONA para scripts y migraciones"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def obtener_erp_db():
    """Generador de sesion para la base de datos del ERP (sincrono)"""
    db = SessionErp()
    try:
        yield db
    finally:
        db.close()


async def init_db():
    """Inicializa las tablas de la base de datos usando SQLModel y asegura columnas de perfil"""
    async with async_engine.begin() as conn:
        # 1. Crear tablas si no existen
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # 2. Asegurar columnas de perfil (Migración manual segura)
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS area VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sede VARCHAR(255)"))
        except Exception as e:
            print(f"DEBUG: Error al asegurar columnas de perfil: {e}")
