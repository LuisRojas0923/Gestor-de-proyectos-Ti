import pandas as pd
import io
import logging
from typing import List, Tuple, Dict, Any

logger = logging.getLogger(__name__)

def extraer_planillas_regionales_2q(archivos_binarios: List[bytes]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Extrae datos de archivos Excel (.xlsm) de PLANILLAS REGIONALES 2Q.
    
    Reglas:
    - Identica a 1Q pero con concepto 'PLANILLA 2Q'
    """
    warnings = []
    
    # Mapa para agrupar: {(cedula, empleado, novedad, empresa, sucursal): {horas: sum, dias: sum}}
    mapa_agrupado = {}

    for i, content in enumerate(archivos_binarios):
        try:
            # Leer el archivo excel
            excel_file = pd.ExcelFile(io.BytesIO(content))
            sheet_names = excel_file.sheet_names
            target_sheet = None
            
            for s in sheet_names:
                if s.strip().upper() == "PLANTILLA":
                    target_sheet = s
                    break
            
            if not target_sheet:
                warnings.append(f"Archivo {i+1}: No se encontró la hoja 'PLANTILLA'.")
                continue

            # Leer la hoja completa con header=None para encontrar la fila real de encabezados
            df_full = pd.read_excel(io.BytesIO(content), sheet_name=target_sheet, header=None, engine='openpyxl')
            
            # Buscar la fila de encabezados que contenga "CÉDULA" y "NOVEDAD"
            header_row_idx = -1
            for idx, row in df_full.iterrows():
                row_values = [str(val).strip().upper() for val in row.values if pd.notna(val)]
                if "CÉDULA" in row_values and "NOVEDAD" in row_values:
                    header_row_idx = idx
                    break
            
            if header_row_idx == -1:
                warnings.append(f"Archivo {i+1}: No se encontró el encabezado 'CÉDULA' y 'NOVEDAD' en la hoja 'PLANTILLA'.")
                continue
            
            # Re-leer desde la fila de encabezados correcta
            df = pd.read_excel(io.BytesIO(content), sheet_name=target_sheet, header=header_row_idx, engine='openpyxl')
            
            # Limpiar nombres de columnas
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            # Mapeo flexible de columnas
            col_map = {}
            for c in df.columns:
                c_upper = str(c).upper()
                if "CÉDULA" in c_upper or "CEDULA" in c_upper: col_map["CÉDULA"] = c
                elif "EMPLEADO" in c_upper: col_map["EMPLEADO"] = c
                elif "EMPRESA" in c_upper: col_map["EMPRESA"] = c
                elif "SUCURSAL" in c_upper: col_map["SUCURSAL"] = c
                elif "CANT. HORAS" in c_upper or "CANTIDAD HORAS" in c_upper or "CANT HORAS" in c_upper: col_map["CANT. HORAS"] = c
                elif "CANTIDAD" in c_upper and "HORA" not in c_upper: col_map["CANTIDAD"] = c
                elif "NOVEDAD" in c_upper: col_map["NOVEDAD"] = c
            
            # Validar esenciales
            required = ["CÉDULA", "EMPLEADO", "NOVEDAD", "CANT. HORAS", "CANTIDAD"]
            missing = [r for r in required if r not in col_map]
            if missing:
                warnings.append(f"Archivo {i+1}: Faltan columnas esenciales: {missing}")
                continue

            # Filtrar novedades: EXCLUIR las que sean ["AUS", "CMP", "PNR", "RET"]
            novedades_excluir = ["AUS", "CMP", "PNR", "RET"]
            df = df[~df[col_map["NOVEDAD"]].astype(str).str.strip().str.upper().isin(novedades_excluir)]
            
            for _, row in df.iterrows():
                # Limpiar cédula
                val_cedula = row.get(col_map["CÉDULA"])
                if pd.isna(val_cedula): continue
                
                try:
                    if isinstance(val_cedula, (int, float)):
                        cedula = str(int(val_cedula))
                    else:
                        s = str(val_cedula).strip()
                        if s.endswith('.0'): s = s[:-2]
                        cedula = "".join(filter(str.isdigit, s))
                except:
                    cedula = "".join(filter(str.isdigit, str(val_cedula)))
                
                if not cedula: continue
                
                # Datos básicos con limpieza rigurosa
                empleado = str(row.get(col_map["EMPLEADO"], "")).strip().upper()
                novedad  = str(row.get(col_map["NOVEDAD"], "")).strip().upper()
                empresa  = str(row.get(col_map["EMPRESA"], "REFRIDCOL")).strip().upper()
                sucursal = str(row.get(col_map["SUCURSAL"], "GENERAL")).strip().upper()
                
                try:
                    horas = float(row.get(col_map["CANT. HORAS"], 0))
                    dias = float(row.get(col_map["CANTIDAD"], 0))
                except:
                    horas = 0.0
                    dias = 0.0
                
                # Key para agrupar
                key = (cedula, empleado, novedad, empresa, sucursal)
                
                if key in mapa_agrupado:
                    mapa_agrupado[key]["horas"] += horas
                    mapa_agrupado[key]["dias"] += dias
                else:
                    mapa_agrupado[key] = {
                        "cedula": cedula,
                        "nombre_asociado": empleado,
                        "empresa": empresa,
                        "sucursal": sucursal,
                        "novedad": f"2Q {novedad}",
                        "horas": horas,
                        "dias": dias,
                        "valor": 0,
                        "concepto": f"2Q {novedad}"
                    }

        except Exception as e:
            logger.error(f"Error procesando archivo de Planillas Regionales 2Q: {e}")
            warnings.append(f"Error procesando uno de los archivos: {str(e)}")

    all_rows = list(mapa_agrupado.values())
    
    summary = {
        "total_filas": len(all_rows),
        "total_asociados": len(set(r["cedula"] for r in all_rows)),
        "total_horas": round(sum(r["horas"] for r in all_rows), 2),
        "total_dias": round(sum(r["dias"] for r in all_rows), 2)
    }

    return all_rows, summary, warnings
