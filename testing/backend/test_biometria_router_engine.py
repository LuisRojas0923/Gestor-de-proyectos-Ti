from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.biometria.biometria_router import obtener_estado_biometrico, requerir_permiso_biometria


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


@pytest.mark.asyncio
async def test_obtener_estado_biometrico_delega_en_servicio():
    usuario = SimpleNamespace(id="USR-1")
    db = _FakeDb()

    class _FakeService:
        async def obtener_estado_biometrico(self, received_db, received_user):
            assert received_db is db
            assert received_user is usuario
            return {"enrolado": True, "fotoUrl": "/api/v2/biometria/foto/USR-1.jpg", "actualizadoEn": None}

    assert await obtener_estado_biometrico(usuario, db, _FakeService()) == {
        "enrolado": True,
        "fotoUrl": "/api/v2/biometria/foto/USR-1.jpg",
        "actualizadoEn": None,
    }
