from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.auditoria.router import requiere_permiso_auditoria, router
from app.database import obtener_db
from app.services.auditoria.servicio_estadisticas import ServicioAuditoriaEstadisticas


def crear_cliente(estado_acceso: int | None = None) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/auditoria")

    async def db_pruebas():
        yield object()

    async def acceso_pruebas():
        if estado_acceso:
            raise HTTPException(status_code=estado_acceso, detail="Acceso denegado")
        return object()

    app.dependency_overrides[obtener_db] = db_pruebas
    app.dependency_overrides[requiere_permiso_auditoria] = acceso_pruebas
    return TestClient(app)


@pytest.mark.parametrize("estado", [401, 403])
def test_estadisticas_respeta_rechazo_de_autenticacion_y_rbac(estado):
    response = crear_cliente(estado).get("/auditoria/estadisticas")

    assert response.status_code == estado


def test_estadisticas_retorna_respuesta_minima_autorizada(monkeypatch):
    obtener_estadisticas = AsyncMock(
        return_value={
            "total_eventos": 0,
            "usuarios_unicos": 0,
            "total_exitosos": 0,
            "total_fallidos": 0,
            "total_denegados": 0,
            "total_fallos_auth": 0,
            "tasa_exito": 0,
            "modulo_mas_activo": None,
            "por_modulo": [],
            "tipos_fallos": [],
            "por_dia": [],
            "top_usuarios": [],
            "top_rutas": [],
        }
    )
    monkeypatch.setattr(
        ServicioAuditoriaEstadisticas,
        "obtener_estadisticas",
        obtener_estadisticas,
    )

    response = crear_cliente().get("/auditoria/estadisticas")

    assert response.status_code == 200
    assert response.json()["total_eventos"] == 0
