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

@pytest.mark.asyncio
async def test_bi_new_time_formulas(client, auth_token):
    """
    Valida que el endpoint de estadísticas BI devuelva los campos correctos
    en 'resumen', incluyendo la nueva métrica 'avg_resolucion_global'.
    """
    if not auth_token:
        pytest.skip("Sin token de autenticación")

    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/soporte/estadisticas/bi", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "resumen" in data
    resumen = data["resumen"]
    
    assert "avg_atender_global" in resumen
    assert "avg_atencion_global" in resumen
    assert "avg_resolucion_global" in resumen
    
    assert isinstance(resumen["avg_atender_global"], (int, float))
    assert isinstance(resumen["avg_atencion_global"], (int, float))
    assert isinstance(resumen["avg_resolucion_global"], (int, float))

@pytest.mark.asyncio
async def test_bi_service_logic_direct(db_session):
    """
    Valida la lógica interna de TicketBIService directamente usando la sesión de DB.
    """
    from app.services.ticket.bi_service import TicketBIService
    
    data = await TicketBIService.obtener_data_analitica_bi(db_session)
    assert "resumen" in data
    assert "prioridad_stats" in data
    assert "area_stats" in data
    assert "timeline" in data
    assert "causa_stats" in data
    assert "analista_stats" in data
    
    resumen = data["resumen"]
    assert "avg_atender_global" in resumen
    assert "avg_atencion_global" in resumen
    assert "avg_resolucion_global" in resumen
    
    assert isinstance(resumen["avg_atender_global"], (int, float))
    assert isinstance(resumen["avg_atencion_global"], (int, float))
    assert isinstance(resumen["avg_resolucion_global"], (int, float))
