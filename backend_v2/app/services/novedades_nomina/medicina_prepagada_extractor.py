import pandas as pd
import io
from typing import List, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)

def extraer_medicina_prepagada(archivos_binarios: List[bytes]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Extrae datos de archivos Excel de MEDICINA PREPAGADA.
    
    Reglas:
    - Hoja: 'FAC_PREPAGADA'
    - Encabezados: Fila 4 (skiprows=3)
    - Columnas: CEDULA, VALOR MENSUAL
    - Concepto: MEDICINA PREPAGADA
    """
    all_rows = []
    warnings = []
    total_valor = 0.0
    cedulas_procesadas = set()

    # Mapa para agrupar por cédula: {cedula: {valor: sum, concepto: str}}
    mapa_agrupado = {}

    for content in archivos_binarios:
        try:
            excel_file = pd.ExcelFile(io.BytesIO(content))
            sheet_names = excel_file.sheet_names
            target_sheet = None
            
            # 1. Buscar coincidencia exacta (case insensitive)
            for s in sheet_names:
                if s.strip().upper() == "FAC_PREPAGADA":
                    target_sheet = s
                    break
            
            # 2. Fallback: buscar hoja que contenga "PREPAGADA"
            if not target_sheet:
                for s in sheet_names:
                    if "PREPAGADA" in s.upper():
                        target_sheet = s
                        break
            
            # 3. Fallback: usar la primera hoja si no encontramos nada
            if not target_sheet:
                target_sheet = sheet_names[0]
                warnings.append(f"No se encontró la hoja 'FAC_PREPAGADA'. Usando la primera hoja: '{target_sheet}'")

            logger.info(f"Usando hoja '{target_sheet}' para Medicina Prepagada")
            
            # Leer el archivo con skiprows=3 (la fila 4 es el encabezado)
            df = pd.read_excel(io.BytesIO(content), sheet_name=target_sheet, skiprows=3)
            
            # Limpiar nombres de columnas: eliminar espacios, saltos de línea y pasar a UPPER
            df.columns = [str(c).replace('\n', ' ').strip().upper() for c in df.columns]
            
            # Buscar columnas por keywords si no encontramos el match exacto
            col_cedula = None
            col_valor = None
            
            # Alias para CEDULA
            for c in df.columns:
                if c in ['CEDULA', 'CÉDULA', 'DOCUMENTO', 'ID', 'IDENTIFICACIÓN']:
                    col_cedula = c
                    break
            
            # Alias para VALOR MENSUAL
            for c in df.columns:
                if c in ['VALOR MENSUAL', 'VALOR', 'MONTO', 'TOTAL', 'NETO']:
                    col_valor = c
                    break
            
            if not col_cedula or not col_valor:
                # Si aún no las encontramos, buscar por "contiene"
                for c in df.columns:
                    if 'CED' in c: col_cedula = c
                    if 'VALOR' in c or 'MENSUAL' in c: col_valor = c

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
                    logger.debug(f"Fila omitida por cédula inválida: '{cedula_raw}'")
                    continue

                # Validar valor
                try:
                    valor = float(valor_raw)
                    if pd.isna(valor) or valor <= 0:
                        logger.debug(f"Fila omitida por valor inválido: {valor_raw}")
                        continue
                except (ValueError, TypeError):
                    logger.debug(f"Fila omitida por error en valor: {valor_raw}")
                    continue

                if cedula in mapa_agrupado:
                    mapa_agrupado[cedula]["valor"] += valor
                else:
                    mapa_agrupado[cedula] = {
                        "cedula": cedula,
                        "valor": valor,
                        "concepto": "MEDICINA PREPAGADA"
                    }

            logger.info(f"Extracción completada: {len(mapa_agrupado)} registros únicos encontrados.")

        except Exception as e:
            logger.error(f"Error procesando archivo de Medicina Prepagada: {e}")
            warnings.append(f"Error procesando uno de los archivos: {str(e)}")

    all_rows = list(mapa_agrupado.values())
    total_valor = sum(row["valor"] for row in all_rows)
    cedulas_procesadas = set(mapa_agrupado.keys())


    summary = {
        "total_filas": len(all_rows),
        "total_valor": total_valor,
        "total_asociados": len(cedulas_procesadas)
    }

    return all_rows, summary, warnings
