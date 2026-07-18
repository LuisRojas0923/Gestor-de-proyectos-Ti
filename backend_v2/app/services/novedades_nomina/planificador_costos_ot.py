"""Distribucion de costos HE por OT/centro de costo del planificador."""
import zlib
from datetime import datetime
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import select

from ...models.novedades_nomina.horas_extras import (
    NominaCalculoSemanalDetalle,
    NominaCostoOt,
)
from ...models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from ...models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanConfirmarEmpleadoIn,
    PlanConfirmarParametros,
    PlanSemanaIn,
)
from ._planificador_common import (
    _resolver_catalogo_y_factor,
)
from .snapshot_integridad import validar_hash_snapshot


def _ot_id_desde_orden(orden: str) -> int:
    """Convierte orden ERP a ID int compatible con NominaCostoOt."""
    orden_limpia = orden.strip()
    if orden_limpia.isdigit():
        return int(orden_limpia)
    return zlib.crc32(orden_limpia.encode("utf-8")) & 0x7FFFFFFF


def _distribuir_horas_con_residuo(horas: float, asignaciones) -> list[float]:
    return _distribuir_valor_con_residuo(horas, asignaciones, decimales=2)


def _asignaciones_con_peso(asignaciones):
    usa_porcentaje = any(a.porcentaje is not None for a in asignaciones)
    return [
        asignacion
        for asignacion in asignaciones
        if (
            (asignacion.porcentaje or 0.0)
            if usa_porcentaje
            else (asignacion.horas or 0.0)
        ) > 0
    ]


def _calcular_importes_concepto(
    horas: float,
    valor_hora: float,
    factor_hora: float,
    factor_prestacional: float,
) -> tuple[float, float, float]:
    valor_bruto = horas * valor_hora * factor_hora
    carga = valor_bruto * factor_prestacional
    return (
        round(valor_bruto, 0),
        round(carga, 0),
        round(valor_bruto + carga, 0),
    )


def _distribuir_valor_con_residuo(
    valor: float,
    asignaciones,
    *,
    decimales: int,
) -> list[float]:
    usa_porcentaje = any(a.porcentaje is not None for a in asignaciones)
    pesos = [
        (a.porcentaje or 0.0) if usa_porcentaje else (a.horas or 0.0)
        for a in asignaciones
    ]
    total_pesos = sum(pesos)
    if total_pesos <= 0:
        return []
    distribuidas: list[float] = []
    acumulado = 0.0
    positivos = [idx for idx, peso in enumerate(pesos) if peso > 0]
    ultimo_positivo = positivos[-1]
    for idx, peso in enumerate(pesos):
        if peso <= 0:
            valor_asignado = 0.0
        elif idx == ultimo_positivo:
            valor_asignado = round(valor - acumulado, decimales)
        else:
            valor_asignado = round(valor * peso / total_pesos, decimales)
            acumulado = round(acumulado + valor_asignado, decimales)
        distribuidas.append(valor_asignado)
    return distribuidas


async def distribuir_costos_ot_plan(
    session: AsyncSession,
    emp_in: PlanConfirmarEmpleadoIn,
    semana: PlanSemanaIn,
    parametros: PlanConfirmarParametros,
    calculo_id: Optional[int],
    clasificacion,
) -> List[int]:
    """Prorratea HE/costo del plan entre las asignaciones OT por dia."""
    if calculo_id is None or not any(d.asignaciones_ot for d in emp_in.dias):
        return []

    catalogo, _ = await _resolver_catalogo_y_factor(
        session, semana.fecha_inicio, [parametros.nivel_riesgo_arl]
    )
    cat_idx = {c["codigo"]: c for c in catalogo}
    factor_prestacional = parametros.factor_prestacional
    ids: List[int] = []

    for calculado in clasificacion:
        d = calculado.dia
        if d is None or not d.asignaciones_ot:
            continue
        asignaciones = _asignaciones_con_peso(d.asignaciones_ot)
        for concepto in calculado.conceptos:
            cat = cat_idx[concepto.codigo]
            factor = cat["factor_hora_ordinaria"]
            horas_distribuidas = _distribuir_horas_con_residuo(
                concepto.horas,
                asignaciones,
            )
            bruto_total, carga_total, costo_total = _calcular_importes_concepto(
                concepto.horas,
                parametros.valor_hora_ordinaria,
                factor,
                factor_prestacional,
            )
            brutos = _distribuir_valor_con_residuo(
                bruto_total,
                asignaciones,
                decimales=0,
            )
            cargas = _distribuir_valor_con_residuo(
                carga_total,
                asignaciones,
                decimales=0,
            )
            costos = _distribuir_valor_con_residuo(
                costo_total,
                asignaciones,
                decimales=0,
            )
            for asignacion, horas_ot, bruto, carga, costo in zip(
                asignaciones,
                horas_distribuidas,
                brutos,
                cargas,
                costos,
            ):
                costo_id = await _upsert_costo_ot_asignacion(
                    session=session,
                    semana=semana,
                    calculo_id=calculo_id,
                    codigo_he=concepto.codigo,
                    horas=horas_ot,
                    valor_bruto=bruto,
                    carga_prestacional=carga,
                    costo_total=costo,
                    asignacion=asignacion,
                )
                ids.append(costo_id)

    await session.flush()
    return ids


async def _upsert_costo_ot_asignacion(
    session: AsyncSession,
    semana: PlanSemanaIn,
    calculo_id: int,
    codigo_he: str,
    horas: float,
    valor_bruto: float,
    carga_prestacional: float,
    costo_total: float,
    asignacion,
) -> int:
    ot_id = _ot_id_desde_orden(asignacion.orden)
    horas_por_codigo = {
        "HED": horas if codigo_he == "HED" else 0.0,
        "HEN": horas if codigo_he == "HEN" else 0.0,
        "HEFD": horas if codigo_he == "HEFD" else 0.0,
        "HEFN": horas if codigo_he == "HEFN" else 0.0,
        "HF": horas if codigo_he == "HF" else 0.0,
    }
    await session.execute(
        pg_insert(NominaCostoOt).values(
            ot_id=ot_id,
            ot_codigo=asignacion.orden,
            anio=semana.anio,
            semana_iso=semana.semana_iso,
            fecha_inicio=semana.fecha_inicio,
            fecha_fin=semana.fecha_fin,
            total_empleados=0,
            total_horas=0.0,
            total_horas_hed=0.0,
            total_horas_hen=0.0,
            total_horas_hefd=0.0,
            total_horas_hefn=0.0,
            total_horas_hf=0.0,
            total_valor_bruto=0.0,
            total_carga_prestacional=0.0,
            total_costo_empresa=0.0,
            categoria_sub_indice=asignacion.categoria_sub_indice,
            cc=asignacion.cc,
            scc=asignacion.scc,
            sub_indice=asignacion.sub_indice,
            calculo_ids=[],
            ultima_actualizacion=datetime.now(),
        )
        .on_conflict_do_nothing(
            index_elements=[
                NominaCostoOt.ot_id,
                NominaCostoOt.anio,
                NominaCostoOt.semana_iso,
            ]
        )
    )
    existente = (await session.execute(
        select(NominaCostoOt).where(
            NominaCostoOt.ot_id == ot_id,
            NominaCostoOt.anio == semana.anio,
            NominaCostoOt.semana_iso == semana.semana_iso,
        ).with_for_update()
    )).scalar_one()
    if existente.ot_codigo.strip() != asignacion.orden.strip():
        raise ValueError("Colision de identificador entre ordenes OT")
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


async def revertir_costos_ot_plan(session: AsyncSession, calculo) -> None:
    """Revierte distribuciones OT usando el snapshot diario confirmado."""
    snapshot = (await session.execute(
        select(NominaCalculoDiarioDetalle).where(
            NominaCalculoDiarioDetalle.calculo_id == calculo.id,
        )
    )).scalars().all()
    if not snapshot or {detalle.dia_semana for detalle in snapshot} != set(range(1, 8)):
        raise ValueError("El snapshot diario esta ausente o incompleto")
    for detalle in snapshot:
        validar_hash_snapshot(detalle)
    agregados = (await session.execute(
        select(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id == calculo.id,
        )
    )).scalars().all()
    snapshot_conceptos = [d for d in snapshot if d.codigo_calculado is not None]
    for campo_snapshot, campo_agregado, decimales in (
        ("horas_concepto", "horas", 2),
        ("valor_bruto", "valor_bruto", 0),
        ("carga_prestacional", "carga_prestacional", 0),
        ("costo_total", "costo_total", 0),
    ):
        total_snapshot = sum(getattr(d, campo_snapshot) or 0 for d in snapshot_conceptos)
        total_agregado = sum(getattr(d, campo_agregado) or 0 for d in agregados)
        if round(total_snapshot, decimales) != round(total_agregado, decimales):
            raise ValueError("El snapshot diario no concilia con el calculo semanal")
    detalles = [d for d in snapshot_conceptos if d.ot_id is not None]
    campos = {
        "HED": "total_horas_hed",
        "HEN": "total_horas_hen",
        "HEFD": "total_horas_hefd",
        "HEFN": "total_horas_hefn",
        "HF": "total_horas_hf",
    }
    tocados: dict[int, NominaCostoOt] = {}
    for detalle in detalles:
        if detalle.ot_id is None or detalle.codigo_calculado not in campos:
            continue
        costo = (await session.execute(
            select(NominaCostoOt).where(
                NominaCostoOt.ot_id == detalle.ot_id,
                NominaCostoOt.anio == calculo.anio,
                NominaCostoOt.semana_iso == calculo.semana_iso,
            ).with_for_update()
        )).scalar_one_or_none()
        if costo is None:
            continue
        horas = detalle.horas_concepto or 0.0
        costo.total_horas = max(0.0, costo.total_horas - horas)
        campo = campos[detalle.codigo_calculado]
        setattr(costo, campo, max(0.0, getattr(costo, campo) - horas))
        costo.total_valor_bruto = max(0.0, costo.total_valor_bruto - detalle.valor_bruto)
        costo.total_carga_prestacional = max(
            0.0,
            costo.total_carga_prestacional - detalle.carga_prestacional,
        )
        costo.total_costo_empresa = max(0.0, costo.total_costo_empresa - detalle.costo_total)
        tocados[costo.id] = costo

    for costo in tocados.values():
        ids = list(costo.calculo_ids or [])
        if calculo.id in ids:
            ids.remove(calculo.id)
            costo.total_empleados = max(0, costo.total_empleados - 1)
        costo.calculo_ids = ids
        costo.ultima_actualizacion = datetime.now()
        session.add(costo)
