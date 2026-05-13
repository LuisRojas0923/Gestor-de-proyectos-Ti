import pytest


@pytest.mark.asyncio
async def test_listar_tipos_desarrollo_activos(client):
    response = await client.get("/desarrollos/tipos")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert all(item["esta_activo"] is True for item in data)


@pytest.mark.asyncio
async def test_listar_tipos_desarrollo_incluye_semilla_base(client):
    response = await client.get("/desarrollos/tipos")

    assert response.status_code == 200
    valores = {item["valor"] for item in response.json()}
    assert {
        "Proyecto",
        "Mejora",
        "Soporte",
        "Renovación",
        "Actividad frecuente",
        "Actividad",
    }.issubset(valores)


@pytest.mark.asyncio
async def test_listar_tipos_desarrollo_ordenados(client):
    response = await client.get("/desarrollos/tipos")

    assert response.status_code == 200
    ordenes = [item["orden"] for item in response.json()]
    assert ordenes == sorted(ordenes)
