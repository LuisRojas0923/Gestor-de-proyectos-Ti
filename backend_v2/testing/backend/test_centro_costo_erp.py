import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from app.main import app
from app.database import async_engine, obtener_erp_db
from sqlalchemy.orm import Session

from app.config import config
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.services.erp.centro_costo_service import CentroCostoErpService

# Configurar motor síncrono apuntando a la base de datos de pruebas local
sync_test_url = config.database_url.replace("postgresql+asyncpg://", "postgresql://")
test_erp_engine = create_engine(sync_test_url)
TestSessionErp = sessionmaker(bind=test_erp_engine)

def override_obtener_erp_db():
    db = TestSessionErp()
    try:
        yield db
    finally:
        db.close()

# Asegurar que las tablas estén creadas y sembradas en la base de datos de pruebas
CentroCostoErpService.inicializar_tablas_erp(test_erp_engine)
db_init = TestSessionErp()
try:
    CentroCostoErpService.semillar_datos_iniciales(db_init)
finally:
    db_init.close()


@pytest_asyncio.fixture(scope="function")
async def client_admin():
    from app.models.auth.usuario import Usuario
    from app.api.auth.router import obtener_usuario_actual_db

    mock_usuario = Usuario(
        id="USR-TEST-ADMIN",
        cedula="66903320",
        nombre="Administrador Test",
        rol="admin",
        correo="admin.test@refridcol.com",
        esta_activo=True,
        hash_contrasena="dummy"
    )
    app.dependency_overrides[obtener_usuario_actual_db] = lambda: mock_usuario
    app.dependency_overrides[obtener_erp_db] = override_obtener_erp_db

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v2") as ac:
        yield ac
    app.dependency_overrides.clear()
    await async_engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def client_non_admin():
    from app.models.auth.usuario import Usuario
    from app.api.auth.router import obtener_usuario_actual_db

    mock_usuario = Usuario(
        id="USR-TEST-EMPLOYEE",
        cedula="998877",
        nombre="Empleado Test",
        rol="empleado",
        correo="empleado.test@refridcol.com",
        esta_activo=True,
        hash_contrasena="dummy"
    )
    app.dependency_overrides[obtener_usuario_actual_db] = lambda: mock_usuario
    app.dependency_overrides[obtener_erp_db] = override_obtener_erp_db

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v2") as ac:
        yield ac
    app.dependency_overrides.clear()
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_centro_costo_rbac_protection(client_non_admin):
    # 1. Obtener listados debe ser permitido para cualquier usuario autenticado (retorna 200)
    res_get = await client_non_admin.get("/erp/centro-costo/uen")
    assert res_get.status_code == 200

    # 2. Intentar crear una UEN sin rol de administrador debe retornar 403
    payload = {"codigo": "95", "nombre": "INTENTO FALLIDO", "activo": True}
    res_post = await client_non_admin.post("/erp/centro-costo/uen", json=payload)
    assert res_post.status_code == 403
    assert "No tiene permisos" in res_post.json()["detail"]


@pytest.mark.asyncio
async def test_centro_costo_crud_operaciones(client_admin):
    # 1. Listar UENs (deben estar las sembradas)
    res_uen = await client_admin.get("/erp/centro-costo/uen")
    assert res_uen.status_code == 200
    uens = res_uen.json()
    assert len(uens) >= 8
    codigos_uen = [u["codigo"] for u in uens]
    assert "10" in codigos_uen
    assert "99" in codigos_uen

    # 2. Crear una nueva UEN
    payload_uen = {"codigo": "95", "nombre": "TEST UEN", "activo": True}
    res_crear_uen = await client_admin.post("/erp/centro-costo/uen", json=payload_uen)
    assert res_crear_uen.status_code == 200
    assert res_crear_uen.json()["codigo"] == "95"
    assert res_crear_uen.json()["nombre"] == "TEST UEN"

    # 3. Listar de nuevo y comprobar que existe la nueva UEN
    res_uen2 = await client_admin.get("/erp/centro-costo/uen")
    codigos_uen2 = [u["codigo"] for u in res_uen2.json()]
    assert "95" in codigos_uen2

    # 4. Desactivar la UEN creada
    res_desactivar = await client_admin.delete("/erp/centro-costo/uen/95")
    assert res_desactivar.status_code == 200
    assert res_desactivar.json()["activo"] is False

    # 5. Activar de nuevo la UEN
    res_activar = await client_admin.post("/erp/centro-costo/uen/95/activar")
    assert res_activar.status_code == 200
    assert res_activar.json()["activo"] is True

    # 6. Listar Subcentros de Costo (deben estar sembrados)
    res_subcentro = await client_admin.get("/erp/centro-costo/subcentro")
    assert res_subcentro.status_code == 200
    subcentros = res_subcentro.json()
    assert len(subcentros) >= 12
    codigos_sub = [s["codigo"] for s in subcentros]
    assert "10" in codigos_sub
    assert "81" in codigos_sub

    # 7. Crear un nuevo Subcentro
    payload_sub = {"codigo": "95", "nombre": "TEST SUBCENTRO", "activo": True}
    res_crear_sub = await client_admin.post("/erp/centro-costo/subcentro", json=payload_sub)
    assert res_crear_sub.status_code == 200
    assert res_crear_sub.json()["codigo"] == "95"

    # 8. Listar Especialidades (deben estar sembradas)
    res_esp = await client_admin.get("/erp/centro-costo/especialidad")
    assert res_esp.status_code == 200
    esps = res_esp.json()
    assert len(esps) >= 12
    codigos_esp = [e["codigo"] for e in esps]
    assert "10" in codigos_esp
    assert "99" in codigos_esp

    # 9. Crear una nueva Especialidad
    payload_esp = {"codigo": "95", "nombre": "TEST ESPECIALIDAD", "activo": True}
    res_crear_esp = await client_admin.post("/erp/centro-costo/especialidad", json=payload_esp)
    assert res_crear_esp.status_code == 200
    assert res_crear_esp.json()["codigo"] == "95"

    # Limpieza en base de datos ERP de los registros temporales de prueba
    from app.models.erp.centro_costo import ERPCentroCostoUen, ERPSubcentroCosto, ERPEspecialidad
    db_erp_gen = TestSessionErp()
    try:
        db_erp_gen.query(ERPCentroCostoUen).filter(ERPCentroCostoUen.codigo == "95").delete()
        db_erp_gen.query(ERPSubcentroCosto).filter(ERPSubcentroCosto.codigo == "95").delete()
        db_erp_gen.query(ERPEspecialidad).filter(ERPEspecialidad.codigo == "95").delete()
        db_erp_gen.commit()
    finally:
        db_erp_gen.close()
