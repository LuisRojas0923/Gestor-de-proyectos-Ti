import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from app.services.novedades_nomina.hdi_extractor import extraer_hdi, normalizar_df

def test_hdi_normalizar_df():
    # Columnas de HDI: CERT, NOV, TIPO, IDENTIFICACION, NOMBRES Y APELLIDOS, EDAD, PLAN, VALOR ASEGURADO, PRIMA ANUAL, EXTRAPRIMA, PRIMA COBRO
    data = {
        "CERT": [2, 2, 2],
        "NOV": ["CAR", "CAR", "CAR"],
        "TIPO": ["D", "D", "P"],
        "IDENTIFICACION": ["59661342", "1116235786", "94416010"],
        "NOMBRES Y APELLIDOS": ["FELIZA DUENAS", "HECTOR PAUL CRUZ", "JOSE ROBINSON PRECIADO"],
        "EDAD": [71, 39, 52],
        "PLAN": [1, 1, 1],
        "VALOR ASEGURADO": ["$ 55,000,000", "$ 200,000,000", "$ 85,000,000"],
        "PRIMA ANUAL": ["$ 354,310", "$ 920,200", "$ 391,085"],
        "EXTRAPRIMA": ["$ 0", "$ 0", "$ 0"],
        "PRIMA COBRO": ["$ 72,447", "$ 72,447", "$ 72,447"]
    }
    df = pd.DataFrame(data)
    df_result = normalizar_df(df)
    
    rows = df_result.to_dict(orient="records")
    assert len(rows) == 3
    
    # Registro 1 (D)
    assert rows[0]["cedula"] == "59661342"
    assert rows[0]["tipo"] == "D"
    assert rows[0]["cert"] == "2"
    
    # Registro 2 (D, con ID y Nombre reemplazados)
    assert rows[1]["cedula"] == "66903320"  # Reemplazo de 1116235786
    assert rows[1]["nombre_asociado"] == "TORRES AGUDELO MARIBEL"  # Reemplazo de HECTOR PAUL CRUZ + formato
    assert rows[1]["tipo"] == "D"
    assert rows[1]["cert"] == "2"
    
    # Registro 3 (P, Titular)
    assert rows[2]["cedula"] == "94416010"
    assert rows[2]["tipo"] == "P"
    assert rows[2]["cert"] == "2"

def test_hdi_extractor_calculations():
    # Simular la salida para probar la consolidación y cálculos
    # CERT 2 tiene 3 miembros:
    # 1. Jose (P, prima_anual=391085)
    #    prima_mensual = 391085 / 12 = 32590.416
    #    valor_rdc = 32590.416 * 0.24 = 7821.70
    #    valor_colaborador = 32590.416 * 0.76 = 24768.72
    # 2. Feliza (D, prima_anual=354310)
    #    prima_mensual = 354310 / 12 = 29525.83
    #    valor_colaborador = 29525.83
    # 3. Maribel (D, prima_anual=920200)
    #    prima_mensual = 920200 / 12 = 76683.33
    #    valor_colaborador = 76683.33
    #
    # Total valor_colaborador = 24768.72 + 29525.83 + 76683.33 = 130977.88
    # Total valor_rdc = 7821.70
    # Total valor_total = 138799.58 (los decimales sumados y redondeados dan .59)
    
    mock_table = [
        ["CERT", "NOV", "TIPO", "IDENTIFICACION", "NOMBRES Y APELLIDOS", "EDAD", "PLAN", "VALOR ASEGURADO", "PRIMA ANUAL", "EXTRAPRIMA", "PRIMA COBRO"],
        ["2", "CAR", "D", "59661342", "FELIZA DUENAS", "71", "1", "$ 55,000,000", "$ 354,310", "$ 0", "$ 72,447"],
        ["2", "CAR", "D", "1116235786", "HECTOR PAUL CRUZ", "39", "1", "$ 200,000,000", "$ 920,200", "$ 0", "$ 72,447"],
        ["2", "CAR", "P", "94416010", "JOSE ROBINSON PRECIADO", "52", "1", "$ 85,000,000", "$ 391,085", "$ 0", "$ 72,447"]
    ]
    
    mock_page = MagicMock()
    mock_page.extract_tables.return_value = [mock_table]
    mock_page.extract_text.return_value = ""
    
    mock_pdf = MagicMock()
    mock_pdf.__enter__.return_value = mock_pdf
    mock_pdf.pages = [mock_page]
    
    with patch("pdfplumber.open", return_value=mock_pdf):
        rows, summary, warnings = extraer_hdi([b"dummy_pdf_content"])
        
    # Debe consolidarse bajo la cédula del titular
    assert len(rows) == 1
    res = rows[0]
    
    assert res["cedula"] == "94416010"
    assert res["nombre_asociado"] == "ROBINSON PRECIADO JOSE"
    assert res["valor_rdc"] == 7821.70
    assert res["valor_colaborador"] == 130977.89
    assert res["valor"] == 138799.59


def test_hdi_excel_extractor():
    """Prueba que extraer_hdi procese correctamente un archivo binario de Excel (.xlsx)."""
    import io
    data = {
        "CERT": ["10", "10"],
        "TIPO": ["P", "D"],
        "IDENTIFICACION": ["94416010", "59661342"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO", "FELIZA DUENAS"],
        "PRIMA ANUAL": ["$ 391,085", "$ 354,310"]
    }
    df = pd.DataFrame(data)
    
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="HDI_HOJA1")
    
    excel_bytes = excel_buffer.getvalue()
    
    rows, summary, warnings = extraer_hdi([excel_bytes])
    
    assert len(rows) == 1
    res = rows[0]
    assert res["cedula"] == "94416010"
    assert res["nombre_asociado"] == "ROBINSON PRECIADO JOSE"
    assert summary["archivos_procesados"] == 1
    assert summary["total_asociados"] == 1

