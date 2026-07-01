from pypdf import PdfReader
import os

# Ruta absoluta basada en la ubicación del archivo
template_path = r"c:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\resources\templates\form_220_2024.pdf"

if not os.path.exists(template_path):
    print(f"Template not found at: {template_path}")
else:
    reader = PdfReader(template_path)
    page = reader.pages[0]
    
    found_nums = []
    def visitor(text, cm, tm, font_dict, font_size):
        content = text.strip()
        # Buscar números de casilla (ej: "36", "37.")
        clean_content = content.rstrip('.')
        if clean_content.isdigit():
            num = int(clean_content)
            if 30 <= num <= 65:
                found_nums.append((num, tm[4], tm[5], content))

    page.extract_text(visitor_text=visitor)
    
    # Ordenar por Y (desc) para ver el flujo de arriba a abajo
    found_nums.sort(key=lambda x: (-x[2], x[1]))
    
    print("--- DETECCIÓN DE CASILLAS ---")
    for num, x, y, raw in found_nums:
        print(f"Casilla {num} ({raw}) -> X: {x:.2f}, Y: {y:.2f}")
