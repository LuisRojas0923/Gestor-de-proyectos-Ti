"""Puente ERP no bloqueante y disponibilidad semanal para Horarios."""
from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import SessionErp
from ...models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaHorarioPactado,
    NominaOverrideAutorizaHE,
)
from ...models.novedades_nomina.horas_extras_novedad_evento import NominaNovedadEvento
from .empleados_service import EmpleadosService

MOTIVOS_CATEGORIA = {
    "VACACION": "VACACIONES",
    "INCAPACIDAD": "INCAPACIDAD",
    "LICENCIA": "LICENCIA",
}


def consultar_empleados_erp_worker(
    q: Optional[str], limit: int, offset: int, solo_activos: bool,
    cedulas_permitidas: Optional[list[str]], sin_paginar: bool = False,
) -> dict:
    """Crea, usa y cierra la sesion ERP completamente dentro del worker."""
    db_erp = SessionErp()
    try:
        return EmpleadosService.listar_empleados_paginado(
            db_erp, q=q, limit=limit, offset=offset, solo_activos=solo_activos,
            cedulas_permitidas=cedulas_permitidas, sin_paginar=sin_paginar,
        )
    finally:
        db_erp.close()


def validar_cedulas_erp_worker(cedulas: list[str]) -> set[str]:
    """Valida hasta 200 cédulas activas sin sacar la sesión ERP del worker."""
    db_erp = SessionErp()
    try:
        encontradas: set[str] = set()
        for inicio in range(0, len(cedulas), 100):
            lote = cedulas[inicio:inicio + 100]
            resultado = EmpleadosService.listar_empleados_paginado(
                db_erp,
                limit=100,
                offset=0,
                solo_activos=True,
                cedulas_permitidas=lote,
            )
            encontradas.update(item["cedula"] for item in resultado["items"])
        return encontradas
    finally:
        db_erp.close()


def validar_semana_iso(anio: int, semana_iso: int) -> tuple[date, date]:
    inicio = date.fromisocalendar(anio, semana_iso, 1)
    return inicio, date.fromisocalendar(anio, semana_iso, 7)


async def agregar_disponibilidad_semanal(
    session: AsyncSession, items: list[dict], anio: int, semana_iso: int,
    relacionados: Optional[set[str]] = None,
) -> list[dict]:
    inicio, fin = validar_semana_iso(anio, semana_iso)
    cedulas = [item["cedula"] for item in items]
    if not cedulas:
        return items
    horarios = {fila.cedula: fila for fila in (await session.execute(
        select(NominaHorarioPactado).where(NominaHorarioPactado.cedula.in_(cedulas))
    )).scalars().all()}
    inicio_dt = datetime.combine(inicio, time.min)
    fin_dt = datetime.combine(fin, time.max)
    overrides = (await session.execute(
        select(NominaOverrideAutorizaHE)
        .where(
            NominaOverrideAutorizaHE.cedula.in_(cedulas),
            NominaOverrideAutorizaHE.estado == "ACTIVO",
            NominaOverrideAutorizaHE.vigente_desde <= fin_dt,
            (
                NominaOverrideAutorizaHE.vigente_hasta.is_(None)
                | (NominaOverrideAutorizaHE.vigente_hasta >= inicio_dt)
            ),
        )
        .order_by(
            NominaOverrideAutorizaHE.cedula,
            NominaOverrideAutorizaHE.vigente_desde.desc(),
            NominaOverrideAutorizaHE.id.desc(),
        )
    )).scalars().all()
    overrides_vigentes = {}
    for override in overrides:
        overrides_vigentes.setdefault(override.cedula, override.autoriza_he_override)
    eventos = (await session.execute(
        select(NominaNovedadEvento, NominaCatalogoNovedad.categoria)
        .join(NominaCatalogoNovedad, NominaCatalogoNovedad.codigo == NominaNovedadEvento.codigo_novedad)
        .where(
            NominaNovedadEvento.cedula.in_(cedulas),
            NominaNovedadEvento.estado == "CONFIRMADO",
            NominaNovedadEvento.fecha_inicio <= fin,
            NominaNovedadEvento.fecha_fin >= inicio,
            NominaCatalogoNovedad.categoria.in_(MOTIVOS_CATEGORIA),
        )
    )).all()
    bloqueos: dict[str, str] = {}
    for evento, categoria in eventos:
        bloqueos.setdefault(evento.cedula, MOTIVOS_CATEGORIA[categoria])

    for item in items:
        cedula = item["cedula"]
        horario = horarios.get(cedula)
        autoriza = bool(item.get("autoriza_he"))
        if cedula in overrides_vigentes:
            autoriza = bool(overrides_vigentes[cedula])
        elif horario is not None:
            autoriza = bool(horario.autoriza_he_default)
        motivo = None
        if not item.get("activo", True):
            motivo = "EMPLEADO_INACTIVO"
        elif not autoriza:
            motivo = "NO_AUTORIZA_HE"
        elif cedula in bloqueos:
            motivo = bloqueos[cedula]
        item["autoriza_he"] = autoriza
        item["disponible_semana"] = motivo is None
        item["motivo_no_disponible"] = motivo
        item["jefe"] = item.pop("quien_reporta", None)
        if relacionados is not None:
            item["relacionado"] = cedula in relacionados
    return items


def filtrar_paginar_empleados(
    items: list[dict],
    *,
    cargos: list[str],
    areas: list[str],
    ciudades: list[str],
    jefes: list[str],
    autoriza_he: bool | None,
    disponible_semana: bool | None,
    relacionado: bool | None,
    orden: str,
    direccion: str,
    limit: int,
    offset: int,
) -> dict:
    """Aplica filtros derivados antes de contar y paginar el conjunto ERP."""
    facetas = {
        "cargos": sorted({item["cargo"] for item in items if item.get("cargo")}),
        "areas": sorted({item["area"] for item in items if item.get("area")}),
        "ciudades": sorted({
            item["ciudadcontratacion"]
            for item in items
            if item.get("ciudadcontratacion")
        }),
        "jefes": sorted({item["jefe"] for item in items if item.get("jefe")}),
    }
    filtros = {
        "cargo": set(cargos),
        "area": set(areas),
        "ciudadcontratacion": set(ciudades),
        "jefe": set(jefes),
    }
    filtrados = [
        item for item in items
        if all(not valores or item.get(campo) in valores for campo, valores in filtros.items())
        and (autoriza_he is None or bool(item.get("autoriza_he")) is autoriza_he)
        and (
            disponible_semana is None
            or bool(item.get("disponible_semana")) is disponible_semana
        )
        and (relacionado is None or bool(item.get("relacionado")) is relacionado)
    ]
    campo_orden = {
        "cedula": "cedula",
        "nombre": "nombre",
        "cargo": "cargo",
        "area": "area",
        "ciudad": "ciudadcontratacion",
        "jefe": "jefe",
    }[orden]
    filtrados.sort(
        key=lambda item: (
            str(item.get(campo_orden) or "").casefold(),
            str(item.get("cedula") or ""),
        ),
        reverse=direccion == "desc",
    )
    return {
        "items": filtrados[offset:offset + limit],
        "total": len(filtrados),
        "limit": limit,
        "offset": offset,
        "facetas": facetas,
    }
