import pytest

from biometria_engine.app.config import EngineSettings
from biometria_engine.app.security import validar_token_interno_header


def test_engine_rechaza_token_invalido():
    settings = EngineSettings(biometria_engine_token="token-seguro", environment="production")

    with pytest.raises(Exception):
        validar_token_interno_header("Bearer incorrecto", settings)


def test_engine_rechaza_header_ausente():
    settings = EngineSettings(biometria_engine_token="token-seguro", environment="production")

    with pytest.raises(Exception):
        validar_token_interno_header(None, settings)


def test_engine_permite_token_valido():
    settings = EngineSettings(biometria_engine_token="token-seguro", environment="production")

    assert validar_token_interno_header("Bearer token-seguro", settings) is None


def test_engine_falla_inicio_sin_token_en_produccion():
    settings = EngineSettings(biometria_engine_token="", environment="production")

    with pytest.raises(RuntimeError):
        settings.validar_token_inicio()


def test_engine_falla_inicio_con_token_debil_en_produccion():
    settings = EngineSettings(biometria_engine_token="placeholder", environment="production")

    with pytest.raises(RuntimeError):
        settings.validar_token_inicio()


def test_engine_permite_sin_token_solo_local():
    settings = EngineSettings(biometria_engine_token="", environment="development")

    assert settings.validar_token_inicio() is None
