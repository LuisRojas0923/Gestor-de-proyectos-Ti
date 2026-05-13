"""
Extractor especializado para archivos PDF de CAMPOSANTO (Funerarias y Camposantos Metropolitano).

Formato del PDF de entrada real (AN-3000006838-ENE-2026.pdf):
    Documento No:48572702         Nombre: ACOSTA CHOCUE GLORIA INES        $   20.600
    Documento No:67032011         Nombre: AGUAS MONTES GISEL                $   34.400

Notas sobre el formato:
- "Documento No:" seguido del número de cédula SIN espacio
- "Nombre:" seguido del nombre completo
- "$" seguido del valor con puntos como separadores de miles
- El PDF usa múltiples espacios (columnas) entre los campos
- pdfplumber puede extraer esto como: línea completa, o value separado en otra línea
"""

import io
import re
import logging
from typing import List, Dict, Any, Tuple

import pdfplumber

logger = logging.getLogger(__name__)


def _parse_numero(tok: str) -> float:
    """Convierte '20.600' o '20600' a float (punto = separador de miles en Colombia)."""
    clean = tok.replace(".", "").replace(",", "").replace("$", "").strip()
    try:
        return float(clean)
    except ValueError:
        return 0.0


def extraer_camposanto(
    archivos_binarios: List[bytes],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa 1..N archivos PDF de CAMPOSANTO.
    
    Usa múltiples estrategias de parseo para manejar las variaciones de extracción
    de pdfplumber en PDFs con formato de columnas.
    """
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []

    # ── Regex variantes ──────────────────────────────────────────────────────
    # Los PDFs con columnas tabuladas pueden ser extraídos de varias formas.
    # Cubrimos todas las variaciones:
    
    # V1: Todo en una línea con espacios múltiples entre campos
    # "Documento No:48572702    Nombre: ACOSTA CHOCUE GLORIA INES    $   20.600"
    RE_V1 = re.compile(
        r"Documento\s*No:?\s*(\d+)\s+Nombre:\s+(.+?)\s+\$\s*([\d.,]+)",
        re.IGNORECASE,
    )
    
    # V2: "Nombre:" sin espacio antes del nombre (pegado)  
    # "Documento No:48572702 Nombre:ACOSTA CHOCUE GLORIA INES $ 20.600"
    RE_V2 = re.compile(
        r"Documento\s*No:?\s*(\d+)\s+Nombre:(\S[^$]+?)\s*\$\s*([\d.,]+)",
        re.IGNORECASE,
    )
    
    # V3: Solo cedula y nombre en una línea, valor en línea siguiente
    # Línea 1: "Documento No:48572702 Nombre: ACOSTA CHOCUE GLORIA INES"
    # Línea 2: "$ 20.600"
    RE_DOC = re.compile(r"Documento\s*No:?\s*(\d+)", re.IGNORECASE)
    RE_NOMBRE = re.compile(r"Nombre:\s*(.*)", re.IGNORECASE)
    RE_VALOR = re.compile(r"\$\s*([\d.,]+)")

    total_filas = 0
    total_valor = 0.0

    for file_idx, contenido in enumerate(archivos_binarios):
        try:
            # Extraer texto de todo el PDF
            texto_completo = ""
            with pdfplumber.open(io.BytesIO(contenido)) as pdf:
                for page in pdf.pages:
                    # Usar extract_text con tolerancias para manejar columnas
                    txt = page.extract_text(
                        x_tolerance=5,  # Tolerancia horizontal (columnas)
                        y_tolerance=3,  # Tolerancia vertical (filas)
                    ) or ""
                    texto_completo += txt + "\n"
            
            logger.info(
                f"Archivo {file_idx+1}: {len(texto_completo)} chars extraídos. "
                f"Muestra: {texto_completo[:200]!r}"
            )

            # ── ESTRATEGIA 1: Regex V1 en texto completo ─────────────────────
            matches = RE_V1.findall(texto_completo)
            estrategia = "V1"
            
            if not matches:
                # ── ESTRATEGIA 2: Regex V2 ────────────────────────────────────
                matches = RE_V2.findall(texto_completo)
                estrategia = "V2"
            
            if matches:
                logger.info(f"Estrategia {estrategia}: {len(matches)} registros en archivo {file_idx+1}")
                for cedula, nombre, valor_str in matches:
                    cedula = cedula.strip()
                    nombre = nombre.strip()
                    # Limpiar ruido al final del nombre (espacios o textos pegados)
                    nombre = re.sub(r'\s{3,}.*$', '', nombre).strip()
                    valor = _parse_numero(valor_str)
                    
                    if valor <= 0 or "TOTAL" in nombre.upper():
                        continue
                    
                    rows.append({
                        "cedula": cedula,
                        "nombre_asociado": nombre,
                        "empresa": "REFRIDCOL",
                        "valor": valor,
                        "concepto": "CAMPOSANTO",
                    })
                    total_filas += 1
                    total_valor += valor
                    
            else:
                # ── ESTRATEGIA 3: Parseo línea a línea ───────────────────────
                logger.warning(
                    f"Estrategias V1 y V2 sin resultados en archivo {file_idx+1}. "
                    "Aplicando parseo línea a línea."
                )
                warnings.append(f"Archivo {file_idx+1}: Usando parseo alternativo (línea a línea).")

                lineas = texto_completo.splitlines()
                i = 0
                encontrados = 0
                while i < len(lineas):
                    linea = lineas[i]
                    
                    m_doc = RE_DOC.search(linea)
                    if not m_doc:
                        i += 1
                        continue
                    
                    cedula = m_doc.group(1).strip()
                    
                    # Buscar nombre en la misma línea
                    m_nombre = RE_NOMBRE.search(linea)
                    nombre_raw = m_nombre.group(1) if m_nombre else ""
                    
                    # Si no hay nombre en la línea, buscar en la siguiente
                    if not nombre_raw and i + 1 < len(lineas):
                        m_nombre2 = RE_NOMBRE.search(lineas[i + 1])
                        if m_nombre2:
                            nombre_raw = m_nombre2.group(1)
                            i += 1
                    
                    # Buscar valor: puede estar en nombre_raw o en las próximas líneas
                    m_val = RE_VALOR.search(nombre_raw)
                    if m_val:
                        nombre = nombre_raw[:m_val.start()].strip()
                        valor = _parse_numero(m_val.group(1))
                    else:
                        nombre = nombre_raw.strip()
                        valor = 0.0
                        # Buscar en próximas 3 líneas
                        for j in range(1, 4):
                            if i + j >= len(lineas):
                                break
                            m_val2 = RE_VALOR.search(lineas[i + j])
                            if m_val2:
                                valor = _parse_numero(m_val2.group(1))
                                i += j
                                break
                    
                    if valor <= 0 or "TOTAL" in nombre.upper():
                        i += 1
                        continue
                    
                    rows.append({
                        "cedula": cedula,
                        "nombre_asociado": nombre,
                        "empresa": "REFRIDCOL",
                        "valor": valor,
                        "concepto": "CAMPOSANTO",
                    })
                    total_filas += 1
                    total_valor += valor
                    encontrados += 1
                    i += 1

                if encontrados == 0:
                    # ESTRATEGIA 4: Texto fusionado (quitar todos los saltos de línea)
                    logger.warning(f"Estrategia 3 sin resultados. Intentando fusión de texto.")
                    texto_fused = " ".join(l.strip() for l in lineas if l.strip())
                    matches_f = RE_V1.findall(texto_fused)
                    
                    if not matches_f:
                        matches_f = RE_V2.findall(texto_fused)
                    
                    if matches_f:
                        logger.info(f"Estrategia fusión: {len(matches_f)} registros")
                        for cedula, nombre, valor_str in matches_f:
                            cedula = cedula.strip()
                            nombre = re.sub(r'\s{3,}.*$', '', nombre.strip()).strip()
                            valor = _parse_numero(valor_str)
                            if valor <= 0 or "TOTAL" in nombre.upper():
                                continue
                            rows.append({
                                "cedula": cedula,
                                "nombre_asociado": nombre,
                                "empresa": "REFRIDCOL",
                                "valor": valor,
                                "concepto": "CAMPOSANTO",
                            })
                            total_filas += 1
                            total_valor += valor
                    else:
                        warnings.append(
                            f"Archivo {file_idx+1}: No se encontraron registros. "
                            "Muestra del texto: " + texto_completo[:300]
                        )
                        logger.error(
                            f"Todas las estrategias fallaron. "
                            f"Texto completo (primeros 500 chars): {texto_completo[:500]!r}"
                        )

        except Exception as e:
            warnings.append(f"Error procesando el archivo PDF {file_idx + 1}: {e}")
            logger.exception(f"Error en camposanto_extractor archivo {file_idx + 1}")

    summary = {
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": total_filas,
        "total_valor": total_valor,
        "archivos_procesados": len(archivos_binarios),
    }

    return rows, summary, warnings
