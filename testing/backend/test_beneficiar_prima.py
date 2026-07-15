import pytest
import io
import pandas as pd
from app.services.novedades_nomina.beneficiar_extractor import extraer_beneficiar

def test_extraer_beneficiar_con_prima():
    """
    Valida que el extractor de Beneficiar reconozca la nueva columna 'DCTO_PRIMA'
    y la mapee correctamente bajo el concepto 'BENEFICIAR PRIMA'.
    """
    # 1. Crear datos simulados de prueba con formato esperado (skiprows=3)
    # Fila 1-3: Metadatos o vacías
    # Fila 4: Encabezados
    data = {
        "CEDULA": [1107068093, 22334455],
        "DCTO_APORTE": [50000, 0],
        "DCTO_AHORRO": [10000, 20000],
        "DCTO_OBLIGACIONES": [0, 150000],
        "DCTO_SERVICIOS": [5000, 0],
        "DCTO_GES": [2000, 0],
        "DCTO_ROTATIVO": [0, 0],
        "DCTO_PRIMA": [120000, 0]  # El primer asociado tiene Prima, el segundo no
    }
    
    df_headers = pd.DataFrame(data)
    
    output = io.BytesIO()
    # Escribimos los encabezados a partir de la fila 4 (skiprows=3)
    df_headers.to_excel(output, sheet_name="Sheet1", startrow=3, index=False)
        
    excel_binario = output.getvalue()
    
    # 2. Ejecutar extractor
    filas, resumen, warnings = extraer_beneficiar([excel_binario])
    
    # 3. Validaciones
    assert len(warnings) == 0, f"Se generaron warnings inesperados: {warnings}"
    assert resumen["archivos_procesados"] == 1
    
    # Validar primer asociado (con prima)
    filas_asoc1 = [f for f in filas if f["cedula"] == "1107068093"]
    # Debe tener: BENEFICIAR APORTE (50.000), BENEFICIAR OTROS DESCUENTOS (10.000 + 5.000 + 2.000 = 17.000) y BENEFICIAR PRIMA (120.000)
    conceptos_asoc1 = {f["concepto"]: f["valor"] for f in filas_asoc1}
    
    assert "BENEFICIAR APORTE" in conceptos_asoc1
    assert conceptos_asoc1["BENEFICIAR APORTE"] == 50000.0
    
    assert "BENEFICIAR OTROS DESCUENTOS" in conceptos_asoc1
    assert conceptos_asoc1["BENEFICIAR OTROS DESCUENTOS"] == 17000.0
    
    assert "BENEFICIAR PRIMA" in conceptos_asoc1
    assert conceptos_asoc1["BENEFICIAR PRIMA"] == 120000.0
    
    # Validar segundo asociado (sin prima)
    filas_asoc2 = [f for f in filas if f["cedula"] == "22334455"]
    conceptos_asoc2 = {f["concepto"]: f["valor"] for f in filas_asoc2}
    
    assert "BENEFICIAR PRIMA" not in conceptos_asoc2
    assert conceptos_asoc2["BENEFICIAR CREDITO"] == 150000.0
    assert conceptos_asoc2["BENEFICIAR OTROS DESCUENTOS"] == 20000.0


def test_extraer_beneficiar_sin_columna_prima():
    data = {
        "CEDULA": [1107068093],
        "DCTO_APORTE": [50000],
        "DCTO_AHORRO": [10000],
        "DCTO_OBLIGACIONES": [150000],
        "DCTO_SERVICIOS": [5000],
        "DCTO_GES": [2000],
        "DCTO_ROTATIVO": [0],
    }
    output = io.BytesIO()
    pd.DataFrame(data).to_excel(output, startrow=3, index=False)

    filas, resumen, warnings = extraer_beneficiar([output.getvalue()])

    assert warnings == []
    assert resumen["archivos_procesados"] == 1
    assert "BENEFICIAR PRIMA" not in {fila["concepto"] for fila in filas}
    assert sum(fila["valor"] for fila in filas) == 217000


def test_extraer_beneficiar_rechaza_columna_obligatoria_ausente():
    output = io.BytesIO()
    pd.DataFrame({"CEDULA": [1107068093]}).to_excel(output, startrow=3, index=False)

    filas, resumen, warnings = extraer_beneficiar([output.getvalue()])

    assert filas == []
    assert resumen["archivos_procesados"] == 0
    assert any("Faltan columnas" in warning for warning in warnings)
