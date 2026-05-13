import io
import pandas as pd
from typing import List, Dict, Tuple, Any

def extraer_beneficiar(archivos_binarios: List[bytes]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa archivos Excel (.xls) de BENEFICIAR.
    Retorna: (filas_extraidas, resumen_estadisticas, lista_warnings)
    """
    rows = []
    warnings_txt = []
    total_archivos = len(archivos_binarios)
    archivos_validos = 0

    # Columnas esperadas en el archivo
    COLUMNAS_REQUERIDAS = [
        "CEDULA", 
        "DCTO_APORTE", 
        "DCTO_AHORRO", 
        "DCTO_OBLIGACIONES", 
        "DCTO_SERVICIOS", 
        "DCTO_GES", 
        "DCTO_ROTATIVO"
    ]

    for archivo_idx, contenido in enumerate(archivos_binarios):
        try:
            # Los encabezados empiezan desde la fila 4 (skiprows=3)
            df = pd.read_excel(io.BytesIO(contenido), skiprows=3)

            # Limpiar nombres de columnas
            df.columns = [str(c).strip().upper() for c in df.columns]

            # Verificar columnas requeridas
            columnas_faltantes = [cd for cd in COLUMNAS_REQUERIDAS if cd not in df.columns]
            if columnas_faltantes:
                warnings_txt.append(f"Archivo {archivo_idx + 1}: Faltan columnas: {', '.join(columnas_faltantes)}")
                continue

            archivos_validos += 1

            for index, row in df.iterrows():
                try:
                    cedula_val = row["CEDULA"]
                    if pd.isna(cedula_val):
                        continue
                        
                    # Limpiar cédula
                    cedula_str = str(cedula_val).split(".")[0].strip()
                    if not cedula_str or cedula_str.lower() == "nan":
                        continue

                    # Extraer valores numéricos
                    dcto_aporte = row.get("DCTO_APORTE", 0)
                    dcto_ahorro = row.get("DCTO_AHORRO", 0)
                    dcto_obligaciones = row.get("DCTO_OBLIGACIONES", 0)
                    dcto_servicios = row.get("DCTO_SERVICIOS", 0)
                    dcto_ges = row.get("DCTO_GES", 0)
                    dcto_rotativo = row.get("DCTO_ROTATIVO", 0)

                    # Reemplazar NaN con 0
                    def get_val(v): return float(v) if pd.notna(v) else 0.0
                    
                    aporte = get_val(dcto_aporte)
                    credito = get_val(dcto_obligaciones)
                    otros_descuentos = get_val(dcto_servicios) + get_val(dcto_ges) + get_val(dcto_rotativo) + get_val(dcto_ahorro)

                    # Obtener nombre (si existe en el excel, aunque luego se cruce con ERP)
                    nombre_asociado = ""
                    for col_name in df.columns:
                        if "NOMBRE" in str(col_name).upper():
                            nombre_asociado = str(row[col_name]).strip()
                            break

                    # Transponer filas por concepto
                    # Las agregamos solo si el valor es > 0, o si se desea incluir items nulos se puede quitar esta condicion
                    if aporte > 0:
                        rows.append({
                            "cedula": cedula_str,
                            "nombre_asociado": nombre_asociado,
                            "concepto": "BENEFICIAR APORTE",
                            "valor": aporte
                        })
                    
                    if credito > 0:
                        rows.append({
                            "cedula": cedula_str,
                            "nombre_asociado": nombre_asociado,
                            "concepto": "BENEFICIAR CREDITO",
                            "valor": credito
                        })

                    if otros_descuentos > 0:
                        rows.append({
                            "cedula": cedula_str,
                            "nombre_asociado": nombre_asociado,
                            "concepto": "BENEFICIAR OTROS DESCUENTOS",
                            "valor": otros_descuentos
                        })

                except Exception as e:
                    warnings_txt.append(f"Archivo {archivo_idx + 1}, fila {index + 4}: Error al procesar ({str(e)})")

        except Exception as e:
            warnings_txt.append(f"Error general evaluando archivo {archivo_idx + 1}: {str(e)}")

    summary = {
        "archivos_procesados": archivos_validos,
        "total_archivos": total_archivos
        # total_asociados, total_filas y total_valor se computan en la ruta
    }

    return rows, summary, warnings_txt
