import pandas as pd
import io
import os
import sys

# Añadir el path del backend para poder importar el extractor
sys.path.append(os.path.join(os.getcwd(), 'backend_v2'))

from app.services.novedades_nomina.celulares_extractor import extraer_celulares

def test_celulares_extraction():
    print("Iniciando prueba de extracción CELULARES...")
    
    # Simular un archivo Excel con la estructura solicitada
    # Hoja: CLARO, Encabezados en fila 19
    data = {
        'COL_VAR': [''] * 20, # Basura
        'CEDULA': [None] * 18 + ['CEDULA', '123456', '123456', '789012'],
        'DESC.EMPLEADO': [None] * 18 + ['DESC.EMPLEADO', 50000, 25000, 80000]
    }
    
    # Crear un buffer de Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Crear un dataframe vacío para rellenar con saltos manuales si es necesario, 
        # o simplemente usar startrow
        df_headers = pd.DataFrame([['CEDULA', 'DESC.EMPLEADO']])
        df_data = pd.DataFrame([
            ['123456', 50000],
            ['123456', 25000],
            ['789012', 80000]
        ])
        
        # Escribir en la hoja CLARO empezando en la fila 19 (índice 18)
        df_headers.to_excel(writer, sheet_name='CLARO', startrow=18, index=False, header=False)
        df_data.to_excel(writer, sheet_name='CLARO', startrow=19, index=False, header=False)
        
    excel_bin = output.getvalue()
    
    # Ejecutar extracción
    filas, summary, warnings = extraer_celulares([excel_bin])
    
    print(f"Summary: {summary}")
    print(f"Warnings: {warnings}")
    for f in filas:
        print(f"Fila: {f}")

    # Validaciones
    assert summary['total_asociados'] == 2, f"Se esperaban 2 asociados, se encontraron {summary['total_asociados']}"
    assert summary['total_valor'] == 155000, f"Valor total incorrecto: {summary['total_valor']}"
    
    # Verificar agrupación de 123456 (50000 + 25000 = 75000)
    fila_123 = next(f for f in filas if f['cedula'] == '123456')
    assert fila_123['valor'] == 75000, f"Valor agrupado incorrecto para 123456: {fila_123['valor']}"
    
    print("¡Prueba de extracción CELULARES exitosa!")

if __name__ == "__main__":
    try:
        test_celulares_extraction()
    except Exception as e:
        print(f"Error en el test: {e}")
        import traceback
        traceback.print_exc()
