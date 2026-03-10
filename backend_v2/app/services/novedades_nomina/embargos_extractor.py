"""
Extractor especializado para archivos Excel de EMBARGOS.

Parsea el archivo Excel ignorando las primeras 5 filas (encabezado en fila 6).
Extrae "CEDULA", "NOMBRE" y "VALOR QUINCENAL".
El valor final se calcula como VALOR QUINCENAL * 2.
"""

import io
import logging
import pandas as pd
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def extraer_embargos(
    archivos_binarios: List[bytes],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa 1..N archivos Excel de EMBARGOS.

    Returns:
        (rows, summary, warnings)
        rows: lista de dicts con {cedula, nombre_asociado, empresa, valor, concepto, valor_quincenal_original}
        summary: estadísticas globales
        warnings: lista de advertencias (ej: columnas faltantes o datos corruptos)
    """
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    total_filas = 0
    total_valor = 0.0

    for file_idx, contenido in enumerate(archivos_binarios):
        try:
            # Leer excel ignorando las primeras 5 filas (empezando en la 6 como header)
            df = pd.read_excel(io.BytesIO(contenido), skiprows=5)
            
            # Limpiar nombres de columnas
            df.columns = df.columns.astype(str).str.strip().str.upper()
            
            # Verificar columnas requeridas
            if 'CEDULA' not in df.columns or 'VALOR QUINCENAL' not in df.columns:
                warnings.append(f"Archivo {file_idx + 1}: No se encontraron las columnas 'CEDULA' o 'VALOR QUINCENAL'. Columnas encontradas: {df.columns.tolist()}")
                continue
            
            # Dropear nulos en cedula
            df = df.dropna(subset=['CEDULA'])
            
            for index, row in df.iterrows():
                try:
                    cedula_raw = str(row['CEDULA']).strip()
                    # Si trae .0 lo quitamos
                    if cedula_raw.endswith('.0'):
                        cedula_raw = cedula_raw[:-2]
                        
                    if not cedula_raw or not cedula_raw.isdigit():
                        continue
                        
                    cuota_raw = row['VALOR QUINCENAL']
                    
                    if pd.isna(cuota_raw):
                        continue
                        
                    # Intentar convertir valor
                    if isinstance(cuota_raw, str):
                        cuota_raw = cuota_raw.replace('$', '').replace(',', '').strip()
                    
                    cuota_val = float(cuota_raw)
                    
                    if cuota_val <= 0:
                        continue
                        
                    # El valor se multiplica por 2 según los requerimientos
                    valor_final = cuota_val * 2
                    
                    rows.append({
                        "cedula": cedula_raw,
                        "nombre_asociado": str(row.get('NOMBRE', '')).strip(), # Se puede pisar con ERP luego
                        "empresa": "", # Se llenará en el router via ERP
                        "valor_quincenal_original": cuota_val,
                        "valor": valor_final,
                        "concepto": "EMBARGO",
                    })
                    
                    total_filas += 1
                    total_valor += valor_final
                    
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
