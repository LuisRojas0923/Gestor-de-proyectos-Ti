"""Validaciones y helpers para asignaciones OT/CC del planificador."""
from typing import Tuple

from ...models.novedades_nomina.schemas_horas_extras_planificador import PlanDiaIn
from ._planificador_common import _horas_trabajadas_dia


def _clave_asignacion(dia: PlanDiaIn, idx: int) -> Tuple[str, str, str, str]:
    asignacion = dia.asignaciones_ot[idx]
    return (
        asignacion.orden.strip(),
        (asignacion.cc or "").strip(),
        (asignacion.scc or "").strip(),
        (asignacion.sub_indice or "").strip(),
    )


def validar_asignaciones_ot_dia(dia: PlanDiaIn) -> None:
    """Valida reparto OT de un dia: max 3, sin duplicados y horas coherentes."""
    asignaciones = dia.asignaciones_ot or []
    if len(asignaciones) > 3:
        raise ValueError("Un dia no puede tener mas de 3 OT/centros de costo")
    if not asignaciones:
        return

    claves = [_clave_asignacion(dia, idx) for idx in range(len(asignaciones))]
    if len(claves) != len(set(claves)):
        raise ValueError("No se puede repetir la misma OT/centro de costo en un dia")

    usa_horas = any(a.horas is not None for a in asignaciones)
    usa_porcentaje = any(a.porcentaje is not None for a in asignaciones)
    if usa_horas and usa_porcentaje:
        raise ValueError("No se puede mezclar reparto por horas y porcentaje en el mismo dia")

    if usa_porcentaje:
        total_porcentaje = sum(a.porcentaje or 0 for a in asignaciones)
        if round(total_porcentaje, 2) != 100.0:
            raise ValueError("La suma de porcentajes OT del dia debe ser 100")
        return

    if usa_horas:
        horas_trab = _horas_trabajadas_dia(
            dia.hora_entrada,
            dia.hora_salida,
            dia.minutos_almuerzo,
            dia.cruza_medianoche,
        )
        total_horas = sum(a.horas or 0 for a in asignaciones)
        if total_horas <= 0:
            raise ValueError("Las horas asignadas a OT deben ser mayores a 0")
        if total_horas - horas_trab > 0.01:
            raise ValueError("La suma de horas OT supera las horas trabajadas del dia")
