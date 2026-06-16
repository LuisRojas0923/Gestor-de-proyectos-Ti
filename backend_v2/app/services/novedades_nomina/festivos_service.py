"""
Service de festivos nacionales de Colombia (S5').

Responsabilidades:
  - Listar festivos de un año desde la DB.
  - Si la DB está vacía, calcular al vuelo con Ley Emiliani (fallback).
  - Sincronizar desde Calendarific cuando la API key está configurada;
    si falla, persistir el resultado de Emiliani.

Decisión: la "fuente de verdad" es la DB. Calendarific solo llena
la tabla; una vez persistido, leer siempre de la DB.
"""
import logging
from datetime import date
from typing import List, Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.horas_extras import NominaFestivoCalendario
from .festivos_colombia import festivos_colombia
from .calendarific_client import obtener_festivos_calendarific, CalendarificError

logger = logging.getLogger(__name__)


async def listar_festivos(
    session: AsyncSession,
    anio: int,
    fuente: str = "auto",
) -> List[dict]:
    """
    Lista los festivos de un año.

    `fuente`:
      - 'auto': lee de DB si hay; si no, calcula con Ley Emiliani.
      - 'emiliani': siempre calcula con Ley Emiliani (no consulta DB).
      - 'calendarific': solo DB; si vacía, retorna [].
    """
    if fuente == "emiliani":
        return [{"fecha": f["fecha"], "nombre": f["nombre"], "fuente": "LEY_EMILIANI"}
                 for f in festivos_colombia(anio)]

    if fuente == "calendarific":
        return await _leer_db(session, anio, fuente_filtro="CALENDARIFIC")

    # auto
    en_db = await _leer_db(session, anio)
    if en_db:
        return en_db
    return [{"fecha": f["fecha"], "nombre": f["nombre"], "fuente": "LEY_EMILIANI"}
            for f in festivos_colombia(anio)]


async def _leer_db(
    session: AsyncSession,
    anio: int,
    fuente_filtro: Optional[str] = None,
) -> List[dict]:
    stmt = select(NominaFestivoCalendario).where(
        NominaFestivoCalendario.anio == anio
    )
    if fuente_filtro:
        stmt = stmt.where(NominaFestivoCalendario.fuente == fuente_filtro)
    stmt = stmt.order_by(NominaFestivoCalendario.fecha)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [{"fecha": r.fecha, "nombre": r.nombre, "fuente": r.fuente} for r in rows]


async def sincronizar_festivos(
    session: AsyncSession,
    anio: int,
) -> dict:
    """
    Sincroniza el calendario de festivos del año:
      1. Intenta Calendarific (si la key existe).
      2. Si falla o key vacía, usa Ley Emiliani.
      3. Borra los festivos previos de ese año y persiste los nuevos.

    Retorna dict con fuente usada, cantidad, mensaje.
    """
    fuente_usada = "LEY_EMILIANI"
    festivos: List[dict] = []
    calendarific_error: Optional[str] = None

    try:
        cf = await obtener_festivos_calendarific(anio)
        if cf:
            festivos = cf
            fuente_usada = "CALENDARIFIC"
        else:
            calendarific_error = "Calendarific respondió con lista vacía"
    except CalendarificError as exc:
        calendarific_error = str(exc)
        logger.warning("Calendarific no disponible para %s: %s", anio, exc)

    if fuente_usada == "LEY_EMILIANI":
        festivos = [{"fecha": f["fecha"], "nombre": f["nombre"]}
                    for f in festivos_colombia(anio)]

    # Borrar festivos previos del año
    existentes = (
        await session.execute(
            select(NominaFestivoCalendario).where(NominaFestivoCalendario.anio == anio)
        )
    ).scalars().all()
    for e in existentes:
        await session.delete(e)
    await session.flush()

    # Insertar nuevos
    for f in festivos:
        nuevo = NominaFestivoCalendario(
            anio=anio,
            fecha=f["fecha"],
            nombre=f["nombre"],
            fuente=fuente_usada,
        )
        session.add(nuevo)
    await session.commit()

    return {
        "anio": anio,
        "fuente": fuente_usada,
        "cantidad": len(festivos),
        "calendarific_error": calendarific_error,
        "mensaje": f"Se sincronizaron {len(festivos)} festivos para {anio} desde {fuente_usada}.",
    }
