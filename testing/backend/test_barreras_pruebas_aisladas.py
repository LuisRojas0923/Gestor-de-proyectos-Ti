import pytest


def test_marcador_mutante_exige_opt_in_explicito():
    from conftest import _validar_marcadores_aislados

    entorno = {
        "DATABASE_URL": "postgresql://runtime@db-test:5432/project_manager_test",
        "TEST_BASE_URL": "http://backend-test:8000/api/v2",
    }

    with pytest.raises(RuntimeError, match="ALLOW_MUTATING_TESTS"):
        _validar_marcadores_aislados({"mutating_integration"}, entorno)


def test_marcador_live_exige_backend_y_base_efimeros():
    from conftest import _validar_marcadores_aislados

    entorno = {
        "ALLOW_LIVE_INFRA_TESTS": "1",
        "DATABASE_URL": "postgresql://runtime@db:5432/project_manager",
        "TEST_BASE_URL": "http://backend:8000/api/v2",
    }

    with pytest.raises(RuntimeError, match="db-test/project_manager_test"):
        _validar_marcadores_aislados({"live_infrastructure"}, entorno)


def test_marcador_erp_exige_opt_in_y_destino_efimero():
    from conftest import _validar_marcadores_aislados

    entorno = {
        "ERP_READ_DATABASE_URL": (
            "postgresql://erp_read@erp-test:5432/solidpruebas3"
        ),
    }

    with pytest.raises(RuntimeError, match="ALLOW_ERP_TEST_DB"):
        _validar_marcadores_aislados({"erp_postgres_integration"}, entorno)


def test_entorno_aislado_impide_que_config_cargue_dotenv():
    from app.config import Configuracion
    from app.core.config import Settings

    assert Configuracion.Config.env_file is None
    assert Settings.model_config.get("env_file") is None
