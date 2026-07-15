from app.services.novedades_nomina.hdi_extractor import extraer_hdi
import json

file_path = "c:/Users/amejoramiento3/Desktop/DESCUENTOS_NOMINA_REFRIDCOL_SOLID/Gestor-de-proyectos-Ti/ARCHIVO_PLANO_JULIO_2026.xlsx"
with open(file_path, "rb") as f:
    content = f.read()

rows, summary, warnings = extraer_hdi([content])

print("SUMMARY:", summary)
print("WARNINGS:", warnings)
print("FIRST 5 ROWS:")
for r in rows[:5]:
    print(json.dumps(r, indent=2, default=str))

print("\nTotal Titulares extraidos:", len(rows))
