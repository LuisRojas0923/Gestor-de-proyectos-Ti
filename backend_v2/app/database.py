"""
Configuracion de Base de Datos - Backend V2 (Async + SQLModel)
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url
from threading import Lock
from .config import config

# URL de conexion ASINCRONA (asyncpg)
ASYNC_DATABASE_URL = config.database_url.replace(
    "postgresql://", "postgresql+asyncpg://"
).split("?")[0]

# URL de conexion SINCRONA (psycopg2) - para migraciones y scripts
SYNC_DATABASE_URL = config.database_url.replace("postgresql+asyncpg://", "postgresql://")

# Engine ASINCRONO principal
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=40,
    max_overflow=80,
    pool_timeout=60,
    pool_recycle=1800,
    connect_args={
        "server_settings": {
            "client_encoding": "utf8"
        }
    },
)

# SessionMaker ASINCRONO
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Engine SINCRONO para compatibilidad (migraciones, seed, etc.)
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"options": "-c client_encoding=utf8"},
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
    pool_size=10,
    max_overflow=20,
    connect_args={"options": "-c client_encoding=utf8 -c statement_timeout=30000"},
)
SessionErp = sessionmaker(autocommit=False, autoflush=False, bind=erp_engine)

_erp_read_lock = Lock()
_erp_read_engine = None
_erp_read_sessionmaker = None


def _resolver_url_erp_lectura() -> str:
    """Valida la fuente antes de crear cualquier conexion ERP de lectura."""
    url = (config.erp_read_database_url or "").strip()
    esperada = (config.erp_read_expected_database or "").strip()
    entorno = (config.environment or "").strip().lower()
    pruebas = {"development", "desarrollo", "pruebas3", "test", "tests"}
    produccion = {"production", "produccion"}
    if not url:
        raise RuntimeError("ERP_READ_DATABASE_URL es obligatoria")
    if entorno in pruebas:
        permitida = "solidpruebas3"
        esperada = esperada or permitida
    elif entorno in produccion:
        permitida = "solid"
    else:
        raise RuntimeError("La fuente ERP de lectura no esta autorizada")
    try:
        nombre_url = make_url(url).database
    except Exception as exc:
        raise RuntimeError("La fuente ERP de lectura no esta autorizada") from exc
    if not url or esperada != permitida or nombre_url != permitida:
        raise RuntimeError("La fuente ERP de lectura no esta autorizada")
    return url


def obtener_sessionmaker_erp_lectura():
    """Crea lazy el engine para que una mala fuente no impida iniciar el portal."""
    global _erp_read_engine, _erp_read_sessionmaker
    if _erp_read_sessionmaker is not None:
        return _erp_read_sessionmaker
    with _erp_read_lock:
        if _erp_read_sessionmaker is None:
            url = _resolver_url_erp_lectura()
            _erp_read_engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=5,
                pool_timeout=2,
                connect_args={
                    "connect_timeout": 3,
                    "options": "-c client_encoding=utf8",
                },
            )
            _erp_read_sessionmaker = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=_erp_read_engine,
            )
    return _erp_read_sessionmaker


def SessionErpLectura():
    """Devuelve una sesion nueva; el caller conserva ownership y cierre."""
    return obtener_sessionmaker_erp_lectura()()


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


def obtener_erp_db_opcional():
    """Generador de sesión ERP opcional. Solo captura errores de conexión inicial."""
    db = None
    try:
        db = SessionErp()
    except Exception as e:
        import logging
        # Error específico de conexión inicial
        logging.warning(f"ERP_CONNECTION_ERROR: No se pudo establecer conexión inicial con ERP: {e}")
        yield None
        return

    try:
        # El error en el consumidor (router) ahora burbujeará correctamente
        # permitiendo que FastAPI maneje el error de validación o lógica
        yield db
    finally:
        if db:
            db.close()


async def init_db():
    """
    Punto de entrada para la inicialización de la base de datos.
    Delega la responsabilidad al modulo de migraciones core.
    """
    from app.core.migrations.manager import init_db_process
    await init_db_process(async_engine, AsyncSessionLocal)
