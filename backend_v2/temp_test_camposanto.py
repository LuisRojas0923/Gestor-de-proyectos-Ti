"""Script para analizar el texto extraído del PDF de Camposanto y ajustar regex."""
import sys
import pdfplumber
import re
import io

# El PDF debe copiarse al mismo nivel que este script o en /tmp
# Intentar en varios paths posibles
paths_to_try = [
    "/tmp/camposanto.pdf",
    "/app/AN-3000006838-ENE-2026.pdf",
    "AN-3000006838-ENE-2026.pdf",
]

pdf_content = None
for p in paths_to_try:
    try:
        with open(p, "rb") as f:
            pdf_content = f.read()
        print(f"[OK] PDF leido desde: {p}", flush=True)
        break
    except FileNotFoundError:
        continue

if pdf_content is None:
    print("[ERROR] No se encontro el PDF en ninguna ruta.", flush=True)
    sys.exit(1)

print(f"\n[INFO] Tamanio del PDF: {len(pdf_content)} bytes\n", flush=True)

texto_total = ""
with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
    print(f"[INFO] Paginas en el PDF: {len(pdf.pages)}\n", flush=True)
    for i, page in enumerate(pdf.pages[:3]):
        txt = page.extract_text() or ""
        texto_total += txt + "\n"
        print(f"--- PAGINA {i+1} (repr) ---", flush=True)
        print(repr(txt[:2000]), flush=True)
        print()

print("\n=== LINEAS CON 'Documento' ===", flush=True)
for linea in texto_total.splitlines():
    if "documento" in linea.lower():
        print(repr(linea), flush=True)

print("\n=== TEST REGEX PRINCIPAL ===", flush=True)
PATTERN = re.compile(
    r"Documento\s+No[:\s]+(\d+)\s+Nombre[:\s]+(.+?)\s+\$\s*([\d.,]+)",
    re.IGNORECASE,
)
matches = PATTERN.findall(texto_total)
print(f"Matches encontrados: {len(matches)}", flush=True)
for m in matches[:10]:
    print(f"  {m}", flush=True)

print("\n=== TEST REGEX ALTERNATIVO ===", flush=True)
PATTERN2 = re.compile(r"Documento\s*No:?\s*(\d+)", re.IGNORECASE)
matches2 = PATTERN2.findall(texto_total)
print(f"Solo cedulas encontradas: {len(matches2)}", flush=True)
for m2 in matches2[:10]:
    print(f"  cedula: {m2}", flush=True)
