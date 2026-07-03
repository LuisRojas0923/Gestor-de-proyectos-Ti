"""Distribucion de costos HE por OT/centro de costo del planificador."""
import zlib
from datetime import datetime
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras import NominaCostoOt
from ...models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanConfirmarEmpleadoIn,
    PlanConfirmarParametros,
    PlanSemanaIn,
)
from ._planificador_common import (
    CODIGOS_NOVEDAD_SUPRESION_PLAN,
    _horas_trabajadas_dia,
    _resolver_catalogo_y_factor,
)
from .horas_extras_calculo import _calcular_horas_extras_semanales, _parametros_jornada_semana


def _ot_id_desde_orden(orden: str) -> int:
    """Convierte orden ERP a ID int compatible con NominaCostoOt."""
    orden_limpia = orden.strip()
    if orden_limpia.isdigit():
        return int(orden_limpia)
    return zlib.crc32(orden_limpia.encode("utf-8"))


async def distribuir_costos_ot_plan(
    session: AsyncSession,
    emp_in: PlanConfirmarEmpleadoIn,
    semana: PlanSemanaIn,
    parametros: PlanConfirmarParametros,
    calculo_id: Optional[int],
) -> List[int]:
    """Prorratea HE/costo del plan entre las asignaciones OT por dia."""
    if calculo_id is None or not any(d.asignaciones_ot for d in emp_in.dias):
        return []

    catalogo, factores = await _resolver_catalogo_y_factor(
        session, semana.fecha_inicio, [parametros.nivel_riesgo_arl]
    )
    cat_idx = {c["codigo"]: c for c in catalogo}
    factor_prestacional = factores[parametros.nivel_riesgo_arl]
    horas_semana_ordinaria, _divisor = _parametros_jornada_semana(
        semana.anio,
        semana.semana_iso,
    )
    dias_idx = {d.dia_semana: d for d in emp_in.dias}
    datos_dias = []

    for dia_semana in range(1, 8):
        dia = dias_idx.get(dia_semana)
        if dia is None:
            datos_dias.append((None, 0.0, []))
            continue
        codigos_nov = [n.codigo_novedad for n in dia.novedades]
        horas_trab = _horas_trabajadas_dia(
            dia.hora_entrada, dia.hora_salida, dia.minutos_almuerzo
        )
        if any(c in CODIGOS_NOVEDAD_SUPRESION_PLAN for c in codigos_nov):
            horas_trab = 0.0
        datos_dias.append((dia, horas_trab, codigos_nov))

    extras_por_dia = _calcular_horas_extras_semanales(
        [d[1] for d in datos_dias],
        horas_semana_ordinaria,
    )
    ids: List[int] = []

    for idx, (d, _horas_trab, codigos_nov) in enumerate(datos_dias):
        if d is None or not d.asignaciones_ot:
            continue
        horas_ext = extras_por_dia[idx]
        if horas_ext <= 0 or codigos_nov:
            continue
        codigo_he = "HEN" if parametros.jornada_nocturna else "HED"
        total_horas_asignadas = sum(a.horas or 0 for a in d.asignaciones_ot)
        if total_horas_asignadas <= 0:
            continue
        cat = cat_idx[codigo_he]
        factor = cat["factor_hora_ordinaria"]
        for asignacion in d.asignaciones_ot:
            proporcion = (asignacion.horas or 0) / total_horas_asignadas
            horas_ot = round(horas_ext * proporcion, 2)
            bruto = round(horas_ot * parametros.valor_hora_ordinaria * factor, 0)
            carga = round(bruto * factor_prestacional, 0)
            costo_id = await _upsert_costo_ot_asignacion(
                session=session,
                semana=semana,
                calculo_id=calculo_id,
                codigo_he=codigo_he,
                horas=horas_ot,
                valor_bruto=bruto,
                carga_prestacional=carga,
                asignacion=asignacion,
            )
            ids.append(costo_id)

    await session.commit()
    return ids


async def _upsert_costo_ot_asignacion(
    session: AsyncSession,
    semana: PlanSemanaIn,
    calculo_id: int,
    codigo_he: str,
    horas: float,
    valor_bruto: float,
    carga_prestacional: float,
    asignacion,
) -> int:
    ot_id = _ot_id_desde_orden(asignacion.orden)
    existente = (await session.execute(
        select(NominaCostoOt).where(
            NominaCostoOt.ot_id == ot_id,
            NominaCostoOt.anio == semana.anio,
            NominaCostoOt.semana_iso == semana.semana_iso,
            NominaCostoOt.cc == asignacion.cc,
            NominaCostoOt.scc == asignacion.scc,
            NominaCostoOt.sub_indice == asignacion.sub_indice,
            NominaCostoOt.categoria_sub_indice == asignacion.categoria_sub_indice,
        )
    )).scalar_one_or_none()

    horas_por_codigo = {
        "HED": horas if codigo_he == "HED" else 0.0,
        "HEN": horas if codigo_he == "HEN" else 0.0,
        "HEFD": horas if codigo_he == "HEFD" else 0.0,
        "HEFN": horas if codigo_he == "HEFN" else 0.0,
        "HF": horas if codigo_he == "HF" else 0.0,
    }
    costo_total = valor_bruto + carga_prestacional
    if existente is None:
        nuevo = NominaCostoOt(
            ot_id=ot_id,
            ot_codigo=asignacion.orden,
            anio=semana.anio,
            semana_iso=semana.semana_iso,
            fecha_inicio=semana.fecha_inicio,
            fecha_fin=semana.fecha_fin,
            total_empleados=1,
            total_horas=horas,
            total_horas_hed=horas_por_codigo["HED"],
            total_horas_hen=horas_por_codigo["HEN"],
            total_horas_hefd=horas_por_codigo["HEFD"],
            total_horas_hefn=horas_por_codigo["HEFN"],
            total_horas_hf=horas_por_codigo["HF"],
            total_valor_bruto=valor_bruto,
            total_carga_prestacional=carga_prestacional,
            total_costo_empresa=costo_total,
            categoria_sub_indice=asignacion.categoria_sub_indice,
            cc=asignacion.cc,
            scc=asignacion.scc,
            sub_indice=asignacion.sub_indice,
            calculo_ids=[calculo_id],
            ultima_actualizacion=datetime.now(),
        )
        session.add(nuevo)
        await session.flush()
        return nuevo.id

    existente.total_horas += horas
    existente.total_horas_hed += horas_por_codigo["HED"]
    existente.total_horas_hen += horas_por_codigo["HEN"]
    existente.total_horas_hefd += horas_por_codigo["HEFD"]
    existente.total_horas_hefn += horas_por_codigo["HEFN"]
    existente.total_horas_hf += horas_por_codigo["HF"]
    existente.total_valor_bruto += valor_bruto
    existente.total_carga_prestacional += carga_prestacional
    existente.total_costo_empresa += costo_total
    existente.ultima_actualizacion = datetime.now()
    ids = list(existente.calculo_ids or [])
    if calculo_id not in ids:
        ids.append(calculo_id)
        existente.total_empleados += 1
    existente.calculo_ids = ids
    session.add(existente)
    return existente.id
