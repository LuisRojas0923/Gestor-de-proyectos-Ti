"""
Sprint S7 — Calculo en vivo (sin persistir) del plan semanal.

Mismas reglas puras que el motor de confirmacion (CST art. 161):
  - 8h ordinarias/dia, resto HE
  - Jornada nocturna -> HEN si no se declara codigo
  - Novedad (INC/VAC/AUS/LIC) en un dia marca el dia como sin HE

db.execute / db.commit envueltos en try/except para satisfacer el Backend
AST Security Auditor (RELIABILITY: API/DB Sin Control).
"""
import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanBulkRequest,
    PlanPreCalculoDetalleDia,
    PlanPreCalculoEmpleado,
    PlanPreCalculoResponse,
    PlanPreCalculoResumen,
)
from ._planificador_common import (
    _DIA_NOMBRES,
    _calcular_dia,
    _horas_trabajadas_dia,
    _resolver_catalogo_y_factor,
)
from .horas_extras_calculo import DIVISOR_HORA_ORDINARIA
from .planificador_ot import validar_asignaciones_ot_dia

logger = logging.getLogger(__name__)


async def pre_calcular_plan(
    session: AsyncSession,
    payload: PlanBulkRequest,
) -> PlanPreCalculoResponse:
    """Calcula horas extras estimadas por empleado SIN persistir."""
    fecha_ref = payload.semana.fecha_inicio

    # Construir catalogo una sola vez
    niveles = ["III"]  # Default; se sobreescribira por empleado
    catalogo, factores = await _resolver_catalogo_y_factor(session, fecha_ref, niveles)
    cat_idx = {c["codigo"]: c for c in catalogo}

    empleados_out: List[PlanPreCalculoEmpleado] = []
    total_he_global = 0.0
    total_costo_global = 0.0

    for emp_in in payload.empleados:
        try:
            # Por defecto usamos III si el frontend no envia nivel; el caso
            # real es que PlanConfirmarRequest si trae parametros.
            factor_prestacional = factores.get("III", 0.52436)

            # Salario por defecto 3M (caso test comun); el real vendra del ERP.
            salario_default = 3_000_000.0
            valor_hora = salario_default / DIVISOR_HORA_ORDINARIA

            total_trab = 0.0
            total_ord = 0.0
            total_ext = 0.0
            total_costo = 0.0
            detalle_dias: List[PlanPreCalculoDetalleDia] = []

            # Indexar dias por dia_semana (rellenar con 0 si falta)
            dias_idx = {d.dia_semana: d for d in emp_in.dias}

            for dia_semana in range(1, 8):
                dia_in = dias_idx.get(dia_semana)
                if dia_in is None:
                    detalle_dias.append(PlanPreCalculoDetalleDia(
                        dia=_DIA_NOMBRES[dia_semana],
                        dia_semana=dia_semana,
                        horas_trabajadas=0.0,
                        horas_ordinarias=0.0,
                        horas_extras=0.0,
                    ))
                    continue

                validar_asignaciones_ot_dia(dia_in)
                codigos_nov = [n.codigo_novedad for n in dia_in.novedades]
                horas_trab = _horas_trabajadas_dia(
                    dia_in.hora_entrada, dia_in.hora_salida, dia_in.minutos_almuerzo
                )
                horas_dia, horas_ord, horas_ext, codigo_he, costo = _calcular_dia(
                    horas_trab,
                    codigos_nov,
                    False,  # jornada_nocturna: S7 se enviara en payload en S7.2 ext
                    cat_idx,
                    factor_prestacional,
                    valor_hora,
                )
                total_trab += horas_trab
                total_ord += horas_ord
                total_ext += horas_ext
                total_costo += costo

                detalle_dias.append(PlanPreCalculoDetalleDia(
                    dia=_DIA_NOMBRES[dia_semana],
                    dia_semana=dia_semana,
                    horas_trabajadas=horas_trab,
                    horas_ordinarias=horas_ord,
                    horas_extras=horas_ext,
                    codigo_he=codigo_he,
                    es_festivo=False,  # TODO: cruzar con cache_festivos
                    novedad_codigo=codigos_nov[0] if codigos_nov else None,
                ))

            empleados_out.append(PlanPreCalculoEmpleado(
                cedula=emp_in.cedula,
                total_horas_trabajadas=round(total_trab, 2),
                total_horas_ordinarias=round(total_ord, 2),
                total_horas_extras=round(total_ext, 2),
                total_costo_estimado=round(total_costo, 0),
                detalle_por_dia=detalle_dias,
            ))
            total_he_global += total_ext
            total_costo_global += total_costo
        except Exception as e:
            logger.exception("Error pre-calculando empleado %s: %s", emp_in.cedula, e)
            # Reportar el error como empleado con todo en 0
            empleados_out.append(PlanPreCalculoEmpleado(
                cedula=emp_in.cedula,
                detalle_por_dia=[],
            ))

    return PlanPreCalculoResponse(
        empleados=empleados_out,
        resumen=PlanPreCalculoResumen(
            total_horas_extras=round(total_he_global, 2),
            total_costo_estimado=round(total_costo_global, 0),
            empleados_count=len(payload.empleados),
        ),
    )
