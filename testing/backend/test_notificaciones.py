import pytest
import pytest_asyncio
from sqlalchemy import delete
from app.models.alerta.notificacion import NotificacionUsuario

TEST_USER_ID = "USR-P-1111541440"

@pytest_asyncio.fixture
async def cleanup_notifications(db_session):
    await db_session.execute(delete(NotificacionUsuario).where(NotificacionUsuario.usuario_id == TEST_USER_ID))
    await db_session.commit()
    yield
    await db_session.execute(delete(NotificacionUsuario).where(NotificacionUsuario.usuario_id == TEST_USER_ID))
    await db_session.commit()

@pytest.mark.asyncio
async def test_notificaciones_crud(client, cleanup_notifications):
    # 1. Intentar crear una notificación mediante API
    r_create = await client.post("/notificaciones/", json={
        "usuario_id": TEST_USER_ID,
        "titulo": "Prueba de notificación",
        "mensaje": "Tienes un nuevo ticket asignado",
        "tipo_evento": "ticket_asignado",
        "referencia_id": "TKT-999"
    })
    assert r_create.status_code == 200
    data = r_create.json()
    assert data["titulo"] == "Prueba de notificación"
    assert data["leido"] is False

    # 2. Listar notificaciones del usuario
    r_list = await client.get(f"/notificaciones/usuario/{TEST_USER_ID}")
    assert r_list.status_code == 200
    list_data = r_list.json()
    assert len(list_data) >= 1
    assert any(n["id"] == data["id"] for n in list_data)

    # 3. Marcar notificación como leída
    r_update = await client.put(f"/notificaciones/{data['id']}/leido", json={"leido": True})
    assert r_update.status_code == 200
    assert r_update.json()["leido"] is True

    # 4. Verificar cambio
    r_list_updated = await client.get(f"/notificaciones/usuario/{TEST_USER_ID}")
    assert r_list_updated.status_code == 200
    assert any(n["id"] == data["id"] and n["leido"] is True for n in r_list_updated.json())
