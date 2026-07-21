"""Lectura diaria de cálculos con formato de planilla operativa."""
import logging
from collections import defaultdict
from math import isclose
from types import SimpleNamespace
from typing import Optional

from sqlalchemy import or_, text, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from starlette.concurrency import run_in_threadpool

from ...models.auth.usuario import Usuario
from ...models.novedades_nomina.horas_extras import NominaHorarioPactado
from ...models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from ...models.novedades_nomina.planificador_dia_ot import NominaPlanificadorDiaOt
from ...models.novedades_nomina.schemas_horas_extras_planilla import CalculoPlanillaRead
from ..erp.empleados_service import EmpleadosService
from .horas_extras_confirmacion import listar_calculos
from .snapshot_integridad import validar_hash_snapshot

logger = logging.getLogger(__name__)


def _texto(value) -> Optional[str]:
    normalizado = str(value).strip() if value is not None else ""
    return normalizado or None


def _consultar_ots_bulk(db_erp, claves: set[tuple[str, str, str, str]]) -> dict:
    ordenes = sorted({clave[0] for clave in claves if clave[0]})
    if not ordenes:
        return {}
    placeholders = ", ".join(f":orden{i}" for i in range(len(ordenes)))
    params = {f"orden{i}": orden for i, orden in enumerate(ordenes)}
    rows = db_erp.execute(text(f"""
        SELECT DISTINCT ON (orden, cc, scc, sub_indice)
            orden::text AS orden,
            cc::text AS cc,
            scc::text AS scc,
            sub_indice::text AS sub_indice,
            descripcion::text AS descripcion,
            cliente::text AS cliente
        FROM public.OThorarios
        WHERE orden::text IN ({placeholders})
        ORDER BY orden, cc, scc, sub_indice,
                 descripcion::text NULLS LAST, cliente::text NULLS LAST
    """), params).fetchall()
    return {
        (
            str(row.orden).strip(),
            str(row.cc).strip() if row.cc is not None else "",
            str(row.scc).strip() if row.scc is not None else "",
            str(row.sub_indice).strip() if row.sub_indice is not None else "",
        ): {
            "descripcion": row.descripcion,
            "cliente": row.cliente,
        }
        for row in rows
    }


def _clave_ot(asignacion) -> tuple[str, str, str, str]:
    return (
        _texto(getattr(asignacion, "orden", None)) or "",
        _texto(getattr(asignacion, "cc", None)) or "",
        _texto(getattr(asignacion, "scc", None)) or "",
        _texto(getattr(asignacion, "sub_indice", None)) or "",
    )


def _distribuir_horas(total: float, asignaciones: list) -> list[float]:
    if not asignaciones:
        return []
    porcentajes = [float(getattr(item, "porcentaje", 0) or 0) for item in asignaciones]
    horas = [float(getattr(item, "horas", 0) or 0) for item in asignaciones]
    if sum(porcentajes) > 0:
        pesos = porcentajes
    elif sum(horas) > 0:
        pesos = horas
    else:
        pesos = [1.0] * len(asignaciones)
    suma = sum(pesos)
    distribucion = [round(total * peso / suma, 2) for peso in pesos]
    distribucion[-1] = round(distribucion[-1] + total - sum(distribucion), 2)
    return distribucion


def _metadata_ot(asignacion, ots: dict) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    clave = _clave_ot(asignacion)
    metadata = ots.get(clave, {})
    ot_cc = _texto(getattr(asignacion, "cc", None)) or _texto(getattr(asignacion, "orden", None))
    sub_subc = _texto(getattr(asignacion, "scc", None)) or _texto(getattr(asignacion, "sub_indice", None))
    especialidad = _texto(getattr(asignacion, "descripcion", None)) or _texto(metadata.get("descripcion"))
    cliente = _texto(metadata.get("cliente"))
    return ot_cc, sub_subc, especialidad, cliente


def _asignaciones_para_detalle(detalle, asignaciones: list) -> list:
    ot_codigo = _texto(getattr(detalle, "ot_codigo", None))
    encontradas = [
        item for item in asignaciones
        if _texto(getattr(item, "orden", None)) == ot_codigo
    ]
    if encontradas:
        return encontradas
    return [SimpleNamespace(
        orden=ot_codigo,
        cc=None,
        scc=None,
        sub_indice=None,
        descripcion=None,
        horas=None,
        porcentaje=None,
    )]


def _construir_fila(
    *, calculo, fila_id: str, fecha, novedad: str, cantidad_horas: float,
    asignacion, observaciones, costo_total: float, empleados: dict,
    horarios: dict, usuarios: dict, ots: dict,
) -> CalculoPlanillaRead:
    empleado = empleados.get(str(calculo.cedula).strip(), {})
    horario = horarios.get(str(calculo.cedula).strip())
    autoriza_erp = empleado.get("autoriza_he")
    if horario is not None:
        aplica_he = (
            horario.autoriza_he_override
            if horario.autoriza_he_override is not None
            else horario.autoriza_he_default
        )
    elif autoriza_erp is not None:
        aplica_he = bool(autoriza_erp)
    else:
        aplica_he = calculo.estado != "PENDIENTE_AUTORIZACION"
    responsable_id = calculo.confirmado_por or calculo.calculado_por
    ot_cc, sub_subc, especialidad, cliente = _metadata_ot(asignacion, ots)
    return CalculoPlanillaRead(
        fila_id=fila_id,
        calculo_id=calculo.id,
        cedula=str(calculo.cedula).strip(),
        empleado=_texto(empleado.get("nombre")),
        salario=float(calculo.salario_base_mensual),
        base_hora=float(calculo.valor_hora_ordinaria),
        aplica_he=bool(aplica_he),
        empresa=_texto(empleado.get("empresa")),
        sucursal=_texto(empleado.get("ciudadcontratacion")),
        fecha=fecha,
        ot_cc=ot_cc,
        sub_subc=sub_subc,
        especialidad_ot=especialidad,
        cantidad=1,
        ubicacion="CC",
        novedad=novedad,
        cantidad_horas=round(float(cantidad_horas), 2),
        observaciones=_texto(observaciones),
        responsable=_texto(usuarios.get(responsable_id)),
        encargados=_texto(empleado.get("quien_reporta")),
        cliente=cliente,
        costo_total=float(costo_total or 0),
        estado=calculo.estado,
    )


def _construir_filas_planilla(
    calculos: list,
    detalles_diarios: list,
    asignaciones: list,
    *,
    empleados: dict,
    horarios: dict,
    usuarios: dict,
    ots: dict,
) -> list[CalculoPlanillaRead]:
    diarios_por_calculo_fecha = defaultdict(list)
    for detalle in detalles_diarios:
        diarios_por_calculo_fecha[(detalle.calculo_id, detalle.fecha)].append(detalle)
    asignaciones_por_dia = defaultdict(list)
    for asignacion in asignaciones:
        clave = (
            asignacion.cedula,
            asignacion.anio,
            asignacion.semana_iso,
            asignacion.dia_semana,
        )
        asignaciones_por_dia[clave].append(asignacion)

    filas: list[CalculoPlanillaRead] = []
    for calculo in calculos:
        grupos = [
            (fecha, detalles)
            for (calculo_id, fecha), detalles in diarios_por_calculo_fecha.items()
            if calculo_id == calculo.id
        ]
        for fecha, detalles in sorted(grupos, key=lambda item: item[0]):
            base = detalles[0]
            asignaciones_dia = asignaciones_por_dia.get((
                str(calculo.cedula).strip(),
                calculo.anio,
                calculo.semana_iso,
                base.dia_semana,
            ), [])
            if not asignaciones_dia:
                codigos_ot = list(dict.fromkeys(
                    _texto(detalle.ot_codigo) for detalle in detalles if _texto(detalle.ot_codigo)
                ))
                asignaciones_dia = [
                    SimpleNamespace(
                        orden=codigo, cc=None, scc=None, sub_indice=None,
                        descripcion=None, horas=None, porcentaje=None,
                    )
                    for codigo in codigos_ot
                ] or _asignaciones_para_detalle(base, [])

            horas_ordinarias = max(float(detalle.horas_ordinarias or 0) for detalle in detalles)
            if horas_ordinarias > 0:
                for indice, (asignacion, horas) in enumerate(zip(
                    asignaciones_dia,
                    _distribuir_horas(horas_ordinarias, asignaciones_dia),
                )):
                    if horas <= 0:
                        continue
                    filas.append(_construir_fila(
                        calculo=calculo,
                        fila_id=f"{calculo.id}:salario:{fecha.isoformat()}:{indice}",
                        fecha=fecha,
                        novedad="SALARIO",
                        cantidad_horas=horas,
                        asignacion=asignacion,
                        observaciones=base.observaciones,
                        costo_total=0,
                        empleados=empleados,
                        horarios=horarios,
                        usuarios=usuarios,
                        ots=ots,
                    ))

            for indice, detalle in enumerate(detalles):
                novedad = _texto(detalle.codigo_calculado) or _texto(detalle.novedad_codigo)
                if not novedad:
                    continue
                cantidad_horas = float(detalle.horas_concepto or 0)
                if cantidad_horas <= 0:
                    continue
                asignaciones_detalle = _asignaciones_para_detalle(detalle, asignaciones_dia)
                horas_repartidas = _distribuir_horas(cantidad_horas, asignaciones_detalle)
                costos_repartidos = _distribuir_horas(
                    float(detalle.costo_total or 0),
                    asignaciones_detalle,
                )
                for reparto, (asignacion, horas, costo) in enumerate(zip(
                    asignaciones_detalle,
                    horas_repartidas,
                    costos_repartidos,
                )):
                    if horas <= 0:
                        continue
                    filas.append(_construir_fila(
                        calculo=calculo,
                        fila_id=(
                            f"{calculo.id}:detalle:"
                            f"{getattr(detalle, 'id', indice)}:{reparto}"
                        ),
                        fecha=fecha,
                        novedad=novedad,
                        cantidad_horas=horas,
                        asignacion=asignacion,
                        observaciones=detalle.observaciones,
                        costo_total=costo,
                        empleados=empleados,
                        horarios=horarios,
                        usuarios=usuarios,
                        ots=ots,
                    ))

        if grupos:
            continue
        for indice, detalle in enumerate(calculo.detalles):
            asignacion = SimpleNamespace(
                orden=_texto(detalle.ot_codigo), cc=None, scc=None,
                sub_indice=None, descripcion=None, horas=None, porcentaje=None,
            )
            if float(detalle.horas or 0) <= 0:
                continue
            filas.append(_construir_fila(
                calculo=calculo,
                fila_id=f"{calculo.id}:historico:{getattr(detalle, 'id', indice)}",
                fecha=calculo.fecha_inicio,
                novedad=detalle.codigo_novedad,
                cantidad_horas=detalle.horas,
                asignacion=asignacion,
                observaciones=calculo.observaciones,
                costo_total=detalle.costo_total,
                empleados=empleados,
                horarios=horarios,
                usuarios=usuarios,
                ots=ots,
            ))
    consolidadas: dict[tuple[str, object, Optional[str], str], CalculoPlanillaRead] = {}
    for fila in filas:
        clave = (fila.cedula, fila.fecha, fila.ot_cc, fila.novedad)
        existente = consolidadas.get(clave)
        if existente is None:
            consolidadas[clave] = fila
            continue
        observaciones = list(dict.fromkeys(filter(None, (
            existente.observaciones,
            fila.observaciones,
        ))))
        consolidadas[clave] = existente.model_copy(update={
            "cantidad_horas": round(existente.cantidad_horas + fila.cantidad_horas, 2),
            "costo_total": float(existente.costo_total + fila.costo_total),
            "observaciones": " | ".join(observaciones) or None,
        })
    return list(consolidadas.values())


def _filtrar_detalles_integros(calculos: list, detalles: list) -> list:
    calculos_por_id = {calculo.id: calculo for calculo in calculos}
    detalles_por_calculo = defaultdict(list)
    for detalle in detalles:
        detalles_por_calculo[detalle.calculo_id].append(detalle)

    validos = []
    for calculo_id, grupo in detalles_por_calculo.items():
        calculo = calculos_por_id.get(calculo_id)
        try:
            if calculo is None:
                raise ValueError("Snapshot sin calculo asociado")
            for detalle in grupo:
                if (
                    str(detalle.cedula).strip() != str(calculo.cedula).strip()
                    or detalle.anio != calculo.anio
                    or detalle.semana_iso != calculo.semana_iso
                    or not calculo.fecha_inicio <= detalle.fecha <= calculo.fecha_fin
                ):
                    raise ValueError("Snapshot fuera del periodo del calculo")
                validar_hash_snapshot(detalle)

            esperadas = defaultdict(float)
            for detalle in calculo.detalles:
                esperadas[detalle.codigo_novedad] += float(detalle.horas or 0)
            observadas = defaultdict(float)
            codigos_calculados = set()
            for detalle in grupo:
                codigo = _texto(detalle.codigo_calculado) or _texto(detalle.novedad_codigo)
                codigo_calculado = _texto(detalle.codigo_calculado)
                if codigo_calculado:
                    codigos_calculados.add(codigo_calculado)
                if codigo in esperadas:
                    observadas[codigo] += float(detalle.horas_concepto or 0)
            if esperadas and not codigos_calculados.issubset(esperadas):
                raise ValueError("Snapshot diario contiene conceptos calculados inesperados")
            if any(
                not isclose(observadas[codigo], horas, abs_tol=0.01)
                for codigo, horas in esperadas.items()
            ):
                raise ValueError("Snapshot diario incompleto")
        except (AttributeError, TypeError, ValueError):
            logger.warning("Snapshot diario invalido para calculo %s; se usa detalle semanal", calculo_id)
            continue
        validos.extend(grupo)
    return validos


async def listar_calculos_planilla(
    session: AsyncSession,
    *,
    db_erp=None,
    cedula: Optional[str] = None,
    anio: Optional[int] = None,
    semana_iso: Optional[int] = None,
    estado: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    cedulas_permitidas: Optional[set[str]] = None,
) -> list[CalculoPlanillaRead]:
    calculos = await listar_calculos(
        session,
        cedula=cedula,
        anio=anio,
        semana_iso=semana_iso,
        estado=estado,
        limit=limit,
        offset=offset,
        cedulas_permitidas=cedulas_permitidas,
    )
    if not calculos:
        return []

    calculo_ids = [calculo.id for calculo in calculos]
    cedulas = sorted({str(calculo.cedula).strip() for calculo in calculos})
    detalles = list((await session.execute(
        select(NominaCalculoDiarioDetalle)
        .where(NominaCalculoDiarioDetalle.calculo_id.in_(calculo_ids))
        .order_by(NominaCalculoDiarioDetalle.fecha, NominaCalculoDiarioDetalle.id)
    )).scalars().all())
    periodos = {
        (str(calculo.cedula).strip(), calculo.anio, calculo.semana_iso)
        for calculo in calculos
    }
    asignaciones = list((await session.execute(
        select(NominaPlanificadorDiaOt).where(
            tuple_(
                NominaPlanificadorDiaOt.cedula,
                NominaPlanificadorDiaOt.anio,
                NominaPlanificadorDiaOt.semana_iso,
            ).in_(periodos),
        )
    )).scalars().all())
    horarios = {
        horario.cedula: horario for horario in (await session.execute(
            select(NominaHorarioPactado).where(NominaHorarioPactado.cedula.in_(cedulas))
        )).scalars().all()
    }
    responsables = {
        responsable
        for calculo in calculos
        for responsable in (calculo.confirmado_por, calculo.calculado_por)
        if responsable
    }
    usuarios = {}
    if responsables:
        usuarios_encontrados = (await session.execute(
            select(Usuario).where(or_(
                Usuario.id.in_(responsables),
                Usuario.cedula.in_(responsables),
            ))
        )).scalars().all()
        for usuario in usuarios_encontrados:
            usuarios[usuario.id] = usuario.nombre
            usuarios[usuario.cedula] = usuario.nombre

    empleados = {}
    ots = {}
    if db_erp is not None:
        try:
            empleados = await EmpleadosService.consultar_empleados_bulk_async(
                db_erp,
                cedulas,
                incluir_datos_laborales=True,
            )
        except Exception:
            logger.warning("ERP no disponible al enriquecer empleados de planilla HE")
        try:
            claves_ots = {_clave_ot(asignacion) for asignacion in asignaciones}
            claves_ots.update(
                (_texto(detalle.ot_codigo) or "", "", "", "")
                for detalle in detalles
                if _texto(detalle.ot_codigo)
            )
            claves_ots.update(
                (_texto(detalle.ot_codigo) or "", "", "", "")
                for calculo in calculos
                for detalle in calculo.detalles
                if _texto(detalle.ot_codigo)
            )
            ots = await run_in_threadpool(_consultar_ots_bulk, db_erp, claves_ots)
        except Exception:
            logger.warning("ERP no disponible al enriquecer OT de planilla HE")

    return _construir_filas_planilla(
        calculos,
        _filtrar_detalles_integros(calculos, detalles),
        asignaciones,
        empleados=empleados,
        horarios=horarios,
        usuarios=usuarios,
        ots=ots,
    )
