"""
Extractor especializado para archivos Excel de RECORDAR.

Formato esperado:
- Archivo Excel (.xlsx)
- Ignorar las 3 primeras filas (los encabezados empiezan en la fila 4).
- Se toman las columnas 'Identificacion' y 'Valor Total'.
- Se renombran internamente a 'CEDULA' y 'VALOR'.
"""

import io
import re
import logging
import pandas as pd
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def _limpiar_numero(valor: Any) -> float:
    """Limpia la representación de moneda a float."""
    if pd.isna(valor) or valor == "": return 0.0
    if isinstance(valor, (int, float)): return float(valor)
    
    s = str(valor).replace("$", "").replace(",", "").strip()
    s = re.sub(r"[^0-9\.\-]", "", s)
    try:
        if not s: return 0.0
        return float(s)
    except ValueError:
        return 0.0

def extraer_recordar(
    archivos_binarios: List[bytes],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa 1..N archivos Excel de RECORDAR.
    """
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []

    total_filas = 0
    total_valor = 0.0

    for file_idx, contenido in enumerate(archivos_binarios):
        try:
            # Leer excel ignorando las 3 primeras filas (encabezados en la fila 4, índice 3)
            # skiprows evalúa cuántas filas descartar desde el principio.
            df = pd.read_excel(io.BytesIO(contenido), skiprows=3)

            # Limpiar nombres de columnas para búsqueda segura
            columnas_limpias = {col: str(col).strip().upper() for col in df.columns}
            
            # Buscar columnas necesarias
            col_id = None
            col_val = None
            for original_col, clean_col in columnas_limpias.items():
                if "IDENTIFICACION" in clean_col or "IDENTIFICACIÓN" in clean_col:
                    col_id = original_col
                if "VALOR TOTAL" in clean_col:
                    col_val = original_col

            if not col_id or not col_val:
                warnings.append(
                    f"Archivo {file_idx+1}: No se encontraron las columnas esperadas ('Identificacion', 'Valor Total'). "
                    f"Columnas detectadas: {list(columnas_limpias.values())}"
                )
                continue

            for _, row in df.iterrows():
                # Extraer cédula
                identificacion = str(row[col_id]).strip()
                if not identificacion or identificacion.lower() == 'nan':
                    continue
                
                # Manejar formato float de pandas (evitar que 123.0 se convierta en 1230)
                if identificacion.endswith('.0'):
                    identificacion = identificacion[:-2]
                
                cedula = re.sub(r"[^0-9]", "", identificacion)
                if not cedula:
                    continue
                
                # Extraer valor
                raw_valor = row[col_val]
                valor = _limpiar_numero(raw_valor)

                if valor <= 0:
                    continue

                rows.append({
                    "cedula": cedula,
                    "nombre_asociado": "", # Se enriquecerá con el ERP en el router
                    "empresa": "", # Se enriquecerá con el ERP en el router
                    "valor": valor,
                    "concepto": "RECORDAR",
                })
                total_filas += 1
                total_valor += valor
                
        except Exception as e:
            warnings.append(f"Error procesando el archivo Excel {file_idx + 1}: {e}")
            logger.exception(f"Error en recordar_extractor archivo {file_idx + 1}")

    summary = {
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": total_filas,
        "total_valor": total_valor,
        "archivos_procesados": len(archivos_binarios),
    }

    return rows, summary, warnings
