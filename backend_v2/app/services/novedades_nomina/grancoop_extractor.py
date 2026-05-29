"""
Extractor especializado para PDFs de la cooperativa GRANCOOP.

Parsea bloques por asociado y genera filas en formato long:
CEDULA | NOMBRE ASOCIADO | EMPRESA | VALOR | CONCEPTO
"""

import io
import re
import logging
from typing import List, Dict, Any, Tuple

import pdfplumber

logger = logging.getLogger(__name__)

# Índices de las 10 columnas numéricas (orden del PDF):
# Capital(0) Interes(1) Mora(2) Vida(3) Patri(4) Capz(5) Otros(6) Gastos(7) Aporte(8) Totales(9)
IDX_CAPITAL = 0
IDX_INTERES = 1
IDX_MORA = 2
IDX_VIDA = 3
IDX_PATRI = 4
IDX_CAPZ = 5
IDX_OTROS = 6
IDX_GASTOS = 7
IDX_APORTE = 8


def _es_numero(tok: str) -> bool:
    """True si el token es numérico (ignora puntos y comas de miles)."""
    return tok.replace(".", "").replace(",", "").isdigit()


def _parse_numero(tok: str) -> int:
    """Convierte '1.234.567' o '1234567' a int."""
    return int(tok.replace(".", "").replace(",", ""))


def _extraer_cedula(lineas_detalle: List[str]) -> str:
    """
    Busca la línea con 'OBLIGACION ESTATUTARIA'.
    En esa línea, antes del texto, aparece: 206 <CEDULA>
    Ejemplo: '206 14637404 OBLIGACION ESTATUTARIA 0 0 ...'
    """
    for linea in lineas_detalle:
        if "OBLIGACION ESTATUTARIA" not in linea.upper():
            continue

        # Tomar solo el texto antes de "OBLIGACION ESTATUTARIA"
        idx = linea.upper().index("OBLIGACION ESTATUTARIA")
        antes = linea[:idx]

        # Buscar: 206 (espacio) cédula
        match = re.search(r'206\s+([\d.]+)', antes)
        if match:
            return match.group(1).replace(".", "")

        # Fallback: si están pegados (ej: "20614637404")
        match = re.search(r'206(\d{5,})', antes)
        if match:
            return match.group(1)

    return ""


def _parsear_totales(linea: str) -> List[int]:
    """
    Extrae los últimos 10 tokens numéricos de una línea 'Totales :'.
    Retorna lista de 10 enteros.
    """
    partes = linea.split()
    nums: List[int] = []
    for p in reversed(partes):
        if _es_numero(p):
            nums.append(_parse_numero(p))
        else:
            break
    nums.reverse()
    # Rellenar si hay menos de 10
    while len(nums) < 10:
        nums.append(0)
    return nums[:10]


def extraer_grancoop(
    archivos_binarios: List[bytes],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa 1..N archivos PDF de GRANCOOP.

    Returns:
        (rows, summary, warnings)
        rows: lista de dicts con {cedula, nombre_asociado, empresa, valor, concepto}
        summary: estadísticas globales
        warnings: lista de advertencias
    """
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []
    asociados_procesados = 0

    for file_idx, contenido in enumerate(archivos_binarios):
        nombre_actual = ""
        lineas_detalle: List[str] = []
        linea_totales: str = ""
        en_bloque = False

        todas_lineas: List[str] = []
        with pdfplumber.open(io.BytesIO(contenido)) as pdf:
            for page in pdf.pages:
                texto = page.extract_text() or ""
                for linea in texto.splitlines():
                    l = linea.strip()
                    if l:
                        todas_lineas.append(l)

        for linea in todas_lineas:
            lower = linea.lower()

            # Ignorar "Totales generales:" (resumen del documento)
            if linea.lower().startswith("totales generales"):
                continue

            # Detectar inicio de bloque asociado
            if linea.startswith("Asociado") and ":" in linea:
                _, nombre = linea.split(":", 1)
                nuevo_nombre = nombre.strip()

                # Si es el MISMO asociado (continuación entre páginas),
                # simplemente seguir acumulando en el bloque actual
                if en_bloque and nuevo_nombre == nombre_actual:
                    continue

                # Si es un asociado DIFERENTE, procesar el bloque previo
                if en_bloque and nombre_actual and linea_totales:
                    _procesar_bloque(
                        nombre_actual, lineas_detalle,
                        linea_totales, rows, warnings,
                    )
                    asociados_procesados += 1

                # Iniciar nuevo bloque
                nombre_actual = nuevo_nombre
                lineas_detalle = []
                linea_totales = ""
                en_bloque = True
                continue

            if not en_bloque:
                continue

            # Detectar línea de totales del asociado (NO generales)
            if linea.startswith("Totales"):
                linea_totales = linea
                continue

            # Ignorar encabezados dentro del bloque
            if linea.startswith("Documento"):
                continue
            if "cuenta de cobro" in lower:
                continue
            if "page " in lower and " of " in lower:
                continue
            if linea.startswith("Fecha de Corte"):
                continue
            if linea.startswith("Cuenta de Cobro"):
                continue

            # Línea de detalle (créditos)
            lineas_detalle.append(linea)

        # Procesar el último bloque del archivo
        if en_bloque and nombre_actual and linea_totales:
            _procesar_bloque(
                nombre_actual, lineas_detalle,
                linea_totales, rows, warnings,
            )
            asociados_procesados += 1

    # Resumen
    total_valor = sum(r["valor"] for r in rows)
    summary = {
        "total_asociados": asociados_procesados,
        "total_filas": len(rows),
        "total_valor": total_valor,
        "archivos_procesados": len(archivos_binarios),
    }

    return rows, summary, warnings


def _procesar_bloque(
    nombre: str,
    lineas_detalle: List[str],
    linea_totales: str,
    rows: List[Dict[str, Any]],
    warnings: List[str],
) -> None:
    """Procesa un bloque de asociado y genera las filas long."""
    cedula = _extraer_cedula(lineas_detalle)
    if not cedula:
        warnings.append(f"No se encontró cédula para '{nombre}'")
        return

    totales = _parsear_totales(linea_totales)

    valor_aporte = totales[IDX_APORTE]
    valor_prestamos = (
        totales[IDX_CAPITAL]
        + totales[IDX_INTERES]
        + totales[IDX_MORA]
        + totales[IDX_PATRI]
        + totales[IDX_CAPZ]
    )
    valor_adicionales = (
        totales[IDX_OTROS]
        + totales[IDX_VIDA]
        + totales[IDX_GASTOS]
    )

    conceptos = [
        ("GRANCOOP APORTES", valor_aporte),
        ("GRANCOOP PRESTAMOS", valor_prestamos),
        ("GRANCOOP ADICIONALES", valor_adicionales),
    ]

    for concepto, valor in conceptos:
        if valor > 0:
            rows.append({
                "cedula": cedula,
                "nombre_asociado": nombre,
                "empresa": "REFRIDCOL",
                "valor": valor,
                "concepto": concepto,
            })
