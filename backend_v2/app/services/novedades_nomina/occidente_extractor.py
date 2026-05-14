"""
Extractor especializado para archivos Excel de BANCO OCCIDENTE LIBRANZA.

Parsea el archivo Excel ignorando las primeras 15 filas (encabezado en fila 16).
Extrae "CÉDULA" y "CUOTA MENSUAL", preparándolos para el cruce con el ERP.
"""

import io
import logging
import pandas as pd
import msoffcrypto
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def extraer_occidente_libranza(
    archivos_binarios: List[bytes],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa 1..N archivos Excel de BANCO OCCIDENTE LIBRANZA.

    Criterios:
    1. Ignorar las primeras 15 filas (skiprows=15).
    2. Columnas: CÉDULA, CUOTA MENSUAL.
    3. Renombrar a: cedula, valor.
    4. Filtrar filas sin cédula o que sean de "TOTAL".
    """
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    total_filas = 0
    total_valor = 0.0

    for file_idx, contenido in enumerate(archivos_binarios):
        try:
            # Desencriptar el archivo Excel protegido por contraseña
            file_stream = io.BytesIO(contenido)
            decrypted_stream = io.BytesIO()
            office_file = msoffcrypto.OfficeFile(file_stream)
            office_file.load_key(password="805005717")
            office_file.decrypt(decrypted_stream)
            decrypted_stream.seek(0)
            
            # Leer excel desde la hoja GENERAL ignorando las primeras 16 filas (la fila 17 es el header)
            # Nota: pandas 0-indexed, fila 17 -> index 16
            df = pd.read_excel(decrypted_stream, sheet_name="GENERAL", skiprows=16)
            
            # Limpiar nombres de columnas
            df.columns = df.columns.str.strip()
            
            # Verificar columnas requeridas (usando exactamente los nombres del requerimiento)
            col_cedula = 'CÉDULA'
            col_valor = 'CUOTA MENSUAL'
            
            if col_cedula not in df.columns or col_valor not in df.columns:
                # Verificación flexible por si no tiene tilde o es CÉDULA
                if 'CEDULA' in df.columns:
                    col_cedula = 'CEDULA'
                else:
                    warnings.append(f"Archivo {file_idx + 1}: No se encontraron las columnas '{col_cedula}' o '{col_valor}'.")
                    continue
            
            # Dropear nulos en cedula
            df = df.dropna(subset=[col_cedula])
            
            for index, row in df.iterrows():
                try:
                    cedula_raw = str(row[col_cedula]).strip()
                    # Si trae .0 lo quitamos
                    if cedula_raw.endswith('.0'):
                        cedula_raw = cedula_raw[:-2]
                        
                    # Filtrar posibles filas de totales o basura
                    # Las cédulas deben ser numéricas (isdigit)
                    if not cedula_raw.isdigit():
                        continue
                        
                    valor_raw = row[col_valor]
                    if pd.isna(valor_raw):
                        continue
                        
                    # Conversión de valor
                    if isinstance(valor_raw, str):
                        valor_raw = valor_raw.replace('$', '').replace(',', '').strip()
                    
                    try:
                        valor_val = float(valor_raw)
                    except ValueError:
                        continue
                    
                    if valor_val <= 0:
                        continue
                        
                    # Estructura normalizada inicial
                    rows.append({
                        "cedula": cedula_raw,
                        "nombre_asociado": "", # Se llenará en el router
                        "empresa": "",        # Se llenará en el router
                        "valor": valor_val,
                        "concepto": "OCCIDENTE LIBRANZA", # Concepto fijo solicitado
                    })
                    
                    total_filas += 1
                    total_valor += valor_val
                    
                except Exception as e:
                    warnings.append(f"Fila {index} ignorada en archivo {file_idx + 1} por error: {e}")
                    
        except Exception as e:
             warnings.append(f"Error procesando el archivo {file_idx + 1}: {e}")

    summary = {
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": total_filas,
        "total_valor": total_valor,
        "archivos_procesados": len(archivos_binarios),
    }

    return rows, summary, warnings
