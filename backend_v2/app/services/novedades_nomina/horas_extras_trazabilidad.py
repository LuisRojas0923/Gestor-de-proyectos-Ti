"""Persistencia y lectura del snapshot diario de cálculos HE."""
from datetime import date
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from ...models.novedades_nomina.schemas_horas_extras_trazabilidad import CalculoDiarioDetalleIn
from .horas_extras_calculo import _calcular_horas_extras_semanales, _parametros_jornada_semana
from .horas_extras_parametros import obtener_reglas_calculo
from .planificador_costos_ot import (
    _asignaciones_con_peso,
    _calcular_importes_concepto,
    _distribuir_horas_con_residuo,
    _distribuir_valor_con_residuo,
    _ot_id_desde_orden,
)
from .snapshot_integridad import calcular_hash_snapshot


CODIGOS_HE = {"HED", "HEN", "HEFD", "HEFN"}
CODIGOS_RECARGO = {"HF", "RN", "RF"}


def _normalizar_detalle_diario(detalles: Iterable[CalculoDiarioDetalleIn]) -> list[CalculoDiarioDetalleIn]:
    normalizados = list(detalles or [])
    if not normalizados:
        return []
    dias = {d.dia_semana for d in normalizados}
    if dias != set(range(1, 8)):
        raise ValueError("detalle_diario debe cubrir exactamente los 7 días de la semana")
    return sorted(normalizados, key=lambda d: (d.dia_semana, d.codigo_calculado or ""))


def _codigo_extra(codigos: list[str], nocturna: bool) -> str:
    return next((c for c in codigos if c in CODIGOS_HE), "HEN" if nocturna else "HED")


def _factor_por_codigo(resultado) -> dict[str, float]:
    return {d.codigo_novedad: d.factor_hora_ordinaria for d in resultado.detalles}


def _agregar_concepto(
    filas: list[CalculoDiarioDetalleIn],
    *,
    base: dict,
    codigo: str | None,
    horas: float | None,
    factor: float | None,
    valor_hora: float,
    factor_prestacional: float,
    importes: tuple[float, float, float] | None = None,
) -> None:
    if importes is None:
        importes = (
            (0.0, 0.0, 0.0)
            if not codigo or not horas or factor is None
            else _calcular_importes_concepto(
                horas, valor_hora, factor, factor_prestacional
            )
        )
    valor_bruto, carga, costo_total = importes
    filas.append(CalculoDiarioDetalleIn(
        **base,
        codigo_calculado=codigo,
        horas_concepto=round(horas, 2) if horas is not None else None,
        factor_hora_ordinaria=factor,
        valor_bruto=valor_bruto,
        carga_prestacional=carga,
        costo_total=costo_total,
    ))


async def construir_detalle_diario_preliquidacion(session: AsyncSession, input_data, resultado) -> list[CalculoDiarioDetalleIn]:
    reglas = await obtener_reglas_calculo(session)
    horas_semana, _divisor = _parametros_jornada_semana(input_data.anio, input_data.semana_iso, reglas)
    extras_por_dia = _calcular_horas_extras_semanales(
        input_data.horas_por_dia,
        horas_semana,
        reglas.horas_ordinarias_diarias,
    )
    factor_map = _factor_por_codigo(resultado)
    registros = sorted(input_data.registro_diario or [], key=lambda r: r.dia_semana)
    registros_idx = {r.dia_semana: r for r in registros}
    codigos_por_dia = input_data.codigos_por_dia or [[] for _ in range(7)]
    filas: list[CalculoDiarioDetalleIn] = []

    for idx in range(7):
        dia_semana = idx + 1
        fecha = date.fromisocalendar(input_data.anio, input_data.semana_iso, dia_semana)
        horas_trab = round(float(input_data.horas_por_dia[idx]), 2)
        horas_ext = round(float(extras_por_dia[idx]), 2)
        horas_ord = round(max(0.0, horas_trab - horas_ext), 2)
        codigos = codigos_por_dia[idx] if idx < len(codigos_por_dia) else []
        registro = registros_idx.get(dia_semana)
        base = {
            "fecha": fecha,
            "dia_semana": dia_semana,
            "hora_entrada": getattr(registro, "hora_entrada", None),
            "hora_salida": getattr(registro, "hora_salida", None),
            "minutos_almuerzo": getattr(registro, "minutos_almuerzo", 0),
            "cruza_medianoche": getattr(registro, "cruza_medianoche", False),
            "horas_trabajadas": horas_trab,
            "horas_ordinarias": horas_ord,
            "horas_extras": horas_ext,
            "es_festivo": any(c in {"HF", "HEFD", "HEFN"} for c in codigos),
            "es_domingo": dia_semana == 7,
            "es_jornada_nocturna": input_data.es_jornada_nocturna,
            "novedad_codigo": next((c for c in codigos if c not in CODIGOS_HE | CODIGOS_RECARGO), None),
            "fuente_horario": "PLANIFICADOR" if registro else "MANUAL",
            "ot_id": input_data.ot_id,
            "ot_codigo": input_data.ot_codigo,
        }
        agrego = False
        if "HF" in codigos and horas_ord > 0:
            _agregar_concepto(filas, base=base, codigo="HF", horas=horas_ord, factor=factor_map.get("HF"), valor_hora=resultado.valor_hora_ordinaria, factor_prestacional=resultado.factor_prestacional)
            agrego = True
        if horas_ext > 0:
            codigo = _codigo_extra(codigos, input_data.es_jornada_nocturna)
            _agregar_concepto(filas, base=base, codigo=codigo, horas=horas_ext, factor=factor_map.get(codigo), valor_hora=resultado.valor_hora_ordinaria, factor_prestacional=resultado.factor_prestacional)
            agrego = True
        if not agrego:
            _agregar_concepto(filas, base=base, codigo=None, horas=None, factor=None, valor_hora=resultado.valor_hora_ordinaria, factor_prestacional=resultado.factor_prestacional)
    return filas


async def construir_detalle_diario_planificador(
    emp_in,
    parametros,
    detalles_agregados,
    clasificacion,
) -> list[CalculoDiarioDetalleIn]:
    factor_map = {d.codigo_novedad: d.factor_hora_ordinaria for d in detalles_agregados}
    filas: list[CalculoDiarioDetalleIn] = []
    for calculado in clasificacion:
        dia = calculado.dia
        base = {
            "fecha": calculado.fecha,
            "dia_semana": calculado.dia_semana,
            "hora_entrada": getattr(dia, "hora_entrada", None),
            "hora_salida": getattr(dia, "hora_salida", None),
            "minutos_almuerzo": getattr(dia, "minutos_almuerzo", 0),
            "cruza_medianoche": getattr(dia, "cruza_medianoche", False),
            "horas_trabajadas": calculado.horas_trabajadas,
            "horas_ordinarias": calculado.horas_ordinarias,
            "horas_extras": calculado.horas_extras,
            "es_festivo": calculado.es_festivo,
            "es_domingo": calculado.dia_semana == 7,
            "es_jornada_nocturna": bool(parametros.jornada_nocturna),
            "novedad_codigo": calculado.codigos_novedad[0] if calculado.codigos_novedad else None,
            "fuente_horario": "PLANIFICADOR",
            "ot_id": parametros.ot_id,
            "ot_codigo": parametros.ot_codigo,
            "observaciones": getattr(dia, "actividad", None),
        }
        if calculado.conceptos:
            for concepto in calculado.conceptos:
                asignaciones = _asignaciones_con_peso(
                    dia.asignaciones_ot if dia else []
                )
                horas_ot = _distribuir_horas_con_residuo(
                    concepto.horas,
                    asignaciones,
                )
                if asignaciones and horas_ot:
                    factor = factor_map.get(concepto.codigo)
                    importes_totales = _calcular_importes_concepto(
                        concepto.horas,
                        parametros.valor_hora_ordinaria,
                        factor,
                        parametros.factor_prestacional,
                    )
                    importes_ot = [
                        _distribuir_valor_con_residuo(
                            total, asignaciones, decimales=0
                        )
                        for total in importes_totales
                    ]
                    for idx, (asignacion, horas) in enumerate(zip(asignaciones, horas_ot)):
                        _agregar_concepto(
                            filas,
                            base={
                                **base,
                                "ot_id": _ot_id_desde_orden(asignacion.orden),
                                "ot_codigo": asignacion.orden,
                            },
                            codigo=concepto.codigo,
                            horas=horas,
                            factor=factor,
                            valor_hora=parametros.valor_hora_ordinaria,
                            factor_prestacional=parametros.factor_prestacional,
                            importes=tuple(valores[idx] for valores in importes_ot),
                        )
                else:
                    _agregar_concepto(
                        filas,
                        base=base,
                        codigo=concepto.codigo,
                        horas=concepto.horas,
                        factor=factor_map.get(concepto.codigo),
                        valor_hora=parametros.valor_hora_ordinaria,
                        factor_prestacional=parametros.factor_prestacional,
                    )
        else:
            _agregar_concepto(
                filas,
                base=base,
                codigo=None,
                horas=None,
                factor=None,
                valor_hora=parametros.valor_hora_ordinaria,
                factor_prestacional=parametros.factor_prestacional,
            )
    return filas


async def persistir_detalle_diario(
    session: AsyncSession,
    *,
    calculo_id: int,
    cedula: str,
    anio: int,
    semana_iso: int,
    detalles: Iterable[CalculoDiarioDetalleIn],
    creado_por: str | None,
) -> None:
    normalizados = _normalizar_detalle_diario(detalles)
    for d in normalizados:
        base = d.model_dump()
        base.update({
            "calculo_id": calculo_id,
            "cedula": cedula,
            "anio": anio,
            "semana_iso": semana_iso,
        })
        session.add(NominaCalculoDiarioDetalle(
            **base,
            creado_por=creado_por,
            hash_snapshot=calcular_hash_snapshot(base),
        ))


async def cargar_detalle_diario(session: AsyncSession, calculo_id: int) -> tuple[str, list[NominaCalculoDiarioDetalle]]:
    detalles = list((await session.execute(
        select(NominaCalculoDiarioDetalle)
        .where(NominaCalculoDiarioDetalle.calculo_id == calculo_id)
        .order_by(NominaCalculoDiarioDetalle.dia_semana, NominaCalculoDiarioDetalle.codigo_calculado)
    )).scalars().all())
    if not detalles:
        return "HISTORICO_SIN_SNAPSHOT", []
    dias = {d.dia_semana for d in detalles}
    if dias != set(range(1, 8)):
        return "INCOMPLETO", detalles
    return "DISPONIBLE", detalles
