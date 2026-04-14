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
    """Generador de sesión ERP opcional corregido para estabilidad de FastAPI."""
    db = None
    try:
        db = SessionErp()
        yield db
    except Exception as e:
        # Si ocurre un error lanzando desde el endpoint (ej: HTTPException 403), 
        # o en la conexión inicial, lo manejamos silenciosamente para el generador.
        print(f"DEBUG: ERP no disponible o interrumpido: {e}")
        if db is None:
            yield None
    finally:
        if db:
            db.close()


async def init_db():
    """Inicializa las tablas de la base de datos usando SQLModel y asegura columnas de perfil"""
    async with async_engine.begin() as conn:
        # 1. Crear tablas si no existen
        try:
            await conn.run_sync(SQLModel.metadata.create_all)
        except Exception as e:
            # En producción con múltiples workers (Gunicorn/Uvicorn),
            # ocurre concurrencia creando tablas simultáneamente.
            print(f"DEBUG: Error concurrente en create_all (posible multi-worker): {e}")

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
            # Eliminar restricción de llave foránea para permitir usuarios del portal sin registro local
            await conn.execute(
                text(
                    "ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_usuario_id_fkey"
                )
            )

            # --- MIGRACIÓN INVENTARIO 2026 ---
            await conn.execute(
                text("ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'PENDIENTE'")
            )
            await conn.execute(
                text("ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS invporlegalizar FLOAT DEFAULT 0.0")
            )
            await conn.execute(
                text("ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS cantidad_final FLOAT DEFAULT 0.0")
            )
            await conn.execute(
                text("ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS diferencia_total FLOAT DEFAULT 0.0")
            )
            
            # --- CORRECCIÓN DE UNICIDAD (FLEXIBILIDAD TOTAL) ---
            # Eliminar la restricción antigua que impedía repeticiones de SKU en la misma ubicación
            await conn.execute(
                text("ALTER TABLE conteoinventario DROP CONSTRAINT IF EXISTS unique_sku_location")
            )
            
            # --- MIGRACIÓN HISTÓRICO ---
            await conn.execute(
                text("ALTER TABLE conteohistorico ADD COLUMN IF NOT EXISTS cantidad_final FLOAT DEFAULT 0.0")
            )
            await conn.execute(
                text("ALTER TABLE conteohistorico ADD COLUMN IF NOT EXISTS diferencia_total FLOAT DEFAULT 0.0")
            )
            
            # Tablas Adicionales
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS asignacioninventario (
                    id SERIAL PRIMARY KEY,
                    bodega VARCHAR(100),
                    bloque VARCHAR(50),
                    estante VARCHAR(50),
                    nivel VARCHAR(50),
                    cedula VARCHAR(50),
                    nombre VARCHAR(255),
                    cargo VARCHAR(100),
                    creado_en TIMESTAMP DEFAULT NOW()
                );
            """))
            
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS transitoinventario (
                    id SERIAL PRIMARY KEY,
                    sku VARCHAR(100),
                    documento VARCHAR(100),
                    cantidad FLOAT DEFAULT 0.0,
                    fecha_proceso TIMESTAMP DEFAULT NOW()
                );
            """))
            
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS configuracioninventario (
                    id SERIAL PRIMARY KEY,
                    ronda_activa INTEGER DEFAULT 1,
                    conteo_nombre VARCHAR(100),
                    ultima_actualizacion TIMESTAMP DEFAULT NOW()
                );
            """))

            # --- CORRECCIÓN DE INTEGRIDAD (Aislamiento de Historia) ---
            # 1. Obtener el nombre del inventario activo
            config_res = await conn.execute(text("SELECT conteo_nombre, ronda_activa FROM configuracioninventario LIMIT 1;"))
            config_row = config_res.fetchone()
            
            if config_row and config_row[0]:
                active_conteo = config_row[0]
                r_act = config_row[1] or 1
                col_fisica = f"cant_c{r_act}"
                
                print(f"DEBUG: Corrigiendo balance para inventario activo: {active_conteo} (Ronda {r_act})")
                
                # Paso A: Resetear diferencia_total para el inventario activo basándose solo en su ronda actual
                # Usamos una subconsulta para obtener la suma física por SKU DENTRO DEL MISMO INVENTARIO
                await conn.execute(text(f"""
                    WITH total_fisico AS (
                        SELECT codigo, conteo, SUM(COALESCE({col_fisica}, 0)) as suma_f
                        FROM conteoinventario
                        WHERE conteo = :c_name
                        GROUP BY codigo, conteo
                    )
                    UPDATE conteoinventario i
                    SET diferencia_total = tf.suma_f - (COALESCE(i.cantidad_sistema, 0) + COALESCE(i.invporlegalizar, 0)),
                        estado = CASE 
                            WHEN ABS(tf.suma_f - (COALESCE(i.cantidad_sistema, 0) + COALESCE(i.invporlegalizar, 0))) < 0.01 THEN 'CONCILIADO'
                            ELSE i.estado
                        END
                    FROM total_fisico tf
                    WHERE i.codigo = tf.codigo AND i.conteo = tf.conteo AND i.conteo = :c_name;
                """), {"c_name": active_conteo})
            
            # Paso B: Asegurar que cantidad_final esté poblada para todos
            await conn.execute(text("""
                UPDATE conteoinventario 
                SET cantidad_final = (COALESCE(cantidad_sistema, 0) + COALESCE(invporlegalizar, 0))
                WHERE cantidad_final = 0 AND (cantidad_sistema > 0 OR invporlegalizar > 0);
            """))

            # --- SANEAMIENTO DE DATOS (Robustez para Staging) ---
            # 1. Asegurar que el estado no sea NULL (Causa de invisibilidad en portal)
            await conn.execute(text("UPDATE conteoinventario SET estado = 'PENDIENTE' WHERE estado IS NULL;"))
            
            # 2. Normalizar Bodega, Bloque y Estante (Eliminar espacios accidentales)
            await conn.execute(text("UPDATE conteoinventario SET bodega = TRIM(bodega), bloque = TRIM(bloque), estante = TRIM(estante);"))
            await conn.execute(text("UPDATE asignacioninventario SET bodega = TRIM(bodega), bloque = TRIM(bloque), estante = TRIM(estante);"))
            
            # 3. Inicializar campos numéricos para evitar errores de tipo
            await conn.execute(text("UPDATE conteoinventario SET invporlegalizar = 0 WHERE invporlegalizar IS NULL;"))
            await conn.execute(text("UPDATE conteoinventario SET diferencia_total = 0 WHERE diferencia_total IS NULL AND (cant_c1 IS NULL OR cant_c1 = 0);"))
            
            # --- AUTO-MIGRACIÓN: Soporte de Parejas (Requerimiento v4.2) ---
            # Asegurar que existan las columnas en asignacioninventario
            await conn.execute(text('ALTER TABLE "asignacioninventario" ADD COLUMN IF NOT EXISTS "cedula_companero" VARCHAR;'))
            await conn.execute(text('ALTER TABLE "asignacioninventario" ADD COLUMN IF NOT EXISTS "nombre_companero" VARCHAR;'))
            await conn.execute(text('ALTER TABLE "asignacioninventario" ADD COLUMN IF NOT EXISTS "numero_pareja" INTEGER;'))
            
            # Inicializar numero_pareja si es NULL (opcional but safe)
            await conn.execute(text('UPDATE "asignacioninventario" SET "numero_pareja" = 1 WHERE "numero_pareja" IS NULL;'))

            # --- MIGRACIÓN LÍNEAS CORPORATIVAS (Motor de Dispersión) ---
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS nombre_plan VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS convenio VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS observaciones TEXT"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS cobro_fijo_coef FLOAT DEFAULT 0.5"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS cobro_especiales_coef FLOAT DEFAULT 1.0"))
            
            # Campos Financieros (Snapshot)
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS cfm_con_iva NUMERIC(12, 2) DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS cfm_sin_iva NUMERIC(12, 2) DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS descuento_39 NUMERIC(12, 2) DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS vr_factura NUMERIC(12, 2) DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS pago_empleado NUMERIC(12, 2) DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS pago_empresa NUMERIC(12, 2) DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS primera_quincena NUMERIC(12, 2) DEFAULT 0.0"))
            await conn.execute(text("ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS segunda_quincena NUMERIC(12, 2) DEFAULT 0.0"))
            
            # --- TABLA DE FACTURAS (Motor de Dispersión) ---
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS facturas_lineas (
                    id SERIAL PRIMARY KEY,
                    linea_id INTEGER REFERENCES lineas_corporativas(id),
                    periodo VARCHAR(50) NOT NULL,
                    documento_asignado VARCHAR(100),
                    centro_costo VARCHAR(100),
                    cargo_mes NUMERIC(12, 2) DEFAULT 0.0,
                    descuento_mes NUMERIC(12, 2) DEFAULT 0.0,
                    impoconsumo NUMERIC(12, 2) DEFAULT 0.0,
                    descuento_iva NUMERIC(12, 2) DEFAULT 0.0,
                    iva_19 NUMERIC(12, 2) DEFAULT 0.0,
                    total NUMERIC(12, 2) DEFAULT 0.0,
                    pago_empleado NUMERIC(12, 2) DEFAULT 0.0,
                    pago_refridcol NUMERIC(12, 2) DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_facturas_periodo ON facturas_lineas(periodo)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_facturas_linea ON facturas_lineas(linea_id)"))

        except Exception as e:
            print(f"DEBUG: Error al asegurar columnas de perfil/auditoría/inventario: {e}")

    # 3.1 Seed idempotente de sala por defecto
    try:
        import uuid
        from sqlalchemy import select
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
        from sqlmodel import select

        async with AsyncSessionLocal() as session:
            # 4.1 Crear admin
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

            # 4.2 SINCRONIZACIÓN Y SEMILLADO DE MÓDULOS
            # Ya no se realiza semillado manual aquí. El sistema usa rbac_discovery.py
            # cargando desde rbac_manifest.py para mantener una única fuente de verdad.
            pass

    except Exception as e:
        print(f"DEBUG: Error en post-inicialización (admin/módulos): {e}")

    except Exception as e:
        print(f"DEBUG: Error en post-inicialización (admin/módulos): {e}")
