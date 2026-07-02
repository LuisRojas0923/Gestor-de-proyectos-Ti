"""
Festivos nacionales de Colombia aplicando la Ley Emiliani (Ley 51 de 1983).

La Ley Emiliani traslada al lunes siguiente los festivos que caen en domingo.
Los festivos que NO se trasladan son los que caen en lunes (siguen igual),
los que caen en martes/miércoles/jueves/viernes (siguen igual) y los que
caen en sábado (siguen igual, no se trasladan).

Reglas:
  - Si festivo cae en domingo → se mueve al lunes siguiente.
  - Demás días de semana → se queda en la fecha original.
  - Festivos basados en Pascua: Jueves Santo, Viernes Santo, Ascensión,
    Corpus Christi, Sagrado Corazón.

Total: 18 festivos al año.
"""
from datetime import date, timedelta
from typing import List, Dict


def pascua(anio: int) -> date:
    """
    Calcula la fecha del Domingo de Pascua para un año dado.
    Algoritmo de Meeus/Jones/Butcher (válido para años del calendario
    gregoriano, incluyendo 2026-2030).
    """
    a = anio % 19
    b = anio // 100
    c = anio % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = ((h + l - 7 * m + 114) % 31) + 1
    return date(anio, mes, dia)


def _trasladar_a_lunes(d: date) -> date:
    """
    Ley 51/1983 (Ley Emiliani): si el festivo cae en domingo,
    se traslada al lunes siguiente.
    """
    if d.weekday() == 6:  # domingo
        return d + timedelta(days=1)
    return d


def _emiliani(d: date) -> date:
    """Alias para claridad en el código de los festivos."""
    return _trasladar_a_lunes(d)


def festivos_colombia(anio: int) -> List[Dict]:
    """
    Retorna los 18 festivos nacionales de Colombia para el año dado,
    con la fecha efectiva ya con Ley Emiliani aplicada.

    Cada item: {"fecha": date, "nombre": str, "trasladado": bool}
    """
    pascua_domingo = pascua(anio)

    # Fijos (relativos a Pascua): fecha original antes de Ley Emiliani
    fijos = [
        (date(anio, 1, 1),   "Año Nuevo"),
        (date(anio, 5, 1),   "Día del Trabajo"),
        (date(anio, 7, 20),  "Día de la Independencia"),
        (date(anio, 8, 7),   "Batalla de Boyacá"),
        (date(anio, 12, 8),  "Inmaculada Concepción"),
        (date(anio, 12, 25), "Navidad"),
    ]
    # Relativos a Pascua (antes de Emiliani)
    pascua_fijos = [
        (pascua_domingo - timedelta(days=3), "Jueves Santo"),
        (pascua_domingo - timedelta(days=2), "Viernes Santo"),
        (pascua_domingo + timedelta(days=39), "Ascensión del Señor"),
        (pascua_domingo + timedelta(days=60), "Corpus Christi"),
        (pascua_domingo + timedelta(days=68), "Sagrado Corazón"),
    ]
    # Trasladables (Emiliani)
    trasladables = [
        (date(anio, 1, 6),   "Día de los Reyes Magos"),
        (date(anio, 3, 19),  "Día de San José"),
        (date(anio, 6, 29),  "San Pedro y San Pablo"),
        (date(anio, 8, 15),  "Asunción de la Virgen"),
        (date(anio, 10, 12), "Día de la Raza"),
        (date(anio, 11, 1),  "Día de Todos los Santos"),
        (date(anio, 11, 11), "Independencia de Cartagena"),
    ]

    resultado: List[Dict] = []
    for original, nombre in fijos:
        resultado.append({"fecha": original, "nombre": nombre, "trasladado": False})

    for original, nombre in pascua_fijos:
        efectivo = _emiliani(original)
        resultado.append({
            "fecha": efectivo,
            "nombre": nombre,
            "trasladado": efectivo != original,
        })

    for original, nombre in trasladables:
        efectivo = _emiliani(original)
        resultado.append({
            "fecha": efectivo,
            "nombre": nombre,
            "trasladado": efectivo != original,
        })

    resultado.sort(key=lambda x: x["fecha"])
    return resultado
