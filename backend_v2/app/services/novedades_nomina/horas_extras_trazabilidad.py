"""Persistencia y lectura del snapshot diario de cálculos HE."""
import hashlib
import json
from datetime import date, datetime, time
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from ...models.novedades_nomina.schemas_horas_extras_trazabilidad import CalculoDiarioDetalleIn
from ._planificador_common import CODIGOS_NOVEDAD_SUPRESION_PLAN, _horas_trabajadas_dia
from .horas_extras_calculo import _calcular_horas_extras_semanales, _parametros_jornada_semana
from .horas_extras_parametros import obtener_reglas_calculo


CODIGOS_HE = {"HED", "HEN", "HEFD", "HEFN"}
CODIGOS_RECARGO = {"HF", "RN", "RF"}


def _json_default(value):
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    return value


def _hash_snapshot(data: dict) -> str:
    payload = json.dumps(data, default=_json_default, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


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
) -> None:
    valor_bruto = 0.0 if not codigo or not horas or factor is None else horas * valor_hora * factor
    carga = valor_bruto * factor_prestacional
    filas.append(CalculoDiarioDetalleIn(
        **base,
        codigo_calculado=codigo,
        horas_concepto=round(horas, 2) if horas is not None else None,
        factor_hora_ordinaria=factor,
        valor_bruto=round(valor_bruto, 0),
        carga_prestacional=round(carga, 0),
        costo_total=round(valor_bruto + carga, 0),
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
    session: AsyncSession,
    emp_in,
    semana,
    parametros,
    detalles_agregados,
) -> list[CalculoDiarioDetalleIn]:
    reglas = await obtener_reglas_calculo(session)
    horas_semana, _divisor = _parametros_jornada_semana(semana.anio, semana.semana_iso, reglas)
    dias_idx = {d.dia_semana: d for d in emp_in.dias}
    datos_dias = []
    for dia_semana in range(1, 8):
        dia = dias_idx.get(dia_semana)
        if dia is None:
            datos_dias.append((dia_semana, None, 0.0, []))
            continue
        codigos_nov = [n.codigo_novedad for n in dia.novedades]
        horas_trab = _horas_trabajadas_dia(dia.hora_entrada, dia.hora_salida, dia.minutos_almuerzo)
        if any(c in CODIGOS_NOVEDAD_SUPRESION_PLAN for c in codigos_nov):
            horas_trab = 0.0
        datos_dias.append((dia_semana, dia, horas_trab, codigos_nov))

    extras_por_dia = _calcular_horas_extras_semanales(
        [d[2] for d in datos_dias],
        horas_semana,
        reglas.horas_ordinarias_diarias,
    )
    factor_map = {d.codigo_novedad: d.factor_hora_ordinaria for d in detalles_agregados}
    filas: list[CalculoDiarioDetalleIn] = []
    for idx, (dia_semana, dia, horas_trab, codigos_nov) in enumerate(datos_dias):
        horas_ext = round(float(extras_por_dia[idx]), 2)
        horas_ord = round(max(0.0, horas_trab - horas_ext), 2)
        primera_ot = dia.asignaciones_ot[0] if dia and dia.asignaciones_ot else None
        base = {
            "fecha": date.fromisocalendar(semana.anio, semana.semana_iso, dia_semana),
            "dia_semana": dia_semana,
            "hora_entrada": getattr(dia, "hora_entrada", None),
            "hora_salida": getattr(dia, "hora_salida", None),
            "minutos_almuerzo": getattr(dia, "minutos_almuerzo", 0),
            "horas_trabajadas": round(float(horas_trab), 2),
            "horas_ordinarias": horas_ord,
            "horas_extras": horas_ext,
            "es_festivo": False,
            "es_domingo": dia_semana == 7,
            "es_jornada_nocturna": bool(parametros.jornada_nocturna),
            "novedad_codigo": codigos_nov[0] if codigos_nov else None,
            "fuente_horario": "PLANIFICADOR",
            "ot_id": parametros.ot_id,
            "ot_codigo": primera_ot.orden if primera_ot else parametros.ot_codigo,
        }
        if horas_ext > 0 and not codigos_nov:
            codigo = "HEN" if parametros.jornada_nocturna else "HED"
            _agregar_concepto(
                filas,
                base=base,
                codigo=codigo,
                horas=horas_ext,
                factor=factor_map.get(codigo),
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
            hash_snapshot=_hash_snapshot(base),
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
