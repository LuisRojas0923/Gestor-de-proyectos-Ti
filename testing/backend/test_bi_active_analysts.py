import pytest

@pytest.mark.asyncio
async def test_bi_estadisticas_analistas_activos(client, auth_token):
    """
    Valida que el endpoint de estadísticas BI devuelva la lista de analistas
    con su correspondiente bandera de 'esta_activo'.
    """
    if not auth_token:
        pytest.skip("Sin token de autenticación")

    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/soporte/estadisticas/bi", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "analista_stats" in data, "La respuesta de estadísticas BI debe incluir 'analista_stats'"
    
    analistas = data["analista_stats"]
    # Si hay analistas, validar que todos contengan la propiedad 'esta_activo' y sea boolean
    for analista in analistas:
        assert "name" in analista
        assert "esta_activo" in analista
        assert isinstance(analista["esta_activo"], bool)
