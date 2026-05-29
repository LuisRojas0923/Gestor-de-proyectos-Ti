"""
Script de prueba para analizar el PDF de Camposanto y ver el texto que extrae pdfplumber.
Ejecutar con: docker compose exec backend_v2 python /app/test_pdf.py
"""
import io
import re
import sys
import pdfplumber

# Intentar cargar el PDF
paths = [
    "/app/AN-3000006838-ENE-2026.pdf",
    "AN-3000006838-ENE-2026.pdf",
]

content = None
for path in paths:
    try:
        with open(path, "rb") as f:
            content = f.read()
        print(f"PDF cargado: {path} ({len(content)} bytes)", flush=True)
        break
    except FileNotFoundError:
        continue

if content is None:
    print("ERROR: No se encontró el PDF", flush=True)
    sys.exit(1)

# Extraer texto
texto_total = ""
with pdfplumber.open(io.BytesIO(content)) as pdf:
    print(f"Páginas: {len(pdf.pages)}", flush=True)
    for i, page in enumerate(pdf.pages):
        txt = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
        texto_total += txt + "\n"
        if i < 2:
            print(f"\n--- PAGINA {i+1} ---", flush=True)
            print(repr(txt[:2000]), flush=True)

print("\n--- LINEAS CON 'Documento' ---", flush=True)
for linea in texto_total.splitlines():
    if "documento" in linea.lower():
        print(repr(linea), flush=True)

# Probar regex
RE = re.compile(r"Documento\s*No[:\s]*(\d+)\s+Nombre[:\s]+(.+?)\s+\$\s*([\d.,]+)", re.IGNORECASE)
matches = RE.findall(texto_total)
print(f"\n--- REGEX MATCHES ({len(matches)}) ---", flush=True)
for m in matches[:5]:
    print(m, flush=True)
