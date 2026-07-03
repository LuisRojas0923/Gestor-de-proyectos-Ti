import pytest
from fastapi import HTTPException

from app.services.biometria.biometria_engine_client import (
    BiometriaEngineClient,
    BiometriaEngineConfig,
    RepresentacionFacial,
)


def _config() -> BiometriaEngineConfig:
    return BiometriaEngineConfig(
        url="http://engine",
        token="",
        timeout_seconds=1,
        expected_model="Facenet",
        expected_detector="opencv",
        environment="development",
    )


class _FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {
            "embedding": [1.0, 0.0],
            "embedding_size": 2,
            "is_real": True,
            "detector_backend": "opencv",
            "model_name": "Facenet",
        }

    def json(self):
        return self._payload


class _FakeAsyncClient:
    response = _FakeResponse()

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, *args, **kwargs):
        return self.response


@pytest.mark.asyncio
async def test_representar_devuelve_embedding_valido(monkeypatch):
    monkeypatch.setattr("app.services.biometria.biometria_engine_client.httpx.AsyncClient", _FakeAsyncClient)
    _FakeAsyncClient.response = _FakeResponse()

    result = await BiometriaEngineClient(_config()).representar(b"img", "foto.jpg", "image/jpeg")

    assert result.embedding == [1.0, 0.0]
    assert result.embedding_size == 2


@pytest.mark.asyncio
async def test_token_interno_invalido_se_sanea_como_503(monkeypatch):
    monkeypatch.setattr("app.services.biometria.biometria_engine_client.httpx.AsyncClient", _FakeAsyncClient)
    _FakeAsyncClient.response = _FakeResponse(status_code=401)

    with pytest.raises(HTTPException) as exc:
        await BiometriaEngineClient(_config()).representar(b"img", "foto.jpg", "image/jpeg")

    assert exc.value.status_code == 503


def test_rechaza_embedding_invalido_por_nan():
    client = BiometriaEngineClient(_config())

    with pytest.raises(HTTPException) as exc:
        client._validar_representacion(
            RepresentacionFacial(
                embedding=[float("nan")],
                embedding_size=1,
                detector_backend="opencv",
                model_name="Facenet",
            )
        )

    assert exc.value.status_code == 503


def test_rechaza_modelo_inesperado():
    client = BiometriaEngineClient(_config())

    with pytest.raises(HTTPException):
        client._validar_representacion(
            RepresentacionFacial(
                embedding=[1.0],
                embedding_size=1,
                detector_backend="opencv",
                model_name="Facenet512",
            )
        )
