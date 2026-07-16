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
        "IDENTIFICACION": ["1111111", "22222222", "3333333"],
        "NOMBRE": ["Juan Perez", "Maria Perez", "Pedro Gomez"],
        "PRIMA ANUAL": [1200, 600, 2400] # Anual, divisible por 12
    })
    
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        # Escribimos el DataFrame desde la fila 1 (0-indexed, o sea la segunda fila).
        # La primera fila (row 0) quedará vacía o podríamos escribirle un título manual, 
        # pero skiprows=1 la ignorará de todas formas.
        df.to_excel(writer, index=False, startrow=1)
        
        # Opcional: escribir el título en la celda A1 para emular exactamente el archivo real
        sheet = writer.sheets['Sheet1']
        sheet['A1'] = "RELACION DE ASEGURADOS"
        
    buffer.seek(0)
    
    # Extraer
    rows, summary, warnings = extraer_hdi([buffer.getvalue()])
    
    assert summary["total_registros"] == 2 # 2 grupos (123 y 456)
    assert rows[0]["cedula"] == "1111111" # Juan Perez
    
    # Matemáticas para Grupo 123:
    # Prima titular: 1200 / 12 = 100 mensual.
    # Aporte colaborador titular: 100 * 0.76 = 76.
    # Aporte dependiente: 600 / 12 = 50.
    # Total cobro colaborador: 76 + 50 = 126.
    assert rows[0]["valor_colaborador"] == 126.0
    assert rows[0]["valor"] == 150.0
    
    assert rows[1]["cedula"] == "3333333" # Pedro Gomez
    
    # Matemáticas para Grupo 456:
    # Prima titular: 2400 / 12 = 200 mensual.
    # Aporte colaborador titular: 200 * 0.76 = 152.
    # Total: 152.
    assert rows[1]["valor_colaborador"] == 152.0
    assert rows[1]["valor"] == 200.0

def test_hdi_extractor_invalid_tipo():
    # Probar que salta registros inválidos (Ej. 'TOTAL' o vacíos)
    df = pd.DataFrame({
        "Unnamed: 0": [1, 2, 3],
        "CERT": ["123", "123", "TOTAL"],
        "TIPO": ["P", "X", ""],
        "IDENTIFICACION": ["1111111", "2222", "3"],
        "NOMBRE": ["Juan Perez", "Invalido", "Total"],
        "PRIMA ANUAL": [1200, 600, 1500]
    })
    
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, startrow=1)
        sheet = writer.sheets['Sheet1']
        sheet['A1'] = "RELACION DE ASEGURADOS"
    buffer.seek(0)
    
    rows, summary, warnings = extraer_hdi([buffer.getvalue()])
    
    # Solo debe agarrar el 'P' porque 'X' y '' no son 'P' ni 'D'
    assert summary["total_registros"] == 1
    # Prima titular 1200 / 12 = 100. Colaborador: 100 * 0.76 = 76.
    assert rows[0]["valor_colaborador"] == 76.0
    assert rows[0]["valor"] == 100.0
