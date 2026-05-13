import pandas as pd
import io
import msoffcrypto
from typing import List, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)

def decrypt_excel(content: bytes, passwords: List[str] = ["805005717", "refridcol"]) -> io.BytesIO:
    """Intenta descifrar un archivo Excel con una lista de contraseñas."""
    file_handle = io.BytesIO(content)
    try:
        office_file = msoffcrypto.OfficeFile(file_handle)
        
        # Si no está encriptado, devolver el original
        if not office_file.is_encrypted():
            return io.BytesIO(content)
            
        logger.info("El archivo Excel está protegido por contraseña. Intentando descifrar...")
        
        for pwd in passwords:
            decrypted = io.BytesIO()
            try:
                logger.debug(f"Probando contraseña...")
                office_file.load_key(password=pwd)
                office_file.decrypt(decrypted)
                decrypted.seek(0)
                logger.info(f"Archivo descifrado exitosamente.")
                return decrypted
            except Exception:
                continue
        
        raise ValueError("No se pudo descifrar el archivo con las contraseñas conocidas.")
    except Exception as e:
        logger.error(f"Error en el proceso de descifrado: {e}")
        # Si falla el proceso de detección, devolvemos el original por si acaso pandas lo lee
        return io.BytesIO(content)

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

    for i, content in enumerate(archivos_binarios):
        decrypted_handle = None
        try:
            logger.info(f"Procesando archivo {i+1}/{len(archivos_binarios)}...")
            
            # 1. Detectar formato por contenido inicial
            is_old_xls = content.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1')
            engine = 'xlrd' if is_old_xls else 'openpyxl'
            
            # 2. Intentar leer directamente primero
            try:
                handle = io.BytesIO(content)
                excel_file = pd.ExcelFile(handle, engine=engine)
                decrypted_handle = handle
                logger.debug(f"Archivo leído directamente con motor {engine}.")
            except Exception as e:
                # Si falla y parece ser por encriptación, intentamos descifrar
                err_msg = str(e).lower()
                if any(kw in err_msg for kw in ["password", "encrypted", "protected", "zip file", "biff"]):
                    logger.info("El archivo parece estar encriptado. Intentando descifrar...")
                    decrypted_handle = decrypt_excel(content)
                    # El resultado de msoffcrypto suele ser un OLE file que xlrd entiende bien
                    excel_file = pd.ExcelFile(decrypted_handle, engine='xlrd' if is_old_xls else None)
                else:
                    raise e

            sheet_names = excel_file.sheet_names
            target_sheet = None
            
            if len(sheet_names) == 1:
                target_sheet = sheet_names[0]
            else:
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
                
                # 3. Fallback: usar la primera hoja
                if not target_sheet:
                    target_sheet = sheet_names[0]
                    warnings.append(f"No se encontró la hoja 'FAC_PREPAGADA'. Usando la hoja: '{target_sheet}'")

            logger.info(f"Usando hoja '{target_sheet}' para Medicina Prepagada")
            
            # Volver a posicionar el puntero para read_excel
            decrypted_handle.seek(0)
            # Detección dinámica de encabezados: buscar la fila que contiene 'CEDULA' o 'DOCUMENTO'
            df_initial = pd.read_excel(decrypted_handle, sheet_name=target_sheet, header=None, nrows=50)
            header_row = 0
            for idx, row in df_initial.iterrows():
                row_vals = [str(v).upper() for v in row.values if pd.notna(v)]
                # Una fila de encabezado válida debe tener identificación Y algo de valores/cuotas
                has_id = any(any(kw in v for kw in ['CEDULA', 'DOCUMENTO', 'IDENTIFICACION']) for v in row_vals)
                has_value = any(any(kw in v for kw in ['CUOTA', 'VALOR', 'PREPAGADA']) for v in row_vals)
                
                if has_id and has_value:
                    header_row = idx
                    break
            
            logger.info(f"Fila de encabezado detectada en índice: {header_row}")
            
            # Volver a posicionar el puntero y leer desde la fila detectada
            decrypted_handle.seek(0)
            df = pd.read_excel(decrypted_handle, sheet_name=target_sheet, skiprows=header_row)
            
            # Limpiar nombres de columnas: eliminar espacios, saltos de línea y pasar a UPPER
            df.columns = [str(c).replace('\n', ' ').strip().upper() for c in df.columns]
            
            # Buscar columnas específicas según requerimiento
            col_cedula = None
            col_cuota = None
            col_total = None
            col_descuento = None
            col_iva = None
            
            # Mapeo exacto o aproximado de columnas (tomando la primera coincidencia)
            for c in df.columns:
                c_clean = str(c).strip().upper()
                if any(kw in c_clean for kw in ['NÚMERO DE DOCUMENTO', 'DOCUMENTO', 'CEDULA', 'IDENTIFICACION']) and 'TIPO' not in c_clean:
                    if not col_cedula: col_cedula = c
                elif any(kw in c_clean for kw in ['TOTAL', 'VALOR MENSUAL']) and 'IVA' not in c_clean:
                    if not col_total: col_total = c
                elif 'CUOTA' in c_clean:
                    if not col_cuota: col_cuota = c
                elif 'DESCUENTO COMERCIAL' in c_clean or 'DESCUENTO' in c_clean:
                    if not col_descuento: col_descuento = c
                elif 'IVA' in c_clean:
                    if not col_iva: col_iva = c
            
            if not col_cedula or not col_cuota:
                warnings.append(f"No se pudieron identificar las columnas requeridas en la hoja '{target_sheet}'. Columnas encontradas: {list(df.columns)}")
                continue

            for _, row in df.iterrows():
                cedula_raw = str(row[col_cedula]).strip()

                # Limpiar cédula: manejar floats (evitar que 123.0 se vuelva 1230)
                if cedula_raw.endswith('.0'):
                    cedula_raw = cedula_raw[:-2]
                
                cedula = "".join(filter(str.isdigit, cedula_raw))
                if not cedula or len(cedula) < 3:
                    continue

                # Validar y calcular valor: CUOTA - ABS(DESCUENTO COMERCIAL)
                try:
                    # Siempre separar Cuota e IVA para que el servicio decida si sumarlos (según excepción)
                    cuota = float(row[col_cuota]) if pd.notna(row[col_cuota]) else 0.0
                    # Aseguramos valor absoluto del descuento para que la resta sea siempre correcta
                    descuento = abs(float(row[col_descuento])) if col_descuento and pd.notna(row[col_descuento]) else 0.0
                    
                    valor = cuota - descuento
                    iva_fila = float(row[col_iva]) if col_iva and pd.notna(row[col_iva]) else 0.0
                    
                    if valor <= 0 and iva_fila <= 0:
                        continue
                except (ValueError, TypeError):
                    continue

                if cedula in mapa_agrupado:
                    mapa_agrupado[cedula]["valor"] += valor
                    mapa_agrupado[cedula]["iva"] += iva_fila
                else:
                    mapa_agrupado[cedula] = {
                        "cedula": cedula,
                        "valor": valor,
                        "iva": iva_fila,
                        "concepto": "MEDICINA PREPAGADA"
                    }

            logger.info(f"Extracción completada: {len(mapa_agrupado)} registros únicos encontrados.")

            # Limpiar memoria
            if decrypted_handle:
                decrypted_handle.close()

        except Exception as e:
            if decrypted_handle:
                decrypted_handle.close()
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
