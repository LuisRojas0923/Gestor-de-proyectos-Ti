import pytest
from sqlalchemy import delete, select, text

from app.models.auth.usuario import RelacionUsuario, Usuario
from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo, ValidacionAsignacion


TEST_DESARROLLO_ID = "TEST-VALIDACION-ASIGNACION"
TEST_USER_IDS = ["USR-VAL-GERENTE", "USR-VAL-DIRECTOR", "USR-VAL-JEFE"]


async def asegurar_tablas_validacion(db_session):
    statements = [
        """
        CREATE TABLE IF NOT EXISTS relaciones_usuarios (
            id SERIAL PRIMARY KEY,
            usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            superior_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            tipo_relacion VARCHAR(50) NOT NULL DEFAULT 'lineal',
            esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ
        )
        """,
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS asignado_a_id VARCHAR(50)",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS delegado_por_id VARCHAR(50)",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS validacion_id INTEGER",
        """
        CREATE TABLE IF NOT EXISTS validaciones_asignacion (
            id SERIAL PRIMARY KEY,
            desarrollo_id VARCHAR(50) REFERENCES desarrollos(id),
            actividad_id INTEGER REFERENCES actividades(id),
            solicitado_por_id VARCHAR(50) NOT NULL,
            validador_id VARCHAR(50) NOT NULL,
            asignado_a_id VARCHAR(50) NOT NULL,
            estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
            motivo TEXT,
            observacion TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW(),
            validado_en TIMESTAMPTZ
        )
        """,
    ]
    for statement in statements:
        await db_session.execute(text(statement))
    await db_session.commit()


async def limpiar_validacion_test(db_session):
    await db_session.execute(delete(ValidacionAsignacion).where(ValidacionAsignacion.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.execute(
        delete(RelacionUsuario).where(
            RelacionUsuario.usuario_id.in_(TEST_USER_IDS)
            | RelacionUsuario.superior_id.in_(TEST_USER_IDS)
        )
    )
    await db_session.execute(delete(Usuario).where(Usuario.id.in_(TEST_USER_IDS)))
    await db_session.commit()


@pytest.fixture
async def validacion_seed(db_session):
    await asegurar_tablas_validacion(db_session)
    await limpiar_validacion_test(db_session)

    db_session.add_all([
        Usuario(id="USR-VAL-GERENTE", cedula="VAL-GERENTE", nombre="Gerente Validacion", hash_contrasena="N/A", rol="gerente"),
        Usuario(id="USR-VAL-DIRECTOR", cedula="VAL-DIRECTOR", nombre="Director Validacion", hash_contrasena="N/A", rol="director"),
        Usuario(id="USR-VAL-JEFE", cedula="VAL-JEFE", nombre="Jefe Validacion", hash_contrasena="N/A", rol="jefe"),
    ])
    db_session.add(
        Desarrollo(id=TEST_DESARROLLO_ID, nombre="Proyecto validacion", estado_general="Pendiente")
    )
    await db_session.flush()
    db_session.add_all([
        RelacionUsuario(usuario_id="USR-VAL-DIRECTOR", superior_id="USR-VAL-GERENTE"),
        RelacionUsuario(usuario_id="USR-VAL-JEFE", superior_id="USR-VAL-DIRECTOR"),
    ])
    await db_session.commit()

    yield

    await limpiar_validacion_test(db_session)


@pytest.mark.asyncio
async def test_asignacion_indirecta_crea_validacion_pendiente(client, db_session, validacion_seed):
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea asignada por gerente a jefe",
            "delegado_por_id": "USR-VAL-GERENTE",
            "asignado_a_id": "USR-VAL-JEFE",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["estado_validacion"] == "pendiente"
    assert data["validacion_id"] is not None

    validacion = await db_session.scalar(
        select(ValidacionAsignacion).where(ValidacionAsignacion.id == data["validacion_id"])
    )
    assert validacion is not None
    assert validacion.solicitado_por_id == "USR-VAL-GERENTE"
    assert validacion.validador_id == "USR-VAL-DIRECTOR"
    assert validacion.asignado_a_id == "USR-VAL-JEFE"
    assert validacion.estado == "pendiente"


@pytest.mark.asyncio
async def test_asignacion_directa_no_crea_validacion(client, validacion_seed):
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea asignada por director a jefe",
            "delegado_por_id": "USR-VAL-DIRECTOR",
            "asignado_a_id": "USR-VAL-JEFE",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["estado_validacion"] == "aprobada"
    assert data["validacion_id"] is None


@pytest.mark.asyncio
async def test_aprobar_validacion_actualiza_actividad(client, validacion_seed):
    creada = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea para aprobar",
            "delegado_por_id": "USR-VAL-GERENTE",
            "asignado_a_id": "USR-VAL-JEFE",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    validacion_id = creada.json()["validacion_id"]

    response = await client.post(
        f"/validaciones-asignacion/{validacion_id}/resolver",
        json={"estado": "aprobada", "observacion": "Aprobado por director"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["estado"] == "aprobada"
    assert data["observacion"] == "Aprobado por director"
