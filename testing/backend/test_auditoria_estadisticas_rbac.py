from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock

import pytest
from fastapi import HTTPException

from app.api.auditoria.router import requiere_permiso_auditoria
from app.services.auth.servicio import ServicioAuth


@pytest.mark.asyncio
async def test_requiere_permiso_auditoria_acepta_permiso_efectivo(monkeypatch):
    usuario = SimpleNamespace(rol="auditor")
    obtener_permisos = AsyncMock(return_value={"auditoria_sistema"})
    monkeypatch.setattr(ServicioAuth, "obtener_permisos_por_rol", obtener_permisos)

    resultado = await requiere_permiso_auditoria(db=object(), usuario=usuario)

    assert resultado is usuario
    obtener_permisos.assert_awaited_once_with(ANY, "auditor")


@pytest.mark.asyncio
async def test_requiere_permiso_auditoria_rechaza_usuario_sin_permiso(monkeypatch):
    usuario = SimpleNamespace(rol="empleado")
    monkeypatch.setattr(
        ServicioAuth,
        "obtener_permisos_por_rol",
        AsyncMock(return_value={"mis_solicitudes"}),
    )

    with pytest.raises(HTTPException) as exc_info:
        await requiere_permiso_auditoria(db=object(), usuario=usuario)

    assert exc_info.value.status_code == 403
