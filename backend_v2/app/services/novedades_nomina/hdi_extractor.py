"""
Extractor especializado para archivos Excel (.xlsx, .xls) de SEGUROS HDI.
Implementa los 7 pasos de normalización solicitados por el usuario.
"""

import io
import math
import re
import collections
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd

from .errores import ErrorEstructuraNomina
from .validacion_excel_hdi import MAX_EXCEL_COLS, MAX_EXCEL_ROWS, MAX_EXCEL_SHEETS


COLUMNAS_HDI_REQUERIDAS = (
    "CERT",
    "TIPO",
    "IDENTIFICACION",
    "NOMBRES Y APELLIDOS",
    "PRIMA ANUAL",
)

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

    if isinstance(valor, bool):
        raise ValueError("Un booleano no es un valor monetario")
    if isinstance(valor, (int, float)):
        numero = float(valor)
        if not math.isfinite(numero):
            raise ValueError("El valor monetario debe ser finito")
        return numero

    s = str(valor).replace("\u00A0", " ").strip()
    if not s:
        return 0.0

    if s.startswith("$"):
        s = s[1:].strip()
    s = s.replace(" ", "")
    patrones_validos = (
        r"-?\d+",
        r"-?\d+[\.,]\d{1,2}",
        r"-?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?",
        r"-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?",
    )
    if not any(re.fullmatch(patron, s) for patron in patrones_validos):
        raise ValueError("Formato monetario inválido")

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

    return float(s)


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


def normalizar_df(
    df: pd.DataFrame,
    warnings_out: Optional[List[str]] = None,
    sheet_name: str = "Hoja",
    first_data_row: int = 2,
) -> pd.DataFrame:
    """Valida y normaliza el contrato tabular estricto de Seguros HDI."""
    df = df.copy()
    if len(df.columns) > MAX_EXCEL_COLS:
        raise ErrorEstructuraNomina(
            f"Hoja '{sheet_name}': supera el límite de {MAX_EXCEL_COLS} columnas."
        )
    if len(df) > MAX_EXCEL_ROWS:
        raise ErrorEstructuraNomina(
            f"Hoja '{sheet_name}': supera el límite de {MAX_EXCEL_ROWS} filas."
        )

    columnas = [str(columna).upper().strip() for columna in df.columns]
    duplicadas = sorted({
        columna
        for columna in COLUMNAS_HDI_REQUERIDAS
        if columnas.count(columna) > 1
    })
    if duplicadas:
        raise ErrorEstructuraNomina(
            f"Hoja '{sheet_name}': columna obligatoria duplicada: {', '.join(duplicadas)}."
        )

    faltantes = [
        columna for columna in COLUMNAS_HDI_REQUERIDAS
        if columna not in columnas
    ]
    if faltantes:
        raise ErrorEstructuraNomina(
            f"Hoja '{sheet_name}': faltan columnas obligatorias: {', '.join(faltantes)}."
        )

    indices = {
        columna: columnas.index(columna)
        for columna in COLUMNAS_HDI_REQUERIDAS
    }
    df = df.dropna(axis=0, how="all")
    if df.empty:
        raise ErrorEstructuraNomina(f"Hoja '{sheet_name}': no contiene filas de datos.")

    valid_rows = []
    for posicion, (_, row) in enumerate(df.iterrows()):
        fila_excel = first_data_row + posicion

        def error(campo: str, motivo: str) -> ErrorEstructuraNomina:
            return ErrorEstructuraNomina(
                f"Hoja '{sheet_name}', fila {fila_excel}: {campo} {motivo}."
            )

        cert_raw = row.iloc[indices["CERT"]]
        if pd.isna(cert_raw) or str(cert_raw).strip() == "":
            raise error("CERT", "es obligatorio")
        cert_texto = str(cert_raw).strip()
        if not re.fullmatch(r"\d+(?:\.0)?", cert_texto):
            raise error("CERT", "debe ser numérico")
        cert_val = cert_texto.split(".")[0]

        tipo = str(row.iloc[indices["TIPO"]]).strip().upper()
        if tipo not in ("P", "D"):
            raise error("TIPO", "debe ser P o D")

        id_raw = row.iloc[indices["IDENTIFICACION"]]
        if pd.isna(id_raw) or str(id_raw).strip() == "":
            raise error("IDENTIFICACION", "es obligatoria")
        id_texto = str(id_raw).strip()
        if not re.fullmatch(r"\d{5,12}(?:\.0)?", id_texto):
            raise error("IDENTIFICACION", "debe contener entre 5 y 12 dígitos")
        id_val = id_texto.split(".")[0]

        nombre_raw = row.iloc[indices["NOMBRES Y APELLIDOS"]]
        if not isinstance(nombre_raw, str):
            raise error("NOMBRES Y APELLIDOS", "debe ser texto")
        if not nombre_raw.strip():
            raise error("NOMBRES Y APELLIDOS", "es obligatorio")
        nombre = nombre_raw.strip().split("  ")[0]

        prima_raw = row.iloc[indices["PRIMA ANUAL"]]
        if pd.isna(prima_raw) or str(prima_raw).strip() == "":
            raise error("PRIMA ANUAL", "es obligatoria")
        try:
            prima_anual = _limpiar_numero(prima_raw)
        except (TypeError, ValueError) as exc:
            raise error("PRIMA ANUAL", "debe tener un formato monetario válido") from exc
        if prima_anual <= 0:
            raise error("PRIMA ANUAL", "debe ser un valor monetario mayor que cero")

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
        mejor_coincidencia = -1
        for index in range(min(6, len(df_full))):
            values = [str(value).upper().strip() for value in df_full.iloc[index]]
            coincidencias = sum(
                columna in values for columna in COLUMNAS_HDI_REQUERIDAS
            )
            if coincidencias > mejor_coincidencia:
                mejor_coincidencia = coincidencias
                header_index = index

        if header_index is None or mejor_coincidencia == 0:
            raise ErrorEstructuraNomina(
                f"La hoja '{sheet_name}' no contiene encabezados válidos de Seguros HDI."
            )

        df_sheet = df_full.iloc[header_index + 1:].copy()
        df_sheet.columns = df_full.iloc[header_index].tolist()
        df_norm = normalizar_df(
            df_sheet,
            warnings_out=warnings,
            sheet_name=sheet_name,
            first_data_row=header_index + 2,
        )

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
