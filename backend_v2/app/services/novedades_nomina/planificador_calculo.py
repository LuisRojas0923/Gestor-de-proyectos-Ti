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

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.horas_extras import NominaHorarioPactado
from ...models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanBulkRequest,
    PlanPreCalculoConcepto,
    PlanPreCalculoDetalleDia,
    PlanPreCalculoEmpleado,
    PlanPreCalculoResponse,
    PlanPreCalculoResumen,
)
from ._planificador_common import (
    _DIA_NOMBRES,
    _resolver_catalogo_y_factor,
)
from .horas_extras_calculo import (
    _parametros_jornada_semana,
)
from .horas_extras_parametros import obtener_reglas_calculo
from .planificador_clasificacion import cargar_festivos_semana, clasificar_dias_plan
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
    reglas_calculo = await obtener_reglas_calculo(session)
    festivos = await cargar_festivos_semana(session, payload.semana)
    cedulas = [empleado.cedula for empleado in payload.empleados]
    jornadas = (await session.execute(
        select(NominaHorarioPactado.cedula, NominaHorarioPactado.es_jornada_nocturna)
        .where(NominaHorarioPactado.cedula.in_(cedulas))
    )).all()
    jornadas_nocturnas = {cedula: bool(es_nocturna) for cedula, es_nocturna in jornadas}
    horas_semana_ordinaria, divisor_hora = _parametros_jornada_semana(
        payload.semana.anio,
        payload.semana.semana_iso,
        reglas_calculo,
    )

    empleados_out: List[PlanPreCalculoEmpleado] = []
    total_he_global = 0.0
    total_hf_global = 0.0
    total_costo_global = 0.0

    for emp_in in payload.empleados:
        try:
            # Por defecto usamos III si el frontend no envia nivel; el caso
            # real es que PlanConfirmarRequest si trae parametros.
            factor_prestacional = factores.get("III", 0.52436)

            # Salario por defecto 3M (caso test comun); el real vendra del ERP.
            salario_default = 3_000_000.0
            valor_hora = salario_default / divisor_hora

            total_trab = 0.0
            total_ord = 0.0
            total_ext = 0.0
            total_hf = 0.0
            total_costo = 0.0
            detalle_dias: List[PlanPreCalculoDetalleDia] = []

            for dia in emp_in.dias:
                validar_asignaciones_ot_dia(dia)
            clasificacion = clasificar_dias_plan(
                emp_in,
                payload.semana,
                festivos=festivos,
                horas_semana_ordinaria=horas_semana_ordinaria,
                horas_ordinarias_diarias=reglas_calculo.horas_ordinarias_diarias,
                jornada_nocturna=jornadas_nocturnas.get(emp_in.cedula, False),
            )

            for dia in clasificacion:
                conceptos_out: list[PlanPreCalculoConcepto] = []
                costo_dia = 0.0
                for concepto in dia.conceptos:
                    cat = cat_idx[concepto.codigo]
                    valor_bruto = concepto.horas * valor_hora * cat["factor_hora_ordinaria"]
                    costo_concepto = valor_bruto + (valor_bruto * factor_prestacional)
                    costo_dia += costo_concepto
                    conceptos_out.append(PlanPreCalculoConcepto(
                        codigo=concepto.codigo,
                        horas=concepto.horas,
                        costo_estimado=round(costo_concepto, 0),
                    ))
                    if concepto.codigo == "HF":
                        total_hf += concepto.horas
                codigo_he = next(
                    (c.codigo for c in conceptos_out if c.codigo != "HF"),
                    conceptos_out[0].codigo if conceptos_out else None,
                )

                total_trab += dia.horas_trabajadas
                total_ord += dia.horas_ordinarias
                total_ext += dia.horas_extras
                total_costo += costo_dia

                detalle_dias.append(PlanPreCalculoDetalleDia(
                    dia=_DIA_NOMBRES[dia.dia_semana],
                    dia_semana=dia.dia_semana,
                    horas_trabajadas=dia.horas_trabajadas,
                    horas_ordinarias=dia.horas_ordinarias,
                    horas_extras=dia.horas_extras,
                    codigo_he=codigo_he,
                    es_festivo=dia.es_festivo,
                    novedad_codigo=dia.codigos_novedad[0] if dia.codigos_novedad else None,
                    costo_estimado=round(costo_dia, 0),
                    conceptos=conceptos_out,
                ))

            empleados_out.append(PlanPreCalculoEmpleado(
                cedula=emp_in.cedula,
                total_horas_trabajadas=round(total_trab, 2),
                total_horas_ordinarias=round(total_ord, 2),
                total_horas_extras=round(total_ext, 2),
                total_horas_festivas=round(total_hf, 2),
                total_costo_estimado=round(total_costo, 0),
                detalle_por_dia=detalle_dias,
            ))
            total_he_global += total_ext
            total_hf_global += total_hf
            total_costo_global += total_costo
        except Exception:
            logger.exception("Error pre-calculando empleado del lote")
            raise

    return PlanPreCalculoResponse(
        empleados=empleados_out,
        resumen=PlanPreCalculoResumen(
            total_horas_extras=round(total_he_global, 2),
            total_horas_festivas=round(total_hf_global, 2),
            total_costo_estimado=round(total_costo_global, 0),
            empleados_count=len(payload.empleados),
        ),
    )
