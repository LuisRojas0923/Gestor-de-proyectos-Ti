"""
Cliente HTTP para la API de Calendarific (https://calendarific.com).

Solo se usa para sincronizar el calendario de festivos nacionales de
Colombia. Si CALENDARIFIC_API_KEY está vacía o la petición falla, el
service de festivos cae automáticamente al fallback Ley Emiliani.

Estructura de respuesta relevante:
  response.holidays = [{
    "name": "Independence Day",
    "date": {"iso": "2026-07-20"},
    ...
  }, ...]
"""
import logging
from datetime import date
from typing import List

import httpx

from ...config import config

logger = logging.getLogger(__name__)

CALENDARIFIC_URL = "https://calendarific.com/api/v2/holidays"
COUNTRY = "CO"
TIMEOUT_SECONDS = 5.0


class CalendarificError(Exception):
    """Levantada cuando la API falla o no hay key configurada."""


async def obtener_festivos_calendarific(anio: int) -> List[dict]:
    """
    Retorna lista de dicts {fecha, nombre} para los festivos de Colombia
    del año. Levanta CalendarificError si:
      - CALENDARIFIC_API_KEY está vacía
      - La petición falla (timeout, 4xx, 5xx)
      - La respuesta no tiene la estructura esperada
    """
    api_key = getattr(config, "calendarific_api_key", None)
    if not api_key:
        raise CalendarificError("CALENDARIFIC_API_KEY no configurada")

    params = {
        "api_key": api_key,
        "country": COUNTRY,
        "year": anio,
        "type": "national",
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            resp = await client.get(CALENDARIFIC_URL, params=params)
    except httpx.TimeoutException as exc:
        raise CalendarificError(f"Timeout al consultar Calendarific: {exc}") from exc
    except httpx.HTTPError as exc:
        raise CalendarificError(f"Error HTTP al consultar Calendarific: {exc}") from exc

    if resp.status_code != 200:
        raise CalendarificError(
            f"Calendarific respondió {resp.status_code}: {resp.text[:200]}"
        )

    try:
        data = resp.json()
        holidays = data["response"]["holidays"]
    except (KeyError, ValueError, TypeError) as exc:
        raise CalendarificError(f"Estructura de respuesta inesperada: {exc}") from exc

    resultado: List[dict] = []
    for h in holidays:
        try:
            fecha_str = h["date"]["iso"]
            fecha_obj = date.fromisoformat(fecha_str)
            nombre = h["name"]
        except (KeyError, ValueError, TypeError):
            logger.warning("Festivo de Calendarific con formato inválido: %s", h)
            continue
        resultado.append({"fecha": fecha_obj, "nombre": nombre})

    resultado.sort(key=lambda x: x["fecha"])
    return resultado
