import pytest
import io
import pandas as pd
from app.services.novedades_nomina.hdi_extractor import extraer_hdi

def test_hdi_extractor_valid():
    # Crear un excel falso en memoria con la estructura de HDI
    df = pd.DataFrame({
        "Unnamed: 0": [1, 2, 3], # Para que se elimine
        "CERT": ["123", "123", "456"],
        "TIPO": ["P", "D", "P"],
        "IDENTIFICACION": ["1.111.111", "22.222.222", "3333333"],
        "NOMBRE": ["Juan Perez", "Maria Perez", "Pedro Gomez"],
        "PRIMA ANUAL": ["1000", "500", "2000"]
    })
    
    # Simular que hay una primera fila que se ignora
    df_raw = pd.DataFrame([["TITULO", "", "", "", "", ""]] + df.values.tolist(), columns=df.columns)
    
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df_raw.to_excel(writer, index=False)
    buffer.seek(0)
    
    # Extraer
    rows, summary, warnings = extraer_hdi([buffer.getvalue()])
    
    assert summary["total_registros"] == 2 # 2 grupos (123 y 456)
    assert rows[0]["cedula"] == "1111111" # Juan Perez
    assert rows[0]["valor"] == 1500.0 # 1000 + 500 (P + D)
    assert rows[1]["cedula"] == "3333333" # Pedro Gomez
    assert rows[1]["valor"] == 2000.0 # Solo P

def test_hdi_extractor_invalid_tipo():
    # Probar que salta registros inválidos (Ej. 'TOTAL' o vacíos)
    df = pd.DataFrame({
        "CERT": ["123", "123", "TOTAL"],
        "TIPO": ["P", "X", ""],
        "IDENTIFICACION": ["1.111.111", "2.222", "3"],
        "NOMBRE": ["Juan Perez", "Invalido", "Total"],
        "PRIMA ANUAL": [1000, 500, 1500]
    })
    
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    buffer.seek(0)
    
    rows, summary, warnings = extraer_hdi([buffer.getvalue()])
    
    # Solo debe agarrar el 'P' porque 'X' y '' no son 'P' ni 'D'
    assert summary["total_registros"] == 1
    assert rows[0]["valor"] == 1000.0
