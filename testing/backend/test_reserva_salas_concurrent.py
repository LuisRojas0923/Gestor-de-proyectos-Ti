import pytest
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

@pytest.mark.asyncio
async def test_reserva_salas_concurrente_409(client, db_session):
    from app.main import app
    from app.api.auth.router import obtener_usuario_actual_db
    from app.models.auth.usuario import Usuario
    from app.models.reserva_salas.models import Room

    # Crear una sala directamente en la DB para no lidiar con auth de administrador
    room_id = uuid.uuid4()
    sala_test = Room(
        id=room_id,
        name="Sala Concurrente Test",
        capacity=10,
        resources=["Proyector"],
        is_active=True
    )
    db_session.add(sala_test)
    await db_session.commit()

    # Usuario mock
    user_uuid = str(uuid.uuid4())
    usuario_test = Usuario(
        id=user_uuid,
        cedula=user_uuid[:20],
        correo=f"test_conc_{user_uuid[:8]}@test.com",
        hash_contrasena="hash",
        nombre="Test Concurrente",
        rol="admin",
        esta_activo=True
    )
    db_session.add(usuario_test)
    await db_session.commit()

    # Mockear el permiso requerido para saltar el fixture de auth_token que falla por políticas de password
    from app.api.reserva_salas.dependencies import requiere_permiso_reserva_salas
    app.dependency_overrides[requiere_permiso_reserva_salas] = lambda: usuario_test

    # Hora válida: 15:00 UTC = 10:00 Bogotá (dentro del rango 7:00 a 18:00)
    start = datetime.now(timezone.utc).replace(hour=15, minute=0, second=0, microsecond=0) + timedelta(days=1)
    end = start + timedelta(hours=1)
    
    payload = {
        "room_id": str(room_id),
        "title": "Reserva Solapada",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat()
    }

    async def make_request():
        from httpx import AsyncClient, ASGITransport
        # Crear un cliente propio con ASGITransport para que se aplique dependency_overrides
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as local_client:
            resp = await local_client.post("/api/v2/reserva-salas/reservations", json=payload)
            return resp.status_code

    try:
        results = await asyncio.gather(make_request(), make_request())
        
        assert 409 in results, f"No se retornó 409. Resultados: {results}"
        assert any(code in (200, 201) for code in results), f"Ninguna solicitud tuvo éxito. Resultados: {results}"
    finally:
        app.dependency_overrides.pop(requiere_permiso_reserva_salas, None)
