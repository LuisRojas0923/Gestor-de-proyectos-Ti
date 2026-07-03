from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.biometria.biometria_router import requerir_permiso_biometria


class _FakeDb:
    pass


@pytest.mark.asyncio
async def test_requerir_permiso_biometria_deniega_sin_permiso(monkeypatch):
    async def fake_permisos(db, rol):
        return ["dashboard"]

    monkeypatch.setattr(
        "app.api.biometria.biometria_router.ServicioAuth.obtener_permisos_por_rol",
        fake_permisos,
    )

    with pytest.raises(HTTPException) as exc:
        await requerir_permiso_biometria(_FakeDb(), SimpleNamespace(rol="usuario"))

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_requerir_permiso_biometria_permite_permiso(monkeypatch):
    async def fake_permisos(db, rol):
        return ["biometria"]

    monkeypatch.setattr(
        "app.api.biometria.biometria_router.ServicioAuth.obtener_permisos_por_rol",
        fake_permisos,
    )
    usuario = SimpleNamespace(rol="usuario")

    assert await requerir_permiso_biometria(_FakeDb(), usuario) is usuario
