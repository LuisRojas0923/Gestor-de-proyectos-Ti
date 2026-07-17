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
            """CREATE TABLE IF NOT EXISTS validaciones_asignacion (
                id SERIAL PRIMARY KEY,
                desarrollo_id VARCHAR(50),
                actividad_id INTEGER,
                solicitado_por_id VARCHAR(50) NOT NULL,
                validador_id VARCHAR(50) NOT NULL,
                asignado_a_id VARCHAR(50) NOT NULL,
                estado VARCHAR(50) DEFAULT 'pendiente',
                motivo TEXT,
                observacion TEXT,
                creado_en TIMESTAMPTZ DEFAULT NOW(),
                validado_en TIMESTAMPTZ
            )"""
        ]
        for statement in statements:
            await session.execute(text(statement))
            
        await session.execute(text("DELETE FROM validaciones_asignacion WHERE desarrollo_id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM actividades WHERE desarrollo_id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM desarrollos WHERE id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM notificaciones_usuario WHERE usuario_id IN ('USR-JER-ADMIN', 'USR-JER-GERENTE', 'USR-JER-DIRECTOR', 'USR-JER-JEFE', 'USR-JER-EJECUTOR', 'USR-JER-JEFE2')"))
        await session.execute(text("DELETE FROM usuarios WHERE id IN ('USR-JER-ADMIN', 'USR-JER-GERENTE', 'USR-JER-DIRECTOR', 'USR-JER-JEFE', 'USR-JER-EJECUTOR', 'USR-JER-JEFE2')"))
        usuarios_a_crear = [
            Usuario(id="USR-JER-ADMIN", cedula="jer-admin", nombre="Admin", hash_contrasena=hash_pwd, rol="admin", esta_activo=True, correo_actualizado=True, zona_horaria="America/Bogota"),
            Usuario(id="USR-JER-GERENTE", cedula="jer-gerente", nombre="Gerente", hash_contrasena=hash_pwd, rol="admin", esta_activo=True, correo_actualizado=True, zona_horaria="America/Bogota"),
            Usuario(id="USR-JER-DIRECTOR", cedula="jer-director", nombre="Director", hash_contrasena=hash_pwd, rol="admin", esta_activo=True, correo_actualizado=True, zona_horaria="America/Bogota"),
            Usuario(id="USR-JER-JEFE", cedula="jer-jefe", nombre="Jefe", hash_contrasena=hash_pwd, rol="admin", esta_activo=True, correo_actualizado=True, zona_horaria="America/Bogota"),
            Usuario(id="USR-JER-EJECUTOR", cedula="jer-ejecutor", nombre="Ejecutor", hash_contrasena=hash_pwd, rol="admin", esta_activo=True, correo_actualizado=True, zona_horaria="America/Bogota"),
            Usuario(id="USR-JER-JEFE2", cedula="jer-jefe2", nombre="Jefe 2", hash_contrasena=hash_pwd, rol="admin", esta_activo=True, correo_actualizado=True, zona_horaria="America/Bogota"),
        ]
        session.add_all(usuarios_a_crear)
        await session.flush()
        
        await session.execute(text("""
            INSERT INTO desarrollos (id, nombre, estado_general, estado_validacion, porcentaje_progreso, creado_en) 
            VALUES (:did, 'Proyecto jerarquico de prueba', 'Pendiente', 'aprobada', 0.0, NOW())
        """), {"did": TEST_DESARROLLO_ID})
        await session.commit()
        
    yield
    
    async with Session() as session:
        await session.execute(text("DELETE FROM validaciones_asignacion WHERE desarrollo_id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM actividades WHERE desarrollo_id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM desarrollos WHERE id = :did"), {"did": TEST_DESARROLLO_ID})
        await session.execute(text("DELETE FROM notificaciones_usuario WHERE usuario_id IN ('USR-JER-ADMIN', 'USR-JER-GERENTE', 'USR-JER-DIRECTOR', 'USR-JER-JEFE', 'USR-JER-EJECUTOR', 'USR-JER-JEFE2')"))
        await session.execute(text("DELETE FROM usuarios WHERE id IN ('USR-JER-ADMIN', 'USR-JER-GERENTE', 'USR-JER-DIRECTOR', 'USR-JER-JEFE', 'USR-JER-EJECUTOR', 'USR-JER-JEFE2')"))
        await session.commit()
    await engine.dispose()


@pytest_asyncio.fixture
async def admin_token():
    from app.services.auth.servicio import ServicioAuth
    return ServicioAuth.crear_token_acceso({"sub": "jer-admin", "cedula": "jer-admin", "rol": "admin"})

@pytest.mark.asyncio
async def test_actualizar_desarrollo_guarda_responsable_y_validacion(client, desarrollo_asignacion_seed, admin_token):
    response = await client.put(
        f"/desarrollos/{TEST_DESARROLLO_ID}",
        headers={"Authorization": f"Bearer {admin_token}"},
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
async def test_crear_actividad_guarda_asignado_y_validacion(client, desarrollo_asignacion_seed, admin_token):
    response = await client.post(
        "/actividades/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea con ejecutor jerarquico",
            "responsable_id": "USR-JER-DIRECTOR",
            "asignado_a_id": "USR-JER-JEFE",
            "delegado_por_id": "USR-JER-ADMIN",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["responsable_id"] == "USR-JER-DIRECTOR"
    assert data["asignado_a_id"] == "USR-JER-JEFE"
    assert data["delegado_por_id"] == "USR-JER-ADMIN"
    assert data["estado_validacion"] == "aprobada"


@pytest.mark.asyncio
async def test_arbol_actividades_no_dispara_lazy_loading(client, desarrollo_asignacion_seed, admin_token):
    raiz = await client.post(
        "/actividades/",
        headers={"Authorization": f"Bearer {admin_token}"},
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
        headers={"Authorization": f"Bearer {admin_token}"},
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
async def test_actualizar_actividad_guarda_reasignacion(client, desarrollo_asignacion_seed, admin_token):
    creada = await client.post(
        "/actividades/",
        headers={"Authorization": f"Bearer {admin_token}"},
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
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "asignado_a_id": "USR-JER-EJECUTOR",
            "delegado_por_id": "USR-JER-JEFE",
            "estado_validacion": "aprobada",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["asignado_a_id"] == "USR-JER-EJECUTOR"
    assert data["delegado_por_id"] == "USR-JER-ADMIN"
    assert data["estado_validacion"] == "aprobada"
