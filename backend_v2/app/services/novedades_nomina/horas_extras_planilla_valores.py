"""Proyección monetaria de planilla con salario vigente del ERP."""
from math import isfinite

from .horas_extras_calculo import _parametros_jornada_semana


class SalarioErpInvalidoError(ValueError):
    pass


class ReglaCalculoInvalidaError(ValueError):
    pass


class FactorCalculoInvalidoError(ValueError):
    pass


def _salario_y_base_hora_erp(calculo, empleado: dict, reglas=None) -> tuple[float, float]:
    salario = empleado.get("salario_base_mensual")
    try:
        salario = float(salario)
    except (TypeError, ValueError) as exc:
        raise SalarioErpInvalidoError("Empleado sin salario base mensual vigente en ERP") from exc
    if not isfinite(salario) or salario <= 0:
        raise SalarioErpInvalidoError("Empleado sin salario base mensual vigente en ERP")
    _horas_semana, divisor_hora = _parametros_jornada_semana(
        calculo.anio,
        calculo.semana_iso,
        reglas,
    )
    if not isfinite(divisor_hora) or divisor_hora <= 0:
        raise ReglaCalculoInvalidaError("divisor de hora ordinaria inválido")
    return salario, salario / divisor_hora


def _costo_con_salario_erp(calculo, empleado, horas, factor_hora, reglas=None) -> float:
    _salario, base_hora = _salario_y_base_hora_erp(calculo, empleado, reglas)
    try:
        factor_hora = float(factor_hora)
        factor_prestacional = float(calculo.factor_prestacional)
    except (AttributeError, TypeError, ValueError) as exc:
        raise FactorCalculoInvalidoError("factor de hora ordinaria inválido") from exc
    if (
        not isfinite(factor_hora)
        or factor_hora <= 0
        or not isfinite(factor_prestacional)
        or factor_prestacional < 0
    ):
        raise FactorCalculoInvalidoError("factor de hora ordinaria inválido")
    return (
        float(horas or 0)
        * base_hora
        * factor_hora
        * (1 + factor_prestacional)
    )
