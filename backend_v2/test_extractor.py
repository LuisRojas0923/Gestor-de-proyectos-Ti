
import io
import pandas as pd
from typing import List, Tuple, Dict, Any
import logging

# Simulando el entorno
import sys
import os
sys.path.append(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2')

from app.services.novedades_nomina.medicina_prepagada_extractor import extraer_medicina_prepagada

def test_extraction():
    # Simular una lista de bytes vacía para ver si falla por algo básico
    try:
        rows, summary, warnings = extraer_medicina_prepagada([])
        print("Test 1 (vacio) exitoso")
    except Exception as e:
        print(f"Test 1 falló: {e}")

    # Simular un archivo excel no encriptado (crear uno pequeño en memoria)
    try:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df = pd.DataFrame({
                'CEDULA': ['123', '456'],
                'VALOR MENSUAL': [1000, 2000]
            })
            df.to_excel(writer, sheet_name='FAC_PREPAGADA', startrow=3, index=False)
        
        output.seek(0)
        content = output.getvalue()
        
        rows, summary, warnings = extraer_medicina_prepagada([content])
        print(f"Test 2 (valido) exitoso: {len(rows)} registros")
    except Exception as e:
        print(f"Test 2 falló: {e}")

if __name__ == "__main__":
    test_extraction()
