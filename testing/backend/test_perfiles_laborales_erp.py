from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.models.auth.sincronizacion_perfil import EstadoPerfilERP
from app.services.erp.perfiles_laborales_service import consultar_perfiles_laborales_worker


class _ResultadoFilas:
    def __init__(self, filas):
        self._filas = filas

    def mappings(self):
        return self._filas


class _SesionERP:
    def __init__(self, filas):
        self.filas = filas
        self.rollback_llamado = False
        self.close_llamado = False

    def execute(self, statement, params=None):
        sql = str(statement)
        if "current_database" in sql:
            return SimpleNamespace(one=lambda: ("solidpruebas3", "on"))
        if "FROM establecimiento" in sql:
            return _ResultadoFilas(self.filas)
        return SimpleNamespace()

    def rollback(self):
        self.rollback_llamado = True

    def close(self):
        self.close_llamado = True


def test_conexion_erp_lectura_no_reutiliza_credencial_general():
    from app.database import _resolver_url_erp_lectura

    with patch("app.database.config.erp_read_database_url", None), patch(
        "app.database.config.erp_database_url",
        "postgresql://usuario_escritura@erp:5432/solidpruebas3",
    ):
        with pytest.raises(RuntimeError, match="ERP_READ_DATABASE_URL"):
            _resolver_url_erp_lectura()


@pytest.mark.parametrize(
    ("entorno", "url", "esperada"),
    [
        ("development", "postgresql://read@erp:5432/solidpruebas3", "solidpruebas3"),
        ("production", "postgresql://read@erp:5432/solid", "solid"),
    ],
)
def test_conexion_erp_lectura_respeta_fuente_por_entorno(entorno, url, esperada):
    from app.database import _resolver_url_erp_lectura

    with patch("app.database.config.environment", entorno), patch(
        "app.database.config.erp_read_database_url", url
    ), patch("app.database.config.erp_read_expected_database", esperada):
        assert _resolver_url_erp_lectura() == url


@pytest.mark.parametrize(
    ("entorno", "url", "esperada"),
    [
        ("development", "postgresql://read@erp:5432/solid", "solid"),
        ("production", "postgresql://read@erp:5432/solidpruebas3", "solidpruebas3"),
        ("development", "postgresql://read@erp:5432/solidpruebas3", "solid"),
    ],
)
def test_conexion_erp_lectura_rechaza_fuente_cruzada(entorno, url, esperada):
    from app.database import _resolver_url_erp_lectura

    with patch("app.database.config.environment", entorno), patch(
        "app.database.config.erp_read_database_url", url
    ), patch("app.database.config.erp_read_expected_database", esperada):
        with pytest.raises(RuntimeError, match="no esta autorizada"):
            _resolver_url_erp_lectura()


def test_worker_distingue_no_encontrado_y_sin_contrato_y_cierra_sesion():
    sesion = _SesionERP([
        {
            "cedula": "1000000001",
            "nombre": "USUARIO TEST",
            "viaticante": "N",
            "baseviaticos": 0,
            "correo": None,
            "cargo": None,
            "area": None,
            "sede": None,
            "centrocosto": None,
            "cantidad_activos": 0,
        }
    ])

    with patch(
        "app.services.erp.perfiles_laborales_service.SessionErpLectura",
        return_value=sesion,
    ), patch(
        "app.services.erp.perfiles_laborales_service.config.erp_read_expected_database",
        "solidpruebas3",
    ):
        resultado = consultar_perfiles_laborales_worker(
            ["1000000001", "1000000002"]
        )

    assert resultado["1000000001"].estado == EstadoPerfilERP.SIN_CONTRATO_ACTIVO
    assert resultado["1000000002"].estado == EstadoPerfilERP.NO_ENCONTRADO
    assert sesion.rollback_llamado is True
    assert sesion.close_llamado is True


def test_worker_rechaza_lotes_mayores_a_cien_sin_abrir_sesion():
    with patch(
        "app.services.erp.perfiles_laborales_service.SessionErpLectura"
    ) as session_factory:
        with pytest.raises(ValueError, match="100"):
            consultar_perfiles_laborales_worker(
                [str(numero) for numero in range(101)]
            )
    session_factory.assert_not_called()


@pytest.mark.erp_postgres_integration
def test_worker_postgres_aislado_es_read_only_y_selecciona_contrato_vigente():
    from sqlalchemy import text
    from sqlalchemy.exc import DBAPIError

    from app.database import SessionErpLectura

    resultado = consultar_perfiles_laborales_worker(["1000000001"])
    perfil = resultado["1000000001"]
    assert perfil.estado == EstadoPerfilERP.ENCONTRADO_ACTIVO
    assert perfil.perfil.cargo == "CARGO VIGENTE"

    sesion = SessionErpLectura()
    try:
        puede_actualizar = sesion.execute(
            text("SELECT has_table_privilege(current_user, 'establecimiento', 'UPDATE')")
        ).scalar_one()
        assert puede_actualizar is False
        sesion.execute(text("SET TRANSACTION READ ONLY"))
        with pytest.raises(DBAPIError):
            sesion.execute(text(
                "UPDATE establecimiento SET nombre = nombre WHERE nrocedula = '1000000001'"
            ))
    finally:
        sesion.rollback()
        sesion.close()
