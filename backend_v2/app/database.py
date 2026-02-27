"""
Configuracion de Base de Datos - Backend V2 (Async + SQLModel)
"""

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
    pool_size=40,  # Aumentado para soportar 2 workers y 400+ usuarios
    max_overflow=80,  # Permite hasta 120 conexiones simultáneas
    pool_timeout=60,  # Aumentado el tiempo de espera en cola
    pool_recycle=1800,
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
    ERP_DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10
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


def obtener_erp_db_opcional():
    """Sesion ERP opcional: si la conexion falla, devuelve None (evita 500 en login)."""
    try:
        db = SessionErp()
        try:
            yield db
        finally:
            db.close()
    except Exception as e:
        print(f"DEBUG: ERP no disponible: {e}")
        yield None


async def init_db():
    """Inicializa las tablas de la base de datos usando SQLModel y asegura columnas de perfil"""
    async with async_engine.begin() as conn:
        # 1. Crear tablas si no existen
        await conn.run_sync(SQLModel.metadata.create_all)

        # 2. Asegurar columnas de perfil (Migración manual segura)
        from sqlalchemy import text

        try:
            await conn.execute(
                text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS area VARCHAR(255)")
            )
            await conn.execute(
                text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(255)")
            )
            await conn.execute(
                text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sede VARCHAR(255)")
            )
            await conn.execute(
                text(
                    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS centrocosto VARCHAR(255)"
                )
            )

            # Columnas de auditoría para reservas
            await conn.execute(
                text(
                    "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS updated_by_name VARCHAR(255)"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS updated_by_document VARCHAR(100)"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_by_name VARCHAR(255)"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_by_document VARCHAR(100)"
                )
            )

            # Torre de Control: Actividad de sesiones
            await conn.execute(
                text(
                    "ALTER TABLE sesiones ALTER COLUMN token_sesion TYPE VARCHAR(1000)"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS nombre_usuario VARCHAR(255)"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS rol_usuario VARCHAR(50)"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS fin_sesion TIMESTAMPTZ"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS ultima_actividad_en TIMESTAMPTZ DEFAULT NOW()"
                )
            )
        except Exception as e:
            print(f"DEBUG: Error al asegurar columnas de perfil/auditoría: {e}")

    # 3.1 Seed idempotente de sala por defecto
    try:
        import uuid
        from sqlmodel import select
        from .models.reserva_salas.models import Room

        default_room_id = uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Room).where(Room.id == default_room_id)
            )
            if result.scalars().first() is None:
                session.add(
                    Room(
                        id=default_room_id,
                        name="Sala de reuniones 1",
                        capacity=10,
                        resources=["Proyector", "Pizarra"],
                        is_active=True,
                        notes="Sala principal",
                    )
                )
                await session.commit()
    except Exception as e:
        print(f"DEBUG: Error seed sala por defecto: {e}")

    # 4. Usuario administrador por defecto (si no existe)
    try:
        from .models.auth.usuario import Usuario
        from .services.auth.servicio import ServicioAuth

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Usuario).where(Usuario.cedula == "admin")
            )
            if result.scalar_one_or_none() is None:
                admin = Usuario(
                    id="admin-01",
                    cedula="admin",
                    nombre="Administrador Sistema",
                    rol="admin",
                    hash_contrasena=ServicioAuth.obtener_hash_contrasena("admin123"),
                    esta_activo=True,
                )
                session.add(admin)
                await session.commit()
                print("DEBUG: Usuario administrador creado (admin / admin123)")
    except Exception as e:
        print(f"DEBUG: Error creando usuario admin: {e}")
