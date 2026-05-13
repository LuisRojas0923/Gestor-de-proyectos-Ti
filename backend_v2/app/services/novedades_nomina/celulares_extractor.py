import pandas as pd
import io
from typing import List, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)

def extraer_celulares(archivos_binarios: List[bytes]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Extrae datos de archivos Excel de DESCUENTOS CELULARES.
    
    Reglas:
    - Hoja: 'CLARO'
    - Encabezados: Fila 19 (skiprows=18)
    - Columnas: CEDULA, DESC.EMPLEADO
    - Concepto: CELULARES
    - Agrupación: Sumar DESC.EMPLEADO por CEDULA
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
                if s.strip().upper() == "CLARO":
                    target_sheet = s
                    break
            
            # 2. Fallback: usar la primera hoja si no encontramos nada
            if not target_sheet:
                target_sheet = sheet_names[0]
                warnings.append(f"No se encontró la hoja 'CLARO'. Usando la primera hoja: '{target_sheet}'")

            logger.info(f"Usando hoja '{target_sheet}' para Descuentos Celulares")
            
            # Leer el archivo con skiprows=18 (la fila 19 es el encabezado)
            df = pd.read_excel(io.BytesIO(content), sheet_name=target_sheet, skiprows=18, engine='openpyxl')
            
            # Limpiar nombres de columnas: eliminar espacios, saltos de línea y pasar a UPPER
            df.columns = [str(c).replace('\n', ' ').strip().upper() for c in df.columns]
            
            # Buscar columnas por keywords
            col_cedula = None
            col_valor = None
            
            # Alias para CEDULA (siguiendo la prioridad de Control Descuentos para evitar row numbers)
            # Prioridad 1: Nombres específicos
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
            
            # Prioridad 3: ID como último recurso
            if not col_cedula:
                for c in df.columns:
                    if c == 'ID':
                        col_cedula = c
                        break
            
            # Alias para DESC.EMPLEADO
            for c in df.columns:
                if c in ['DESC.EMPLEADO', 'DESCUENTO EMPLEADO', 'VALOR', 'MONTO', 'TOTAL', 'NETO']:
                    col_valor = c
                    break
            
            if not col_cedula or not col_valor:
                # Si aún no las encontramos, buscar por "contiene"
                for c in df.columns:
                    if 'CED' in c: col_cedula = c
                    if 'DESC' in c or 'EMP' in c or 'VALOR' in c: col_valor = c

            if not col_cedula or not col_valor:
                warnings.append(f"No se pudieron identificar las columnas en la hoja '{target_sheet}'. Columnas encontradas: {list(df.columns)}")
                continue

            for _, row in df.iterrows():
                cedula_raw = str(row[col_cedula]).strip()
                valor_raw = row[col_valor]

                # Limpiar cédula
                try:
                    # Si es numérico (float o int), convertir a int primero para evitar .0 o e+08
                    val = row[col_cedula]
                    if pd.isna(val):
                        continue
                    if isinstance(val, (int, float)):
                        cedula = str(int(val))
                    else:
                        s = str(val).strip()
                        if s.endswith('.0'): s = s[:-2]
                        cedula = "".join(filter(str.isdigit, s))
                except:
                    cedula = "".join(filter(str.isdigit, str(row[col_cedula])))
                
                if not cedula or len(cedula) < 3:
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
                        "concepto": "CELULARES"
                    }

        except Exception as e:
            logger.error(f"Error procesando archivo de Descuentos Celulares: {e}")
            warnings.append(f"Error procesando uno de los archivos: {str(e)}")

    all_rows = list(mapa_agrupado.values())
    total_valor = sum(row["valor"] for row in all_rows)

    summary = {
        "total_filas": len(all_rows),
        "total_valor": total_valor,
        "total_asociados": len(mapa_agrupado)
    }

    return all_rows, summary, warnings
