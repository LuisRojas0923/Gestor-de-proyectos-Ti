"""
Extractor especializado para archivos Excel de BANCO BOGOTA LIBRANZA.

Parsea el archivo Excel ignorando las primeras 6 filas (encabezado en fila 7).
Extrae "Identificación Cliente" y "Cuota", buscando
información del empleado en el ERP.
"""

import io
import logging
import pandas as pd
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def extraer_bogota_libranza(
    archivos_binarios: List[bytes],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa 1..N archivos Excel de BANCO BOGOTA LIBRANZA.

    Returns:
        (rows, summary, warnings)
        rows: lista de dicts con {cedula, nombre_asociado, empresa, valor, concepto}
        summary: estadísticas globales
        warnings: lista de advertencias (ej: columnas faltantes o datos corruptos)
    """
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    total_filas = 0
    total_valor = 0.0

    for file_idx, contenido in enumerate(archivos_binarios):
        try:
            # Leer excel ignorando las primeras 6 filas (empezando en la 7 como header)
            df = pd.read_excel(io.BytesIO(contenido), skiprows=6)
            
            # Limpiar nombres de columnas (quitar espacios extra al inicio/fin)
            df.columns = df.columns.str.strip()
            
            # Verificar columnas requeridas
            if 'Identificación Cliente' not in df.columns or 'Cuota' not in df.columns:
                warnings.append(f"Archivo {file_idx + 1}: No se encontraron las columnas 'Identificación Cliente' o 'Cuota'.")
                continue
            
            # Dropear nulos en cedula
            df = df.dropna(subset=['Identificación Cliente'])
            
            for index, row in df.iterrows():
                try:
                    cedula_raw = str(row['Identificación Cliente']).strip()
                    # Si trae .0 lo quitamos
                    if cedula_raw.endswith('.0'):
                        cedula_raw = cedula_raw[:-2]
                        
                    # Filtrar posibles filas de totales que no son cedulas (ej "Total General")
                    if not cedula_raw.isdigit():
                        continue
                        
                    cuota_raw = row['Cuota']
                    # Limpiar cuota y convertir a float
                    if pd.isna(cuota_raw):
                        continue
                        
                    # Intentar convertir valor
                    # Si es un string con comas o signos de dólar
                    if isinstance(cuota_raw, str):
                        cuota_raw = cuota_raw.replace('$', '').replace(',', '').strip()
                    
                    cuota_val = float(cuota_raw)
                    
                    if cuota_val <= 0:
                        continue
                        
                    # Añadir a rows. Solo usamos los campos básicos requeridos para luego
                    # cruzarlos con ERP y armar la salida final en el router.
                    rows.append({
                        "cedula": cedula_raw,
                        "nombre_asociado": "", # Se llenará en el router via ERP
                        "empresa": "", # Se llenará en el router via ERP
                        "valor": cuota_val, # VALOR MES
                        "concepto": "BOGOTA LIBRANZA",
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
