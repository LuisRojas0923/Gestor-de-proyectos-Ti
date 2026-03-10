"""
Extractor especializado para archivos Excel de LIBRANZA DAVIVIENDA.
"""

import io
import logging
import pandas as pd
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def extraer_davivienda_libranza(
    archivos_binarios: List[bytes],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa 1..N archivos Excel de LIBRANZA DAVIVIENDA.

    Returns:
        (rows, summary, warnings)
        rows: lista de dicts con {cedula, nombre_asociado, empresa, valor, concepto}
        summary: estadísticas globales
        warnings: lista de advertencias
    """
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    total_filas = 0
    total_valor = 0.0

    for file_idx, contenido in enumerate(archivos_binarios):
        try:
            # Leer excel ignorando las primeras 11 filas (empezando en la 12 como header)
            df = pd.read_excel(io.BytesIO(contenido), skiprows=11)
            
            # Limpiar nombres de columnas (quitar espacios extra al inicio/fin)
            df.columns = df.columns.str.strip()
            
            # Verificar columnas requeridas
            if 'Cedula' not in df.columns or 'Vr Cuota más 4x1000' not in df.columns:
                warnings.append(f"Archivo {file_idx + 1}: No se encontraron las columnas 'Cedula' o 'Vr Cuota más 4x1000'.")
                continue
            
            # Dropear nulos en cedula para ignorar filas en blanco o el resumen
            df = df.dropna(subset=['Cedula'])
            
            for index, row in df.iterrows():
                try:
                    cedula_raw = str(row['Cedula']).strip()
                    # Si trae .0 lo quitamos
                    if cedula_raw.endswith('.0'):
                        cedula_raw = cedula_raw[:-2]
                        
                    # Filtrar posibles filas que no son cedulas (resúmenes)
                    if not cedula_raw.isdigit():
                        continue
                        
                    cuota_raw = row['Vr Cuota más 4x1000']
                    
                    if pd.isna(cuota_raw):
                        continue
                        
                    if isinstance(cuota_raw, str):
                        cuota_raw = cuota_raw.replace('$', '').replace(',', '').strip()
                    
                    cuota_val = float(cuota_raw)
                    
                    if cuota_val <= 0:
                        continue
                        
                    rows.append({
                        "cedula": cedula_raw,
                        "nombre_asociado": "", # Se llenará en el router via ERP
                        "empresa": "", # Se llenará en el router via ERP
                        "valor": cuota_val, # VALOR MES
                        "concepto": "LIBRANZA DAVIVIENDA",
                    })
                    
                    total_filas += 1
                    total_valor += cuota_val
                    
                except Exception as e:
                    warnings.append(f"Fila ignorada en archivo {file_idx + 1} por error de parseo: {e}")
                    
        except Exception as e:
             warnings.append(f"Error procesando el archivo {file_idx + 1}: {e}")

    summary = {
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": total_filas,
        "total_valor": total_valor,
        "archivos_procesados": len(archivos_binarios),
    }

    return rows, summary, warnings
