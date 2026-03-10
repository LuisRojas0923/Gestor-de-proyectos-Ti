"""
Extractor especializado para PDFs de SEGUROS HDI.
Implementa los 7 pasos de normalización solicitados por el usuario.
"""

import io
import re
import logging
import collections
from typing import List, Dict, Any, Tuple
import pdfplumber
import pandas as pd

logger = logging.getLogger(__name__)

def _formatear_nombre(nombre: str) -> str:
    """Invierte el nombre de 'Nombres Apellidos' a 'Apellidos Nombres'."""
    if not nombre: return ""
    palabras = nombre.upper().strip().split()
    if len(palabras) == 3:
        # Ejemplo: EIMAR BECERRA ALVAREZ -> BECERRA ALVAREZ EIMAR
        return f"{palabras[1]} {palabras[2]} {palabras[0]}"
    elif len(palabras) >= 4:
        # Ejemplo: ROBERTO ANTONIO AGUDELO QUINONES -> AGUDELO QUINONES ROBERTO ANTONIO
        apellidos = " ".join(palabras[-2:])
        nombres = " ".join(palabras[:-2])
        return f"{apellidos} {nombres}"
    return nombre.upper()

def _limpiar_numero(valor: Any) -> float:
    """Limpia strings con $, comas y otros caracteres para convertir a float."""
    if valor is None or valor == "":
        return 0.0
    s = str(valor).replace("$", "").replace(",", "").replace("\u00A0", " ").strip()
    s = re.sub(r"[^0-9\.\-]", "", s)
    try:
        if not s: return 0.0
        val = float(s)
        # Heurística: Si el valor es > 1M, es VALOR ASEGURADO, no la PRIMA.
        if val > 1000000:
            return 0.0
        return val
    except ValueError:
        return 0.0

def _find_column(columns: List[str], keywords: List[str]) -> str:
    """Busca una columna que contenga alguna de las palabras clave."""
    for col in columns:
        col_up = str(col).upper().strip()
        for k in keywords:
            if k in col_up:
                return col
    return ""

def _extraer_por_regex(text: str) -> List[Dict[str, Any]]:
    """Fallback por texto puro buscando el patrón de HDI."""
    rows = []
    # Patrón: [CERT] [NOV] [TIPO P/D] [ID] [NAME...] [$ VALOR_ASEGURADO] [$ PRIMA_ANUAL] [$ EXTRAPRIMA] [$ PRIMA_COBRO]
    pattern = re.compile(
        r"(\d+)\s+[A-Z]+\s+([PD])\s+(\d{5,12})\s+(.*?)\s+\d+\s+1\s+.*?\$?\s*[\d,.]+\s+.*?\$?\s*[\d,.]+\s+.*?\$?\s*[\d,.]+\s+.*?\$?\s*([\d,.]+)\s*$",
        re.MULTILINE
    )
    
    if not text:
        return []

    for line in text.split("\n"):
        m = pattern.search(line.strip())
        if m:
            tipo = m.group(2)
            if tipo == "P": # Paso 2: Filtrar por TIPO = "P"
                cedula_raw = m.group(3)
                nombre_raw = m.group(4).strip()
                valor = _limpiar_numero(m.group(5))
                
                if valor > 0:
                    # Paso 3: Reemplazos específicos
                    cedula, nombre = _aplicar_reemplazos(cedula_raw, nombre_raw)
                    
                    rows.append({
                        "cedula": cedula,
                        "nombre_asociado": _formatear_nombre(nombre),
                        "empresa": "REFRIDCOL",
                        "valor": valor,
                        "concepto": "SEGURO HDI VALOR", # Paso 7
                    })
    return rows

def _aplicar_reemplazos(cedula: str, nombre: str) -> Tuple[str, str]:
    """Aplica las reglas del Paso 3 de normalización."""
    # IDs
    if cedula == "1116235786": cedula = "66903320"
    if cedula == "31282865": cedula = "31231202"
    
    # Nombres
    n_up = nombre.upper()
    if "HECTOR PAUL CRUZ" in n_up: nombre = "MARIBEL TORRES AGUDELO"
    if "ESPERANZA AGUADO CORTES" in n_up: nombre = "GLORIA AGUDELO DE TORRES"
    
    return cedula, nombre

def normalizar_df(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza el DataFrame siguiendo los 7 pasos."""
    df = df.copy()
    df = df.dropna(axis=1, how='all')
    if len(df.columns) < 5: return pd.DataFrame()

    # Paso 1: Encontrar encabezados
    # Buscamos la columna de IDENTIFICACION por contenido
    id_col_idx = -1
    for i in range(min(6, len(df.columns))):
        col_vals = df.iloc[:, i].astype(str).str.strip().tolist()
        if any(re.match(r"^\d{7,12}(\.0)?$", v) for v in col_vals):
            id_col_idx = i
            break
    
    if id_col_idx == -1: return pd.DataFrame()

    tipo_col_idx = id_col_idx - 1 if id_col_idx > 0 else -1
    nombre_col_idx = id_col_idx + 1 if id_col_idx < len(df.columns) -1 else -1
    valor_col_idx = len(df.columns) - 1 # Paso 4: Prima Cobro es la última

    valid_rows = []
    for _, row in df.iterrows():
        # Paso 2: Filtrar solo por TIPO = "P"
        tipo = ""
        if tipo_col_idx != -1:
            tipo = str(row.iloc[tipo_col_idx]).strip().upper()
        if "P" not in tipo: continue

        # Paso 3: Identificación
        raw_id = str(row.iloc[id_col_idx]).strip().split(".")[0]
        id_val = re.sub(r"[^0-9]", "", raw_id)
        if not id_val or len(id_val) < 5: continue

        # Nombre
        nombre = ""
        if nombre_col_idx != -1:
            nombre = str(row.iloc[nombre_col_idx]).strip().split("  ")[0]

        # Paso 4 y 6: Valor (Prima Cobro -> VALOR)
        valor = _limpiar_numero(row.iloc[valor_col_idx])
        if valor <= 0: continue # Ignorar filas sin valor de cobro real

        # Paso 3: Aplicar reemplazos
        id_val, nombre = _aplicar_reemplazos(id_val, nombre)
        nombre = _formatear_nombre(nombre)

        valid_rows.append({
            "cedula": id_val,
            "nombre_asociado": nombre,
            "empresa": "REFRIDCOL",
            "valor": valor,
            "concepto": "SEGURO HDI VALOR" # Paso 7
        })

    return pd.DataFrame(valid_rows)

def extraer_hdi(
    archivos_binarios: List[bytes]
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """Procesa PDFs de HDI con la lógica de 7 pasos y redundancia."""
    all_rows: List[Dict[str, Any]] = []
    warnings: List[str] = []
    vistos_global = set() # (cedula, valor) para evitar duplicados entre métodos

    for contenido in archivos_binarios:
        try:
            with pdfplumber.open(io.BytesIO(contenido)) as pdf:
                for page in pdf.pages:
                    page_table_rows = []
                    
                    # 1. TABLAS
                    tables = page.extract_tables()
                    if not tables:
                        tables = page.extract_tables(table_settings={
                            "vertical_strategy": "text", "horizontal_strategy": "text"
                        })
                    
                    for table in tables:
                        df_norm = normalizar_df(pd.DataFrame(table))
                        for _, row in df_norm.iterrows():
                            page_table_rows.append(dict(row))
                    
                    all_rows.extend(page_table_rows)

                    # 2. REGEX (Sellar lo que las tablas pierden)
                    text = page.extract_text()
                    if text:
                        # Contamos qué extrajeron las tablas para no duplicar en el regex
                        table_counts = collections.Counter((r["cedula"], r["valor"]) for r in page_table_rows)
                        regex_counts = collections.Counter()
                        
                        for row in _extraer_por_regex(text):
                            key = (row["cedula"], row["valor"])
                            # Solo agregamos si el regex encuentra MÁS instancias de las que las tablas detectaron
                            if regex_counts[key] >= table_counts[key]:
                                all_rows.append(row)
                            regex_counts[key] += 1

        except Exception as e:
            logger.error(f"Error procesando HDI: {e}")
            warnings.append(str(e))

    # CONSOLIDACIÓN: Agrupar por cédula y sumar valores
    consolidated_dict: Dict[str, Dict[str, Any]] = {}
    for row in all_rows:
        cedula = row["cedula"]
        if cedula in consolidated_dict:
            consolidated_dict[cedula]["valor"] += row["valor"]
        else:
            # Copiamos para no mutar el original si fuera necesario
            consolidated_dict[cedula] = row.copy()
    
    all_rows = list(consolidated_dict.values())

    total_valor = sum(r["valor"] for r in all_rows)
    summary = {
        "total_asociados": len(all_rows),
        "total_filas_consolidadas": len(all_rows),
        "total_valor": round(total_valor, 2),
        "archivos_procesados": len(archivos_binarios),
    }
    
    return all_rows, summary, warnings
