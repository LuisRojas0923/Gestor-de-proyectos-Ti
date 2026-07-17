import pytest
import asyncio
from datetime import datetime, timedelta, timezone

@pytest.mark.asyncio
async def test_reserva_salas_concurrente_409(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    room_resp = await client.post(
        "/reserva-salas/rooms", 
        json={"name": "Sala Concurrente Test", "capacity": 10},
        headers=headers
    )
    assert room_resp.status_code in (200, 201), f"Fallo al crear sala: {room_resp.text}"
    room_id = room_resp.json()["id"]

    start = datetime.now(timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
    end = start + timedelta(hours=1)
    
    payload = {
        "room_id": room_id,
        "title": "Reserva Solapada",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat()
    }

    async def make_request():
        resp = await client.post("/reserva-salas/reservations", json=payload, headers=headers)
        return resp.status_code

    results = await asyncio.gather(make_request(), make_request())
    
    assert 409 in results, f"No se retornó 409. Resultados: {results}"
    assert any(code in (200, 201) for code in results), f"Ninguna solicitud tuvo éxito. Resultados: {results}"

