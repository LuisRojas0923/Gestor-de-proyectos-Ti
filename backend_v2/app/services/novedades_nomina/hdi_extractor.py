"""
Extractor especializado para archivos Excel (.xlsx, .xls) de SEGUROS HDI.
Implementa los 7 pasos de normalización solicitados por el usuario.
"""

import io
import re
import collections
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd

from .validacion_excel_hdi import MAX_EXCEL_COLS, MAX_EXCEL_ROWS, MAX_EXCEL_SHEETS

def _formatear_nombre(nombre: str) -> str:
    """Invierte el nombre de 'Nombres Apellidos' a 'Apellidos Nombres'."""
    if not nombre: return ""
    palabras = nombre.upper().strip().split()
    if len(palabras) == 3:
        # Ejemplo: EIMAR BECERRA ALVAREZ -> BECERRA ALVAREZ EIMAR
        return f"{palabras[1]} {palabras[2]} {palabras[0]}"
    elif len(palabras) >= 4:
        # Ejemplo: ROBERTO ANTONIO AGUDELO QUINONES -> AGUDELO QUINONES ROBERTO ANTONIO
        apellidos = " ".join(palabras[-2:])
        nombres = " ".join(palabras[:-2])
        return f"{apellidos} {nombres}"
    return nombre.upper()

def _limpiar_numero(valor: Any) -> float:
    """
    Soporta notación numérico-monetaria colombiana (391.085,00 / 1.234.567,89 / 354.310),
    notación estadounidense ($354,310.00) y numéricos nativos int/float de pandas.
    """
    if valor is None or pd.isna(valor) or valor == "":
        return 0.0

    if isinstance(valor, (int, float)):
        return float(valor)

    s = str(valor).replace("$", "").replace("\u00A0", " ").strip()
    if not s:
        return 0.0

    # Notación mixta (punto y coma presentes)
    if "." in s and "," in s:
        # En Colombia, la coma es el separador decimal (ej: 391.085,00 / 1.234.567,89)
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            # En EE.UU., el punto es decimal (ej: 1,234,567.89)
            s = s.replace(",", "")
    elif "," in s:
        # Notación con solo coma (ej: 391085,00 o 391085,5)
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) in (1, 2):
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "." in s:
        # Notación con solo punto (ej: 391.085 o 1.234.567 o float string "391085.0")
        parts = s.split(".")
        if len(parts) > 2:
            # Múltiples puntos como 1.234.567 -> separadores de miles colombianos
            s = s.replace(".", "")
        elif len(parts) == 2:
            # Un solo punto. Si tiene 3 dígitos tras el punto y la parte entera es corta (<=3 dígitos),
            # ej: "391.085" o "354.310" o "920.200", es separador de miles colombiano.
            if len(parts[1]) == 3 and len(parts[0]) <= 3:
                s = s.replace(".", "")

    s = re.sub(r"[^0-9\.\-]", "", s)
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def _aplicar_reemplazos(cedula: str, nombre: str) -> Tuple[str, str]:
    """Aplica las reglas del Paso 3 de normalización."""
    # IDs
    if cedula == "1116235786": cedula = "66903320"
    if cedula == "31282865": cedula = "31231202"
    
    # Nombres
    n_up = nombre.upper()
    if "HECTOR PAUL CRUZ" in n_up: nombre = "MARIBEL TORRES AGUDELO"
    if "ESPERANZA AGUADO CORTES" in n_up: nombre = "GLORIA AGUDELO DE TORRES"
    
    return cedula, nombre


def normalizar_df(df: pd.DataFrame, warnings_out: Optional[List[str]] = None) -> pd.DataFrame:
    """Normaliza el DataFrame (de Excel) siguiendo la estructura de HDI exigiendo TIPO estrictamente ('P' o 'D')."""
    df = df.copy()
    if len(df.columns) > MAX_EXCEL_COLS:
        raise ValueError(f"La hoja supera el límite de {MAX_EXCEL_COLS} columnas.")
    if len(df) > MAX_EXCEL_ROWS:
        raise ValueError(f"La hoja supera el límite de {MAX_EXCEL_ROWS} filas.")

    df = df.dropna(axis=1, how='all').dropna(axis=0, how='all')
    if len(df.columns) < 2 or len(df) == 0:
        return pd.DataFrame()

    # Detectar columnas por nombre de encabezado primero (evitando sobreescrituras por coincidencias parciales)
    col_map = {}

    def _mapear_columnas(columnas):
        m = {}
        for i, col in enumerate(columnas):
            c_str = str(col).upper().strip()
            if "CERT" in c_str and "cert" not in m:
                m["cert"] = i
            if c_str == "TIPO" or ("TIPO" in c_str and "tipo" not in m):
                m["tipo"] = i
            if ("IDENTIF" in c_str or "CEDULA" in c_str or "DOCUMENTO" in c_str or "NIT" in c_str or c_str == "ID") and "id" not in m:
                m["id"] = i
            if ("NOMBRE" in c_str or "ASOCIADO" in c_str or ("ASEGURADO" in c_str and "VALOR" not in c_str)) and "nombre" not in m:
                m["nombre"] = i

            # Priorizar PRIMA ANUAL sobre PRIMA COBRO y VALOR ASEGURADO
            if "PRIMA ANUAL" in c_str or "ANUAL" in c_str:
                m["prima"] = i
            elif "prima" not in m and ("PRIMA" in c_str and "EXTRA" not in c_str):
                m["prima"] = i
            elif "prima" not in m and ("VALOR" in c_str and "ASEGURADO" not in c_str):
                m["prima"] = i
            elif "prima" not in m and "MONTO" in c_str:
                m["prima"] = i
        return m

    col_map = _mapear_columnas(df.columns)

    # Si no se identificó "id" en df.columns, verificar si la fila 0 contiene los encabezados
    if "id" not in col_map and len(df) > 0:
        first_row = [str(x).upper().strip() for x in df.iloc[0]]
        if any("IDENTIF" in x or "CEDULA" in x or "CERT" in x for x in first_row):
            df.columns = df.iloc[0]
            df = df.iloc[1:].reset_index(drop=True)
            col_map = _mapear_columnas(df.columns)

    # Si no se identificó por encabezado, buscar posicionalmente
    if "id" not in col_map:
        id_col_idx = -1
        for i in range(min(8, len(df.columns))):
            col_vals = df.iloc[:, i].astype(str).str.strip().tolist()
            if any(re.match(r"^\d{5,12}(\.0)?$", v) for v in col_vals if v):
                id_col_idx = i
                break
        if id_col_idx != -1:
            col_map["id"] = id_col_idx
            if "tipo" not in col_map and id_col_idx > 0:
                col_map["tipo"] = id_col_idx - 1
            if "nombre" not in col_map and id_col_idx + 1 < len(df.columns):
                col_map["nombre"] = id_col_idx + 1

    if "id" not in col_map:
        return pd.DataFrame()

    id_col_idx = col_map["id"]
    tipo_col_idx = col_map.get("tipo", id_col_idx - 1 if id_col_idx > 0 else -1)
    nombre_col_idx = col_map.get("nombre", id_col_idx + 1 if id_col_idx + 1 < len(df.columns) else -1)
    cert_col_idx = col_map.get("cert", 0)
    prima_col_idx = col_map.get("prima", -1)

    if prima_col_idx == -1:
        for i in range(len(df.columns) - 1, -1, -1):
            if i != id_col_idx and i != tipo_col_idx and i != nombre_col_idx:
                prima_col_idx = i
                break

    valid_rows = []
    for _, row in df.iterrows():
        if id_col_idx >= len(row): continue
        raw_id = str(row.iloc[id_col_idx]).strip().split(".")[0]
        id_val = re.sub(r"[^0-9]", "", raw_id)
        if not id_val or len(id_val) < 5: continue

        # Validación estricta de TIPO (P=Titular, D=Dependiente)
        tipo = None
        if tipo_col_idx != -1 and tipo_col_idx < len(row):
            val_tipo = str(row.iloc[tipo_col_idx]).strip().upper()
            if val_tipo in ["P", "TITULAR", "PRINCIPAL"]:
                tipo = "P"
            elif val_tipo in ["D", "DEPENDIENTE", "BENEFICIARIO"]:
                tipo = "D"

        if not tipo:
            raw_tipo = (
                str(row.iloc[tipo_col_idx]).strip()
                if tipo_col_idx != -1 and tipo_col_idx < len(row)
                else "Ausente"
            )
            raise ValueError(
                f"TIPO inválido para la cédula '{id_val}': '{raw_tipo}'. "
                "Se requiere P (Titular) o D (Dependiente)."
            )

        nombre = ""
        if nombre_col_idx != -1 and nombre_col_idx < len(row):
            nombre = str(row.iloc[nombre_col_idx]).strip().split("  ")[0]

        prima_anual = 0.0
        if prima_col_idx != -1 and prima_col_idx < len(row):
            prima_anual = _limpiar_numero(row.iloc[prima_col_idx])
        if prima_anual <= 0: continue

        cert_val = ""
        if cert_col_idx < len(row):
            cert_raw = str(row.iloc[cert_col_idx]).strip().split(".")[0]
            cert_val = re.sub(r"[^0-9]", "", cert_raw)

        id_val, nombre = _aplicar_reemplazos(id_val, nombre)
        nombre = _formatear_nombre(nombre)

        valid_rows.append({
            "cert": cert_val,
            "tipo": tipo,
            "cedula": id_val,
            "nombre_asociado": nombre,
            "empresa": "REFRIDCOL",
            "prima_anual": prima_anual,
            "concepto": "SEGURO DE VIDA"
        })

    return pd.DataFrame(valid_rows)


def extraer_hdi(
    archivos_binarios: List[bytes]
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], List[str]]:
    """Procesa de manera exclusiva archivos Excel (.xlsx, .xls) de HDI con la lógica de 7 pasos y consolidación."""
    if len(archivos_binarios) != 1:
        raise ValueError("Seguros HDI requiere exactamente un archivo Excel.")

    all_raw_rows: List[Dict[str, Any]] = []
    warnings: List[str] = []
    excel_file = pd.ExcelFile(io.BytesIO(archivos_binarios[0]))
    if len(excel_file.sheet_names) > MAX_EXCEL_SHEETS:
        raise ValueError(f"El libro supera el límite de {MAX_EXCEL_SHEETS} hojas.")

    for sheet_name in excel_file.sheet_names:
        df_full = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)
        if len(df_full) > MAX_EXCEL_ROWS or len(df_full.columns) > MAX_EXCEL_COLS:
            raise ValueError("El libro excede los límites de filas o columnas permitidos.")

        header_index = None
        for index in range(min(6, len(df_full))):
            values = [str(value).upper().strip() for value in df_full.iloc[index]]
            has_id = any("IDENTIF" in value or "CEDULA" in value for value in values)
            if has_id and any("TIPO" in value for value in values):
                header_index = index
                break

        if header_index is None:
            raise ValueError(
                f"La hoja '{sheet_name}' no contiene encabezados válidos de Seguros HDI."
            )

        df_sheet = df_full.iloc[header_index + 1:].copy()
        df_sheet.columns = df_full.iloc[header_index].tolist()
        df_norm = normalizar_df(df_sheet, warnings_out=warnings)

        for _, row in df_norm.iterrows():
            row_dict = dict(row)
            row_dict["_origin_sheet"] = sheet_name
            all_raw_rows.append(row_dict)

    if not all_raw_rows:
        raise ValueError("El archivo no contiene filas válidas del formato Seguros HDI.")

    # Agrupar por CERT dentro del mismo origen (archivo y hoja)
    grupos_cert = collections.defaultdict(list)
    for idx_r, r in enumerate(all_raw_rows):
        sheet_name = r.get("_origin_sheet", "")
        cert_val = r.get("cert")
        if not cert_val:
            group_key = (sheet_name, f"dummy_{idx_r}")
        else:
            group_key = (sheet_name, cert_val)
        grupos_cert[group_key].append(r)

    consolidated_rows: List[Dict[str, Any]] = []
    for group_key, members in grupos_cert.items():
        cert_display = group_key[-1]
        titulares = [member for member in members if member["tipo"] == "P"]
        if len(titulares) != 1:
            raise ValueError(
                f"El grupo CERT '{cert_display}' debe contener exactamente un Titular; "
                f"se encontraron {len(titulares)}."
            )
        titular = titulares[0]

        prima_titular = titular["prima_anual"] / 12
        valor_rdc = round(prima_titular * 0.24, 2)
        valor_col_titular = round(prima_titular * 0.76, 2)
        valor_col_dependents = sum(
            member["prima_anual"] / 12
            for member in members
            if member is not titular
        )
        valor_colaborador = round(valor_col_titular + valor_col_dependents, 2)
        valor_total = round(valor_rdc + valor_colaborador, 2)
            
        # Crear la fila consolidada asociada al Titular
        obs = f"Grupo CERT {cert_display}"
        if len(members) > 1:
            nombres_dep = ", ".join(m["nombre_asociado"] for m in members if m is not titular)
            obs += f" | Incluye dependientes: {nombres_dep}"
            
        consolidated_rows.append({
            "cedula": titular["cedula"],
            "nombre_asociado": titular["nombre_asociado"],
            "empresa": titular.get("empresa", "REFRIDCOL"),
            "concepto": titular["concepto"],
            "valor": valor_total,
            "valor_rdc": valor_rdc,
            "valor_colaborador": valor_colaborador,
            "observaciones": obs
        })

    # CONSOLIDACIÓN FINAL: Agrupar por cédula (si un Titular tiene más de un CERT)
    consolidated_dict: Dict[str, Dict[str, Any]] = {}
    for row in consolidated_rows:
        cedula = row["cedula"]
        if cedula in consolidated_dict:
            consolidated_dict[cedula]["valor"] += row["valor"]
            consolidated_dict[cedula]["valor_rdc"] += row["valor_rdc"]
            consolidated_dict[cedula]["valor_colaborador"] += row["valor_colaborador"]
            if row["observaciones"]:
                obs_prev = consolidated_dict[cedula].get("observaciones")
                if obs_prev:
                    consolidated_dict[cedula]["observaciones"] = f"{obs_prev} || {row['observaciones']}"
                else:
                    consolidated_dict[cedula]["observaciones"] = row["observaciones"]
        else:
            consolidated_dict[cedula] = row.copy()
            
    final_rows = list(consolidated_dict.values())

    # Redondear valores finales
    for r in final_rows:
        r["valor"] = round(r["valor"], 2)
        r["valor_rdc"] = round(r["valor_rdc"], 2)
        r["valor_colaborador"] = round(r["valor_colaborador"], 2)

    total_valor = sum(r["valor"] for r in final_rows)
    summary = {
        "total_asociados": len(final_rows),
        "total_filas_consolidadas": len(final_rows),
        "total_valor": round(total_valor, 2),
        "archivos_procesados": 1,
        "archivos_recibidos": 1,
    }
    
    return final_rows, summary, warnings
