import pandas as pd
import io
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def extraer_otros_gerencia(archivos_binarios: List[bytes]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Extrae datos de archivos Excel de OTROS GERENCIA.
    
    Pasos:
    1. Recibe un archivo de excel (.xlsx)
    2. Los encabezados empiezan desde la fila 2 (skiprows=1)
    3. Columnas: CEDULA, FONDO COMUN, DESCUENTO EMPLEADAS, PAGO EMPLEADAS.
    4. Concepto: OTROS-GERENCIA + nombre de la columna original.
    """
    rows = []
    warnings = []
    total_valor = 0.0
    
    # Columnas esperadas
    COLS_INTERES = ['CEDULA', 'FONDO COMUN', 'DESCUENTO EMPLEADAS', 'PAGO EMPLEADAS']
    
    for content in archivos_binarios:
        try:
            # Leer excel desde la fila 2 (índice 1 en pandas)
            df = pd.read_excel(io.BytesIO(content), skiprows=1)
            
            # Limpiar nombres de columnas (quitar espacios, saltos de línea, etc.)
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            # Verificar si las columnas de interés existen
            present_cols = [c for c in COLS_INTERES if c in df.columns]
            if 'CEDULA' not in present_cols:
                warnings.append(f"No se encontró la columna 'CEDULA' en uno de los archivos.")
                continue
            
            # Iterar filas
            for _, row in df.iterrows():
                cedula_raw = str(row['CEDULA']).strip()
                if not cedula_raw or cedula_raw.lower() == 'nan' or cedula_raw == 'None':
                    continue
                
                # Quitar decimales si vienen como 123.0
                if '.' in cedula_raw:
                    cedula_raw = cedula_raw.split('.')[0]
                
                # Por cada columna de valor (excepto CEDULA), crear un registro si tiene valor > 0
                for col in ['FONDO COMUN', 'DESCUENTO EMPLEADAS', 'PAGO EMPLEADAS']:
                    if col in df.columns:
                        val = row[col]
                        # Convertir a float
                        try:
                            val_f = float(val) if pd.notnull(val) else 0.0
                        except:
                            val_f = 0.0
                            
                        if val_f > 0:
                            rows.append({
                                "cedula": cedula_raw,
                                "nombre_asociado": "", # Se enriquecerá con ERP
                                "valor": val_f,
                                "concepto": f"OTROS-GERENCIA {col}",
                                "empresa": "" # Se enriquecerá con ERP
                            })
                            total_valor += val_f
                            
        except Exception as e:
            logger.error(f"Error procesando excel OTROS GERENCIA: {e}")
            warnings.append(f"Error procesando un archivo: {str(e)}")
            
    summary = {
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_asociados": len(set(r["cedula"] for r in rows))
    }
    
    return rows, summary, warnings
