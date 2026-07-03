from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.biometria.biometria_service import BiometriaService


class _FakeResult:
    def __init__(self, value=None):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _FakeDbSinPerfil:
    async def execute(self, *args, **kwargs):
        return _FakeResult(None)


class _FakeImage:
    filename = "foto.jpg"
    content_type = "image/jpeg"

    async def read(self):
        return b"imagen"


class _EngineNoDebeLlamarse:
    async def representar(self, *args, **kwargs):
        raise AssertionError("No debe llamar el motor sin embedding enrolado")


@pytest.mark.asyncio
async def test_asistencia_sin_embedding_devuelve_404_antes_del_motor():
    service = BiometriaService(engine_client=_EngineNoDebeLlamarse())
    usuario = SimpleNamespace(id="USR-1", rol="usuario")

    with pytest.raises(HTTPException) as exc:
        await service.marcar_asistencia(_FakeDbSinPerfil(), usuario, _FakeImage(), 1.0, 1.0)

    assert exc.value.status_code == 404


def test_filename_rechaza_traversal():
    with pytest.raises(HTTPException) as exc:
        BiometriaService._validar_filename("../secreto.jpg")

    assert exc.value.status_code == 400


def test_filename_motor_no_incluye_identidad_usuario():
    assert BiometriaService._filename_motor("image/jpeg") == "captura.jpg"
    assert BiometriaService._filename_motor("image/png") == "captura.png"


def test_comparar_embeddings_match():
    distance, confidence, match = BiometriaService._comparar_embeddings([1.0, 0.0], [1.0, 0.0])

    assert distance == pytest.approx(0.0)
    assert confidence == 100.0
    assert match is True
