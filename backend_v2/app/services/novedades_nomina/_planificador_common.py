"""
Sprint S7 — Helpers compartidos del planificador semanal.

Modulo interno (prefijo _) con funciones puras reutilizadas por:
  - planificador_calculo.py (pre_calcular_plan)
  - planificador_persistencia.py (confirmar_plan)
"""
import logging
from datetime import date, time
from typing import Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from .horas_extras_calculo import HORAS_ORDINARIAS_DIARIAS
from .horas_extras_service import listar_catalogo_vigente, obtener_factor_por_nivel

logger = logging.getLogger(__name__)

_DIA_NOMBRES = {
    1: "LUNES", 2: "MARTES", 3: "MIERCOLES",
    4: "JUEVES", 5: "VIERNES", 6: "SABADO", 7: "DOMINGO",
}
CODIGOS_NOVEDAD_SUPRESION_PLAN = {"VAC", "LIC", "INC", "AUS"}
FACTOR_PRESTACIONAL_DEFAULT = 0.52436
CATALOGO_HE_DEFAULT = {
    "HED": {"codigo": "HED", "factor_hora_ordinaria": 1.25, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    "HEN": {"codigo": "HEN", "factor_hora_ordinaria": 1.75, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    "HEFD": {"codigo": "HEFD", "factor_hora_ordinaria": 2.05, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    "HEFN": {"codigo": "HEFN", "factor_hora_ordinaria": 2.55, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
}


def _horas_trabajadas_dia(
    entrada: Optional[time],
    salida: Optional[time],
    minutos_almuerzo: int,
) -> float:
    """Replica la regla de _aplicar_registro_diario."""
    if entrada is None or salida is None:
        return 0.0
    minutos_brutos = (salida.hour * 60 + salida.minute) - (entrada.hour * 60 + entrada.minute)
    if minutos_brutos < 0:
        return 0.0
    minutos_efectivos = minutos_brutos - max(0, minutos_almuerzo)
    return round(max(0.0, minutos_efectivos / 60.0), 2)


async def _resolver_catalogo_y_factor(
    session: AsyncSession,
    fecha_referencia: date,
    niveles_riesgo: List[str],
) -> Tuple[List[Dict], Dict[str, float]]:
    """Cachea catalogo vigente y factor prestacional por nivel ARL.

    Devuelve (catalogo, factores) donde factores es dict nivel -> factor.
    """
    catalogo_rows = await listar_catalogo_vigente(session)
    catalogo: List[Dict] = [
        {
            "codigo": r.codigo,
            "factor_hora_ordinaria": float(r.factor_hora_ordinaria),
            "acredita_bolsa": bool(r.acredita_bolsa),
            "descuenta_bolsa": bool(r.descuenta_bolsa),
            "unidad": r.unidad,
        }
        for r in catalogo_rows
    ]
    codigos_catalogo = {item["codigo"] for item in catalogo}
    for codigo, item in CATALOGO_HE_DEFAULT.items():
        if codigo not in codigos_catalogo:
            logger.warning("Catálogo HE sin código '%s'; se usa factor default.", codigo)
            catalogo.append(item)

    factores: Dict[str, float] = {}
    for nivel in set(niveles_riesgo):
        f = await obtener_factor_por_nivel(session, nivel, fecha_referencia)
        if f is None:
            logger.warning(
                "No hay factor prestacional vigente para nivel ARL '%s'; se usa default %s.",
                nivel,
                FACTOR_PRESTACIONAL_DEFAULT,
            )
            factores[nivel] = FACTOR_PRESTACIONAL_DEFAULT
            continue
        factores[nivel] = float(
            getattr(f, "factor", getattr(f, "factor_prestacional"))
        )

    return catalogo, factores


def _calcular_dia(
    horas_dia: float,
    novedades: List[str],
    jornada_nocturna: bool,
    cat_idx: Dict[str, Dict],
    factor_prestacional: float,
    valor_hora: float,
) -> Tuple[float, float, float, Optional[str], float]:
    """Calcula HE de un solo dia.

    Returns (horas_trab, horas_ord, horas_ext, codigo_he, costo_estimado).
    """
    if any(c in CODIGOS_NOVEDAD_SUPRESION_PLAN for c in novedades):
        return 0.0, 0.0, 0.0, None, 0.0

    horas_ord = min(horas_dia, HORAS_ORDINARIAS_DIARIAS)
    horas_ext = max(0.0, horas_dia - HORAS_ORDINARIAS_DIARIAS)
    codigo_he: Optional[str] = None
    costo = 0.0
    if horas_ext > 0:
        # Si jornada nocturna, inferir HEN; en caso contrario, HED.
        if not novedades:
            codigos_candidatos = ["HEN" if jornada_nocturna else "HED"]
        else:
            codigos_candidatos = [c for c in novedades if c in cat_idx]
        if codigos_candidatos:
            codigo_he = codigos_candidatos[0]
            cat = cat_idx[codigo_he]
            factor = cat["factor_hora_ordinaria"]
            valor_bruto = horas_ext * valor_hora * factor
            carga = valor_bruto * factor_prestacional
            costo = valor_bruto + carga
    return horas_dia, horas_ord, horas_ext, codigo_he, costo
