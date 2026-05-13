import pandas as pd
import io
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def extraer_retenciones(
    archivos_binarios: List[bytes]
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa el archivo de RETENCIONES (.xlsm o .xlsx).
    Busca la hoja "BASE DATOS RTFUENTE".
    Extrae "Empleado:", "Bono2", "Retención en la fuente a practicar".
    Retorna (rows, summary, warnings)
    """
    all_rows = []
    warnings = []
    
    for content in archivos_binarios:
        try:
            # Intentar leer el excel especificando la hoja requerida
            df = pd.read_excel(io.BytesIO(content), sheet_name="BASE DATOS RTFUENTE", header=None)
            
            # Buscar dinámicamente la fila de los encabezados
            header_row_idx = -1
            for idx, row in df.iterrows():
                row_str = " ".join([str(val).strip() for val in row.values if pd.notna(val)])
                if "Empleado:" in row_str or "BONO" in row_str.upper() or "Retención en" in row_str:
                    header_row_idx = idx
                    break
                    
            if header_row_idx != -1:
                # Reasignar encabezados y eliminar filas previas
                df.columns = df.iloc[header_row_idx].astype(str).str.strip()
                df = df.iloc[header_row_idx + 1:].reset_index(drop=True)
            else:
                logger.warning("No se encontró la fila de encabezados en Retenciones.")
                continue

            required_cols = ["Empleado:", "Bono2", "Retención en la fuente a practicar"]
            missing_cols = [col for col in required_cols if col not in df.columns]
            
            if missing_cols:
                warnings.append(f"Faltan columnas en una hoja: {', '.join(missing_cols)}")
                continue
                
            # Iterar sobre las filas válidas donde el Empleado no sea nulo
            for _, row in df.dropna(subset=["Empleado:"]).iterrows():
                # Limpiar cédula
                raw_cedula = str(row["Empleado:"]).strip()
                cedula = raw_cedula.split(".")[0] # Manejar .0 de Excel
                
                if not cedula or cedula == "nan":
                    continue
                    
                # Determinar el CONCEPTO basado en Bono2
                bono2 = row["Bono2"]
                try:
                    bono_val = float(bono2) if pd.notna(bono2) else 0.0
                    if bono_val != 0:
                        concepto = "CON COMISION 1Q"
                    else:
                        concepto = "SIN COMISION 2Q"
                except:
                    concepto = "SIN COMISION 2Q"

                # Valor
                raw_valor = row["Retención en la fuente a practicar"]
                val = 0.0
                try:
                    val = float(raw_valor) if pd.notna(raw_valor) else 0.0
                except:
                    if isinstance(raw_valor, str):
                        val_limpio = "".join(filter(lambda x: x.isdigit() or x == ".", raw_valor.replace(",", "")))
                        try:
                            val = float(val_limpio)
                        except:
                            pass
                
                if val <= 0:
                    continue

                all_rows.append({
                    "cedula": cedula,
                    "nombre_asociado": "NO ASIGNADO",
                    "empresa": "REFRIDCOL",
                    "valor": val,
                    "concepto": concepto
                })

        except Exception as e:
            logger.error(f"Error procesando archivo de Retenciones: {e}")
            warnings.append(f"Error en un archivo: {str(e)}")

    total_valor = sum(r["valor"] for r in all_rows)
    summary = {
        "total_asociados": len(set(r["cedula"] for r in all_rows)),
        "total_filas": len(all_rows),
        "total_valor": round(total_valor, 2),
        "archivos_procesados": len(archivos_binarios)
    }
    
    return all_rows, summary, warnings
