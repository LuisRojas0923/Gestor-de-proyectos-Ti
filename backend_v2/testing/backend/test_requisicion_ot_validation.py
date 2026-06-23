import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.config import config
from app.database import async_engine, obtener_erp_db_opcional

# Configurar motor síncrono apuntando a la base de datos de pruebas local
sync_test_url = config.database_url.replace("postgresql+asyncpg://", "postgresql://")
test_erp_engine = create_engine(sync_test_url)
TestSessionErp = sessionmaker(bind=test_erp_engine)

def override_obtener_erp_db_opcional():
    db = TestSessionErp()
    try:
        yield db
    finally:
        db.close()

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_erp_test_table():
    # Crear la tabla basegeneralcostos en la DB de pruebas
    with test_erp_engine.connect() as conn:
        with conn.begin():
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS basegeneralcostos (
                    orden TEXT PRIMARY KEY,
                    cliente TEXT,
                    estado TEXT
                )
            """))
            # Sembrar OTs de prueba
            # Primero limpiar por si quedaron de ejecuciones anteriores
            conn.execute(text("DELETE FROM basegeneralcostos WHERE orden IN ('OT-TEST-ACTIVE', 'OT-TEST-TERMINADO')"))
            conn.execute(text("""
                INSERT INTO basegeneralcostos (orden, cliente, estado) 
                VALUES 
                    ('OT-TEST-ACTIVE', 'CLIENTE PRUEBA ACTIVO', 'ACTIVO'),
                    ('OT-TEST-TERMINADO', 'CLIENTE PRUEBA TERM', 'TERMINADO')
            """))
            
    yield
    
    # Limpieza
    with test_erp_engine.connect() as conn:
        with conn.begin():
            conn.execute(text("DROP TABLE IF EXISTS basegeneralcostos"))

@pytest_asyncio.fixture(scope="function")
async def client():
    app.dependency_overrides[obtener_erp_db_opcional] = override_obtener_erp_db_opcional
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v2") as ac:
        yield ac
    app.dependency_overrides.clear()
    await async_engine.dispose()

@pytest.mark.asyncio
async def test_validar_ot_activa(client):
    res = await client.get("/erp/requisiciones/validar-ot?ot=OT-TEST-ACTIVE")
    assert res.status_code == 200
    data = res.json()
    assert data["encontrado"] is True
    assert data["cliente"] == "CLIENTE PRUEBA ACTIVO"
    assert data["estado"] == "ACTIVO"
    assert data["terminada"] is False

@pytest.mark.asyncio
async def test_validar_ot_terminada(client):
    res = await client.get("/erp/requisiciones/validar-ot?ot=OT-TEST-TERMINADO")
    assert res.status_code == 200
    data = res.json()
    assert data["encontrado"] is True
    assert data["cliente"] == "CLIENTE PRUEBA TERM"
    assert data["estado"] == "TERMINADO"
    assert data["terminada"] is True

@pytest.mark.asyncio
async def test_validar_ot_inexistente(client):
    res = await client.get("/erp/requisiciones/validar-ot?ot=OT-NO-EXISTE")
    assert res.status_code == 200
    data = res.json()
    assert data["encontrado"] is False
    assert data["cliente"] == ""
    assert data["estado"] == ""
    assert data["terminada"] is False
