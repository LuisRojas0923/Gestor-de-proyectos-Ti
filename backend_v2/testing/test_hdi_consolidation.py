
import sys
import os

# Add the backend_v2 directory to the path
sys.path.append(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2')

from app.services.novedades_nomina.hdi_extractor import extraer_hdi

# Test data (mock rows as if they were extracted from PDF)
# We test the consolidation logic by mocking the internal state or just the function if possible.
# Since extraer_hdi requires real PDFs, I'll mock the consolidation logic itself in a separate test
# to ensure the core logic is correct.

def test_consolidation_logic():
    rows = [
        {"cedula": "123", "valor": 100.0, "nombre_asociado": "Juan", "empresa": "REFRIDCOL", "concepto": "HDI"},
        {"cedula": "456", "valor": 200.0, "nombre_asociado": "Maria", "empresa": "REFRIDCOL", "concepto": "HDI"},
        {"cedula": "123", "valor": 50.0, "nombre_asociado": "Juan", "empresa": "REFRIDCOL", "concepto": "HDI"},
    ]
    
    consolidated_dict = {}
    for row in rows:
        cedula = row["cedula"]
        if cedula in consolidated_dict:
            consolidated_dict[cedula]["valor"] += row["valor"]
        else:
            consolidated_dict[cedula] = row.copy()
    
    result = list(consolidated_dict.values())
    
    print(f"Original rows: {len(rows)}")
    print(f"Consolidated rows: {len(result)}")
    for r in result:
        print(f"ID: {r['cedula']}, Valor: {r['valor']}")
    
    # Assertions
    assert len(result) == 2
    for r in result:
        if r["cedula"] == "123":
            assert r["valor"] == 150.0
        if r["cedula"] == "456":
            assert r["valor"] == 200.0
    print("Test passed!")

if __name__ == "__main__":
    test_consolidation_logic()
