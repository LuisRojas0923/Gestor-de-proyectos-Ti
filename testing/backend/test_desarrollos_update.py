import pytest


@pytest.fixture
async def desarrollo_original(client):
    response = await client.get("/desarrollos/HO-2")
    assert response.status_code == 200
    original = response.json()
    yield original
    await client.put(
        "/desarrollos/HO-2",
        json={
            "nombre": original["nombre"],
            "descripcion": original.get("descripcion"),
            "modulo": original.get("modulo"),
            "tipo": original.get("tipo"),
            "ambiente": original.get("ambiente"),
            "enlace_portal": original.get("enlace_portal"),
            "proveedor": original.get("proveedor"),
            "responsable": original.get("responsable"),
            "area_desarrollo": original.get("area_desarrollo"),
            "analista": original.get("analista"),
            "estado_general": original.get("estado_general"),
            "fecha_inicio": original.get("fecha_inicio"),
            "fecha_estimada_fin": original.get("fecha_estimada_fin"),
            "fecha_real_fin": original.get("fecha_real_fin"),
        },
    )


@pytest.mark.asyncio
async def test_actualizar_desarrollo_existente(client, desarrollo_original):
    response = await client.put(
        "/desarrollos/HO-2",
        json={
            "nombre": "ANALISIS DE COTIZACIONES",
            "estado_general": "completada",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "HO-2"
    assert data["nombre"] == "ANALISIS DE COTIZACIONES"
    assert data["estado_general"] == "completada"


@pytest.mark.asyncio
async def test_actualizar_desarrollo_no_existente(client):
    response = await client.put(
        "/desarrollos/NO-EXISTE",
        json={"nombre": "No existe"},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_actualizar_desarrollo_fechas_minimas(client, desarrollo_original):
    response = await client.put(
        "/desarrollos/HO-2",
        json={
            "fecha_inicio": "2023-08-04",
            "fecha_estimada_fin": "2023-09-01",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["fecha_inicio"] == "2023-08-04"
    assert data["fecha_estimada_fin"] == "2023-09-01"
