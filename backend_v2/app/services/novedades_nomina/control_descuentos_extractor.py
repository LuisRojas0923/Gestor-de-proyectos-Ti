import pandas as pd
import io
from typing import List, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)

def extraer_control_descuentos(archivos_binarios: List[bytes]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Extrae datos de archivos Excel de CONTROL DE DESCUENTOS.
    
    Reglas:
    - Hoja: 'Hoja1'
    - Encabezados: Fila 6 (skiprows=5)
    - Columnas: CEDULA, VALOR CUOTA
    - Concepto: CONTROL-DESCUENTOS
    - Agrupación: Sumar VALOR CUOTA por CEDULA
    """
    all_rows = []
    warnings = []
    
    # Mapa para agrupar por cédula: {cedula: {valor: sum, concepto: str}}
    mapa_agrupado = {}

    for content in archivos_binarios:
        try:
            excel_file = pd.ExcelFile(io.BytesIO(content))
            sheet_names = excel_file.sheet_names
            target_sheet = None
            
            # 1. Buscar coincidencia exacta (case insensitive)
            for s in sheet_names:
                if s.strip().upper() == "HOJA1":
                    target_sheet = s
                    break
            
            # 2. Fallback: usar la primera hoja si no encontramos nada
            if not target_sheet:
                target_sheet = sheet_names[0]
                warnings.append(f"No se encontró la hoja 'Hoja1'. Usando la primera hoja: '{target_sheet}'")

            logger.info(f"Usando hoja '{target_sheet}' para Control de Descuentos")
            
            # Leer el archivo con skiprows=5 (la fila 6 es el encabezado)
            df = pd.read_excel(io.BytesIO(content), sheet_name=target_sheet, skiprows=5)
            
            # Limpiar nombres de columnas: eliminar espacios, saltos de línea y pasar a UPPER
            df.columns = [str(c).replace('\n', ' ').strip().upper() for c in df.columns]
            
            # Buscar columnas por keywords si no encontramos el match exacto
            col_cedula = None
            col_valor = None
            
            # Alias para CEDULA
            # Prioridad 1: Nombres específicos de identificación
            for c in df.columns:
                if c in ['CEDULA', 'CÉDULA', 'DOCUMENTO', 'IDENTIFICACIÓN']:
                    col_cedula = c
                    break
            
            # Prioridad 2: Nombres que suelen contener "CEDULA - NOMBRE"
            if not col_cedula:
                for c in df.columns:
                    if c in ['NOMBRE', 'ASOCIADO', 'NOMBRE ASOCIADO']:
                        col_cedula = c
                        break
            
            # Prioridad 3: ID como último recurso (puede ser un índice de fila)
            if not col_cedula:
                for c in df.columns:
                    if c == 'ID':
                        col_cedula = c
                        break
            
            # Alias para VALOR CUOTA
            for c in df.columns:
                if c in ['VALOR CUOTA', 'VALOR', 'MONTO', 'CUOTA', 'TOTAL']:
                    col_valor = c
                    break
            
            if not col_cedula or not col_valor:
                # Si aún no las encontramos, buscar por "contiene"
                for c in df.columns:
                    if 'CED' in c: col_cedula = c
                    if 'VALOR' in c or 'CUOTA' in c: col_valor = c

            if not col_cedula or not col_valor:
                warnings.append(f"No se pudieron identificar las columnas en la hoja '{target_sheet}'. Columnas encontradas: {list(df.columns)}")
                continue

            for _, row in df.iterrows():
                cedula_raw = str(row[col_cedula]).strip()
                valor_raw = row[col_valor]

                # Limpiar cédula: manejar floats (evitar que 123.0 se vuelva 1230)
                if cedula_raw.endswith('.0'):
                    cedula_raw = cedula_raw[:-2]
                
                cedula = "".join(filter(str.isdigit, cedula_raw))
                if not cedula or len(cedula) < 3: # Evitar basura
                    continue

                # Validar valor
                try:
                    valor = float(valor_raw)
                    if pd.isna(valor) or valor <= 0:
                        continue
                except (ValueError, TypeError):
                    continue

                if cedula in mapa_agrupado:
                    mapa_agrupado[cedula]["valor"] += valor
                else:
                    mapa_agrupado[cedula] = {
                        "cedula": cedula,
                        "valor": valor,
                        "concepto": "CONTROL-DESCUENTOS"
                    }

        except Exception as e:
            logger.error(f"Error procesando archivo de Control de Descuentos: {e}")
            warnings.append(f"Error procesando uno de los archivos: {str(e)}")

    all_rows = list(mapa_agrupado.values())
    total_valor = sum(row["valor"] for row in all_rows)

    summary = {
        "total_filas": len(all_rows),
        "total_valor": total_valor,
        "total_asociados": len(mapa_agrupado)
    }

    return all_rows, summary, warnings
