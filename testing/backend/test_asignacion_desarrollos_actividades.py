import pytest
from sqlalchemy import delete, text

from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo
from app.models.auth.usuario import Usuario


TEST_DESARROLLO_ID = "TEST-JER-ASIGNACION"


async def asegurar_columnas_asignacion(db_session):
    statements = [
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS creado_por_id VARCHAR(50)",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS responsable_id VARCHAR(50)",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_por_id VARCHAR(50)",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_en TIMESTAMPTZ",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS asignado_a_id VARCHAR(50)",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS delegado_por_id VARCHAR(50)",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'",
    ]
    for statement in statements:
        await db_session.execute(text(statement))
    await db_session.commit()


import pytest_asyncio


@pytest_asyncio.fixture
async def desarrollo_asignacion_seed():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import text
    from app.config import config
    from app.services.auth.servicio import ServicioAuth
    engine = create_async_engine(config.database_url)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    
    hash_pwd = ServicioAuth.obtener_hash_contrasena("pass123")
    
    async with Session() as session:
        # Asegurar columnas
        statements = [
            "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS creado_por_id VARCHAR(50)",
            "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS responsable_id VARCHAR(50)",
            "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'",
            "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_por_id VARCHAR(50)",
            "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_en TIMESTAMPTZ",
            "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS asignado_a_id VARCHAR(50)",
            "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS delegado_por_id VARCHAR(50)",
            "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'",
        ]
        for statement in statements:
            await session.execute(text(statement))
            
        await session.execute(text("DELETE FROM actividades WHERE desarrollo_id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM desarrollos WHERE id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM usuarios WHERE id = 'USR-JER-ADMIN'"))
        
        # Crear usuario admin para pruebas de WBS protegidas
        admin_user = Usuario(
            id="USR-JER-ADMIN",
            cedula="JER-ADMIN",
            nombre="Admin Jerarquia",
            hash_contrasena=hash_pwd,
            rol="admin",
            esta_activo=True,
            correo_actualizado=True,
            zona_horaria="America/Bogota"
        )
        session.add(admin_user)
        await session.flush()
        
        await session.execute(text("""
            INSERT INTO desarrollos (id, nombre, estado_general, estado_validacion, porcentaje_progreso, creado_en) 
            VALUES (:did, 'Proyecto jerarquico de prueba', 'Pendiente', 'aprobada', 0.0, NOW())
        """), {"did": TEST_DESARROLLO_ID})
        await session.commit()
        
    yield
    
    async with Session() as session:
        await session.execute(text("DELETE FROM actividades WHERE desarrollo_id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM desarrollos WHERE id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM usuarios WHERE id = 'USR-JER-ADMIN'"))
        await session.commit()
    await engine.dispose()


@pytest.mark.asyncio
async def test_actualizar_desarrollo_guarda_responsable_y_validacion(client, desarrollo_asignacion_seed):
    response = await client.put(
        f"/desarrollos/{TEST_DESARROLLO_ID}",
        json={
            "creado_por_id": "USR-JER-GERENTE",
            "responsable_id": "USR-JER-DIRECTOR",
            "estado_validacion": "pendiente",
            "validado_por_id": "USR-JER-DIRECTOR",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["creado_por_id"] == "USR-JER-GERENTE"
    assert data["responsable_id"] == "USR-JER-DIRECTOR"
    assert data["estado_validacion"] == "pendiente"
    assert data["validado_por_id"] == "USR-JER-DIRECTOR"


@pytest.mark.asyncio
async def test_crear_actividad_guarda_asignado_y_validacion(client, desarrollo_asignacion_seed):
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea con ejecutor jerarquico",
            "responsable_id": "USR-JER-DIRECTOR",
            "asignado_a_id": "USR-JER-JEFE",
            "delegado_por_id": "USR-JER-GERENTE",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["responsable_id"] == "USR-JER-DIRECTOR"
    assert data["asignado_a_id"] == "USR-JER-JEFE"
    assert data["delegado_por_id"] == "USR-JER-GERENTE"
    assert data["estado_validacion"] == "aprobada"


@pytest.mark.asyncio
async def test_arbol_actividades_no_dispara_lazy_loading(client, desarrollo_asignacion_seed):
    raiz = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea raiz para arbol",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert raiz.status_code == 200

    hija = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "parent_id": raiz.json()["id"],
            "titulo": "Subtarea para arbol",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert hija.status_code == 200

    # Inyectar token de autorizacion
    token_response = await client.post("/auth/login", data={
        "username": "JER-ADMIN",
        "password": "pass123"
    })
    assert token_response.status_code == 200
    token = token_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get(f"/actividades/desarrollo/{TEST_DESARROLLO_ID}/arbol", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["titulo"] == "Tarea raiz para arbol"
    assert data[0]["subactividades"][0]["titulo"] == "Subtarea para arbol"


@pytest.mark.asyncio
async def test_actualizar_actividad_guarda_reasignacion(client, desarrollo_asignacion_seed):
    creada = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea para reasignar",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert creada.status_code == 200

    actividad_id = creada.json()["id"]
    response = await client.patch(
        f"/actividades/{actividad_id}",
        json={
            "asignado_a_id": "USR-JER-EJECUTOR",
            "delegado_por_id": "USR-JER-JEFE",
            "estado_validacion": "aprobada",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["asignado_a_id"] == "USR-JER-EJECUTOR"
    assert data["delegado_por_id"] == "USR-JER-JEFE"
    assert data["estado_validacion"] == "aprobada"
