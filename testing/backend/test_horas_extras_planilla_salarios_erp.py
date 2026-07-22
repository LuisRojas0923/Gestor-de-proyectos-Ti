from datetime import date
from math import inf, nan
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.services.erp import empleados_service as empleados_service_module
from app.services.erp.empleados_service import EmpleadosService
from app.services.novedades_nomina import horas_extras_planilla as planilla_module
from app.services.novedades_nomina.horas_extras_parametros import ReglasCalculoHorasExtras
from app.services.novedades_nomina.horas_extras_planilla import (
    _costo_con_salario_erp,
    _salario_y_base_hora_erp,
    listar_calculos_planilla,
)


def _calculo(semana_iso=23):
    return SimpleNamespace(id=772, cedula="80167661", anio=2026, semana_iso=semana_iso)


def _reglas(divisor_previo=220, divisor_vigente=210):
    return ReglasCalculoHorasExtras(
        fecha_vigencia_jornada_42=date(2026, 7, 16),
        horas_ordinarias_semanales_previas=44,
        horas_ordinarias_semanales_vigente=42,
        divisor_hora_ordinaria_previo=divisor_previo,
        divisor_hora_ordinaria_vigente=divisor_vigente,
        horas_ordinarias_diarias=8,
        max_he_diarias=2,
        max_he_semanales=12,
        max_he_anuales=480,
        hora_nocturna_inicio=19,
        hora_nocturna_fin=6,
    )


def test_base_hora_erp_respeta_divisor_configurable():
    salario, base_hora = _salario_y_base_hora_erp(
        _calculo(),
        {"salario_base_mensual": 3_300_000},
        _reglas(divisor_previo=200),
    )

    assert salario == 3_300_000
    assert base_hora == 16_500


def test_semana_que_cruza_vigencia_conserva_divisor_previo_y_siguiente_usa_vigente():
    empleado = {"salario_base_mensual": 4_620_000}

    _, base_semana_29 = _salario_y_base_hora_erp(_calculo(29), empleado, _reglas())
    _, base_semana_30 = _salario_y_base_hora_erp(_calculo(30), empleado, _reglas())

    assert base_semana_29 == 21_000
    assert base_semana_30 == 22_000


@pytest.mark.parametrize("salario", [None, 0, -1, "invalido", nan, inf])
def test_rechaza_salario_erp_ausente_invalido_o_no_finito(salario):
    with pytest.raises(ValueError, match="salario base mensual vigente en ERP"):
        _salario_y_base_hora_erp(
            _calculo(),
            {"salario_base_mensual": salario},
            _reglas(),
        )


@pytest.mark.parametrize("divisor", [0, nan, inf])
def test_rechaza_divisor_configurado_invalido_o_no_finito(divisor):
    with pytest.raises(ValueError, match="divisor de hora ordinaria"):
        _salario_y_base_hora_erp(
            _calculo(),
            {"salario_base_mensual": 3_300_000},
            _reglas(divisor_previo=divisor),
        )


def test_rechaza_factor_hora_ausente_en_lugar_de_generar_costo_cero():
    calculo = _calculo()
    calculo.factor_prestacional = 0.334

    with pytest.raises(ValueError, match="factor de hora ordinaria"):
        _costo_con_salario_erp(
            calculo,
            {"salario_base_mensual": 3_300_000},
            horas=2,
            factor_hora=None,
            reglas=_reglas(),
        )


def test_bulk_solo_incluye_salario_cuando_se_solicita_expresamente(monkeypatch):
    monkeypatch.setattr(empleados_service_module, "_existe_columna", lambda *_args: True)
    consultas = []

    def ejecutar(sentencia, _params):
        consultas.append(str(sentencia))
        return SimpleNamespace(fetchall=lambda: [SimpleNamespace(
            nrocedula="80167661",
            nombre="EMPLEADO ERP",
            estado="Activo",
            empresa="EMPRESA",
            ciudadcontratacion="CALI",
            quien_reporta="JEFE",
            autoriza_he=True,
            salario_base_mensual=3_300_000,
            beneficios_activos=1,
            contratos_activos=1,
        )])

    empleados = EmpleadosService.consultar_empleados_bulk(
        SimpleNamespace(execute=ejecutar),
        ["80167661"],
        incluir_datos_laborales=True,
        incluir_salario=True,
    )

    assert 'B.salario AS "salario_base_mensual"' in consultas[0]
    assert "AND B.estado = 'Activo'" in consultas[0]
    assert "AND C.estado = 'Activo'" in consultas[0]
    assert "COUNT(B.contrato) OVER" in consultas[0]
    assert empleados["80167661"]["salario_base_mensual"] == 3_300_000


def test_bulk_no_expone_salario_sin_bandera_explicita(monkeypatch):
    monkeypatch.setattr(empleados_service_module, "_existe_columna", lambda *_args: True)
    consultas = []

    def ejecutar(sentencia, _params):
        consultas.append(str(sentencia))
        return SimpleNamespace(fetchall=lambda: [SimpleNamespace(
            nrocedula="80167661",
            nombre="EMPLEADO ERP",
            estado="Activo",
            empresa="EMPRESA",
            ciudadcontratacion="CALI",
            quien_reporta="JEFE",
            autoriza_he=True,
        )])

    empleados = EmpleadosService.consultar_empleados_bulk(
        SimpleNamespace(execute=ejecutar),
        ["80167661"],
        incluir_datos_laborales=True,
    )

    assert 'B.salario AS "salario_base_mensual"' not in consultas[0]
    assert "salario_base_mensual" not in empleados["80167661"]


@pytest.mark.parametrize(
    ("beneficios_activos", "contratos_activos"),
    [(2, 1), (1, 2)],
)
def test_bulk_rechaza_multiples_contratos_o_beneficios_activos(
    monkeypatch,
    beneficios_activos,
    contratos_activos,
):
    monkeypatch.setattr(empleados_service_module, "_existe_columna", lambda *_args: True)
    row = SimpleNamespace(
        nrocedula="80167661",
        nombre="EMPLEADO ERP",
        estado="Activo",
        empresa="EMPRESA",
        ciudadcontratacion="CALI",
        quien_reporta="JEFE",
        autoriza_he=True,
        salario_base_mensual=3_300_000,
        beneficios_activos=beneficios_activos,
        contratos_activos=contratos_activos,
    )
    db_erp = SimpleNamespace(
        execute=lambda *_args: SimpleNamespace(fetchall=lambda: [row])
    )

    empleados = EmpleadosService.consultar_empleados_bulk(
        db_erp,
        ["80167661"],
        incluir_datos_laborales=True,
        incluir_salario=True,
    )

    assert empleados["80167661"]["salario_base_mensual"] is None


def test_bulk_reutiliza_una_unica_verificacion_de_estado_beneficio(monkeypatch):
    verificaciones_estado = 0

    def existe_columna(_db, tabla, columna):
        nonlocal verificaciones_estado
        if tabla == "beneficio" and columna == "estado":
            verificaciones_estado += 1
            return verificaciones_estado == 1
        return True

    monkeypatch.setattr(empleados_service_module, "_existe_columna", existe_columna)
    row = SimpleNamespace(
        nrocedula="80167661",
        nombre="EMPLEADO ERP",
        estado="Activo",
        empresa="EMPRESA",
        ciudadcontratacion="CALI",
        quien_reporta="JEFE",
        autoriza_he=True,
        salario_base_mensual=3_300_000,
        beneficios_activos=1,
        contratos_activos=1,
    )
    db_erp = SimpleNamespace(
        execute=lambda *_args: SimpleNamespace(fetchall=lambda: [row])
    )

    empleados = EmpleadosService.consultar_empleados_bulk(
        db_erp,
        ["80167661"],
        incluir_datos_laborales=True,
        incluir_salario=True,
    )

    assert verificaciones_estado == 1
    assert empleados["80167661"]["salario_base_mensual"] == 3_300_000


@pytest.mark.asyncio
async def test_servicio_rechaza_erp_ausente_o_con_error(monkeypatch):
    monkeypatch.setattr(planilla_module, "listar_calculos", AsyncMock(return_value=[_calculo()]))

    with pytest.raises(HTTPException) as ausente:
        await listar_calculos_planilla(SimpleNamespace(), db_erp=None)
    assert ausente.value.status_code == 503

    monkeypatch.setattr(
        EmpleadosService,
        "consultar_empleados_bulk_async",
        AsyncMock(side_effect=TimeoutError),
    )
    with pytest.raises(HTTPException) as error:
        await listar_calculos_planilla(SimpleNamespace(), db_erp=object())
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_servicio_rechaza_erp_ausente_aunque_no_haya_calculos(monkeypatch):
    listar = AsyncMock(return_value=[])
    monkeypatch.setattr(planilla_module, "listar_calculos", listar)

    with pytest.raises(HTTPException) as error:
        await listar_calculos_planilla(SimpleNamespace(), db_erp=None)

    assert error.value.status_code == 503
    listar.assert_not_awaited()


@pytest.mark.asyncio
async def test_servicio_rechaza_salario_erp_no_vigente(monkeypatch):
    monkeypatch.setattr(planilla_module, "listar_calculos", AsyncMock(return_value=[_calculo()]))
    monkeypatch.setattr(
        EmpleadosService,
        "consultar_empleados_bulk_async",
        AsyncMock(return_value={"80167661": {"salario_base_mensual": None}}),
    )
    monkeypatch.setattr(
        planilla_module,
        "obtener_reglas_calculo",
        AsyncMock(return_value=_reglas()),
    )

    with pytest.raises(HTTPException) as error:
        await listar_calculos_planilla(SimpleNamespace(), db_erp=object())

    assert error.value.status_code == 422
    assert error.value.detail == "Uno o más empleados no tienen salario base mensual vigente en ERP"
