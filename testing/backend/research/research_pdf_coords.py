from pypdf import PdfReader
import os

def extract_label_coords():
    template_path = "app/resources/templates/form_220_2024.pdf"
    if not os.path.exists(template_path):
        print(f"Template not found at {template_path}")
        return

    reader = PdfReader(template_path)
    page = reader.pages[0]
    
    # Lista para guardar hallazgos
    found_labels = []

    def visitor(text, cm, tm, font_dict, font_size):
        # tm is the text matrix: [a, b, c, d, e, f]
        # e is X, f is Y
        x = tm[4]
        y = tm[5]
        if text.strip():
            found_labels.append({"text": text.strip(), "x": x, "y": y})

    page.extract_text(visitor_text=visitor)
    
    # Mostrar etiquetas interesantes (que contengan números de casilla o palabras clave)
    keywords = ["26.", "30.", "31.", "32.", "36.", "NIT", "Apellido", "Nombre"]
    for item in found_labels:
        if any(kw in item['text'] for kw in keywords):
            print(f"Found: {item['text']} at ({item['x']:.2f}, {item['y']:.2f})")

if __name__ == "__main__":
    extract_label_coords()
