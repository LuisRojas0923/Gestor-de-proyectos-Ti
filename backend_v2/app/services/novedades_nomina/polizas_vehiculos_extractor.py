import io
import pandas as pd
from typing import List, Dict, Tuple, Any


def extraer_polizas_vehiculos(archivos_binarios: List[bytes]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """
    Procesa archivos Excel (.xlsx) de POLIZAS VEHICULOS.
    - Ignora las filas de encabezado dinámicamente.
    - Busca las columnas por su posición basándose en los textos o la estructura de los datos.
    """
    rows = []
    warnings_txt = []
    total_archivos = len(archivos_binarios)
    archivos_validos = 0

    for archivo_idx, contenido in enumerate(archivos_binarios):
        try:
            # Cargar todas las hojas
            dfs = pd.read_excel(io.BytesIO(contenido), sheet_name=None, header=None)
            
            df_raw = None
            c_idx = -1
            v_idx = -1
            n_idx = -1
            
            # Reorganizar el diccionario para que las hojas que contengan la palabra "POLIZA" se procesen primero
            sheet_items = list(dfs.items())
            sheet_items.sort(key=lambda x: 0 if "poliza" in str(x[0]).lower() else 1)
            
            for sheet_name, sheet_df in sheet_items:
                temp_c = -1
                temp_v = -1
                temp_n = -1
                is_perfect_match = False
                
                # 1. Intentar deducir las columnas por los textos de encabezado en las primeras 20 filas
                for i in range(min(20, len(sheet_df))):
                    row_vals = [str(val).upper().strip() for val in sheet_df.iloc[i].values]
                    
                    tc = next((idx for idx, x in enumerate(row_vals) if "CEDU" in x or "CÉDU" in x or "IDENTIFICACI" in x or "DOC" in x), -1)
                    
                    tv = next((idx for idx, x in enumerate(row_vals) if "QUINCENAL" in x or "QUINENAL" in x or "CUTOA" in x), -1)
                    if tv != -1: is_perfect_match = True
                    
                    if tv == -1: tv = next((idx for idx, x in enumerate(row_vals) if "CUOTA" in x), -1)
                    if tv == -1: tv = next((idx for idx, x in enumerate(row_vals) if "VALOR" in x and "AÑ" not in x and "ANUAL" not in x), -1)
                    if tv == -1: tv = next((idx for idx, x in enumerate(row_vals) if "TOTAL" in x), -1)
                    if tv == -1: tv = next((idx for idx, x in enumerate(row_vals) if "VALOR" in x), -1)
                    
                    tn = next((idx for idx, x in enumerate(row_vals) if "NOMBRE" in x or "APELLIDO" in x), -1)
                    
                    # Solo aceptar si encontramos ambos en la MISMA fila. Esto evita mezclar un título global con los encabezados reales
                    if tc != -1 and tv != -1 and tc != tv:
                        temp_c = tc
                        temp_v = tv
                        temp_n = tn
                        break
                        
                # 2. Si falló la deducción por encabezado, deducir analizando los primeros datos numéricos
                if temp_c == -1 or temp_v == -1:
                    for i in range(min(20, len(sheet_df))):
                        row_vals = sheet_df.iloc[i].values
                        possible_c = -1
                        possible_vs = []
                        possible_n = -1
                        
                        for idx, val in enumerate(row_vals):
                            if pd.notna(val):
                                s_val = str(val).split(".")[0].strip()
                                # Buscar posible cédula (más de 5 dígitos)
                                if s_val.isdigit() and len(s_val) >= 5:
                                    if possible_c == -1: possible_c = idx
                                    
                                # Buscar posibles valores numéricos
                                if isinstance(val, (int, float)) or (isinstance(val, str) and val.replace('.','').replace(',','').isdigit()):
                                    possible_vs.append(idx)
                                    
                                # Buscar posible nombre
                                if isinstance(val, str) and len(val) > 5 and not val.isdigit():
                                    if possible_n == -1: possible_n = idx
                                    
                        if possible_c != -1 and len(possible_vs) > 0:
                            temp_c = possible_c
                            temp_n = possible_n
                            # Filtrar la columna de la cédula para que no se tome como valor
                            valid_vs = [idx for idx in possible_vs if idx != temp_c]
                            if valid_vs:
                                if len(valid_vs) == 1:
                                    temp_v = valid_vs[0]
                                else:
                                    # Si hay múltiples montos numéricos (ej. Valor Anual y Cuota Quincenal), 
                                    # la Cuota Quincenal SIEMPRE será el monto menor.
                                    min_val = float('inf')
                                    best_idx = valid_vs[-1]
                                    for v_i in valid_vs:
                                        try:
                                            val_str = str(row_vals[v_i]).replace('$', '').replace(',', '').strip()
                                            val_num = float(val_str)
                                            if val_num < min_val:
                                                min_val = val_num
                                                best_idx = v_i
                                        except ValueError:
                                            pass
                                    temp_v = best_idx
                            break
                            
                if temp_c != -1 and temp_v != -1:
                    df_raw = sheet_df
                    c_idx = temp_c
                    v_idx = temp_v
                    n_idx = temp_n
                    
                    # Si encontró un match perfecto explícito ("QUINCENAL"), es 100% la tabla correcta (no es una Pivot)
                    if is_perfect_match or ("dinamica" not in sheet_name.lower() and "pivot" not in sheet_name.lower()):
                        break
            
            if c_idx == -1 or v_idx == -1:
                warnings_txt.append(f"Archivo {archivo_idx + 1}: Imposible deducir la columna de Cédula y Valor.")
                continue
                
            archivos_validos += 1
            
            # Recorrer TODAS las filas. Ignora automáticamente encabezados porque no son dígitos.
            for i in range(len(df_raw)):
                row = df_raw.iloc[i].values
                try:
                    if c_idx >= len(row) or pd.isna(row[c_idx]): continue
                    
                    cedula_val = row[c_idx]
                    cedula_str = str(cedula_val).split(".")[0].strip()
                    
                    # Validar que sí sea una cédula (debe ser numérico y mayor a 5 caracteres)
                    if not cedula_str.isdigit() or len(cedula_str) < 5: 
                        continue
                        
                    cedula_final = "".join(filter(str.isdigit, cedula_str))
                    if not cedula_final or cedula_final == "0": continue
                    
                    if v_idx >= len(row): continue
                    valor_raw = row[v_idx]
                    if pd.isna(valor_raw): continue
                    
                    try:
                        v_str = str(valor_raw).replace('$', '').replace(',', '').strip()
                        valor = float(v_str) if v_str and v_str.lower() not in ['nan', 'none', ''] else 0.0
                        
                        # Requisito del usuario: Multiplicar el valor x 2
                        # Usamos round() porque a veces Excel trae 52114.95 en lugar de 52115
                        valor = round(valor * 2)
                    except ValueError:
                        valor = 0.0
                        
                    if valor <= 0: continue
                    
                    nombre_asociado = ""
                    if n_idx != -1 and n_idx < len(row):
                        n_val = row[n_idx]
                        if pd.notna(n_val):
                            n_str = str(n_val).strip()
                            if n_str.lower() not in ["nan", "none"]:
                                nombre_asociado = n_str
                                
                    rows.append({
                        "cedula": cedula_final,
                        "nombre_asociado": nombre_asociado,
                        "concepto": "POLIZA VEHICULOS",
                        "valor": valor,
                        "empresa": ""
                    })
                except Exception as e:
                    warnings_txt.append(f"Archivo {archivo_idx + 1}, fila {i + 1}: Error al procesar ({str(e)})")

        except Exception as e:
            warnings_txt.append(f"Error procesando archivo {archivo_idx + 1}: {str(e)}")

    summary = {
        "archivos_procesados": archivos_validos,
        "total_archivos": total_archivos
    }

    # Agrupar por cédula sumando los valores antes de retornar
    dict_agrupado = {}
    for row in rows:
        cedula = row["cedula"]
        if cedula in dict_agrupado:
            dict_agrupado[cedula]["valor"] += row["valor"]
        else:
            dict_agrupado[cedula] = row
            
    rows_agrupados = list(dict_agrupado.values())

    return rows_agrupados, summary, warnings_txt
