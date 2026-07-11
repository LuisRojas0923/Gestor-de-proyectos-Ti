"""
Tests S9 — Reglas confirmadas por Gestion Humana/Nomina.

Cobertura:
  - Jornada ordinaria semanal 42h y divisor 210 desde 2026-07-16.
  - Revision semanal con compensacion entre dias.
  - Franja nocturna operativa 19:00-06:00 cuando se infiere HEN.
  - Turnos que cruzan medianoche usan el flag explicito del contrato semanal.
"""
from datetime import time

import pytest

from app.models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionInput,
    RegistroDiarioInput,
)
from app.services.novedades_nomina.horas_extras_calculo import (
    DIVISOR_HORA_ORDINARIA_VIGENTE,
    HORAS_ORDINARIAS_SEMANALES_VIGENTE,
    HORA_NOCTURNA_FIN,
    HORA_NOCTURNA_INICIO,
    calcular_pre_liquidacion,
)
from app.services.novedades_nomina.horas_extras_service import _aplicar_registro_diario


CATALOGO_TEST = [
    {"codigo": "HED", "factor_hora_ordinaria": 1.25, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    {"codigo": "HEN", "factor_hora_ordinaria": 1.75, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
]
FACTOR_PRESTACIONAL = 0.52436


def _input(horas_por_dia, **overrides):
    base = {
        "cedula": "TEST-S9-1107068093",
        "anio": 2026,
        "semana_iso": 30,
        "horas_por_dia": horas_por_dia,
        "salario_base_mensual": 3_000_000,
        "nivel_riesgo_arl": "III",
    }
    base.update(overrides)
    return PreLiquidacionInput(**base)


def test_desde_julio_2026_usa_jornada_42_y_divisor_210():
    horas = [9.0, 9.0, 9.0, 9.0, 9.0, 0.0, 0.0]

    resultado = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_PRESTACIONAL)

    assert HORAS_ORDINARIAS_SEMANALES_VIGENTE == 42
    assert DIVISOR_HORA_ORDINARIA_VIGENTE == 210
    assert resultado.valor_hora_ordinaria == pytest.approx(3_000_000 / 210)
    assert resultado.total_horas_extras == 3.0
    assert resultado.detalles[0].codigo_novedad == "HED"


def test_compensa_horas_dentro_de_la_misma_semana_si_no_supera_42h():
    horas = [7.0, 9.0, 8.0, 8.0, 8.0, 2.0, 0.0]

    resultado = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_PRESTACIONAL)

    assert sum(horas) == 42.0
    assert resultado.total_horas_extras == 0.0
    assert resultado.detalles == []


def test_jornada_nocturna_confirmada_infiere_hen_con_franja_19_a_6():
    horas = [9.0, 9.0, 9.0, 9.0, 9.0, 0.0, 0.0]

    resultado = calcular_pre_liquidacion(
        _input(horas, es_jornada_nocturna=True), CATALOGO_TEST, FACTOR_PRESTACIONAL
    )

    assert HORA_NOCTURNA_INICIO == 19
    assert HORA_NOCTURNA_FIN == 6
    assert resultado.total_horas_extras == 3.0
    assert resultado.detalles[0].codigo_novedad == "HEN"


def test_turno_que_cruza_medianoche_se_calcula_con_flag_explicito():
    entrada_salida = [
        RegistroDiarioInput(dia_semana=1, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=60),
        RegistroDiarioInput(dia_semana=2, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=60),
        RegistroDiarioInput(
            dia_semana=3,
            hora_entrada=time(19, 0),
            hora_salida=time(6, 0),
            minutos_almuerzo=0,
            cruza_medianoche=True,
        ),
        RegistroDiarioInput(dia_semana=4, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=60),
        RegistroDiarioInput(dia_semana=5, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=60),
        RegistroDiarioInput(dia_semana=6, hora_entrada=None, hora_salida=None, minutos_almuerzo=0),
        RegistroDiarioInput(dia_semana=7, hora_entrada=None, hora_salida=None, minutos_almuerzo=0),
    ]
    payload = _input([0.0] * 7, registro_diario=entrada_salida)

    resultado = _aplicar_registro_diario(payload)

    assert resultado.horas_por_dia[2] == 11.0
