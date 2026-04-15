import os
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from io import BytesIO
from pypdf import PdfReader, PdfWriter

def create_calibration_grid():
    template_path = "app/resources/templates/form_220_2024.pdf"
    output_path = "scratch/calibration_grid_220.pdf"
    
    if not os.path.exists(template_path):
        print(f"Template not found at {template_path}")
        return

    # 1. Capa de rejilla de alta precisión
    grid_buffer = BytesIO()
    c = canvas.Canvas(grid_buffer, pagesize=LETTER)
    
    # Dibujar líneas horizontales (Y)
    for y in range(0, 800, 10):
        # Líneas cada 10 pts, más gruesas cada 50
        if y % 50 == 0:
            c.setStrokeColorRGB(0.5, 0.5, 0.5) # Gris medio
            c.setLineWidth(0.5)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(2, y + 2, f"Y={y}")
            c.drawString(585, y + 2, f"Y={y}")
        else:
            c.setStrokeColorRGB(0.8, 0.8, 0.8) # Gris muy claro
            c.setLineWidth(0.1)
            if y % 10 == 0 and y % 50 != 0:
                c.setFont("Helvetica", 5)
                c.drawString(25, y + 1, str(y))
        
        c.line(0, y, 612, y)

    # Dibujar líneas verticales (X)
    for x in range(0, 620, 10):
        if x % 50 == 0:
            c.setStrokeColorRGB(0.5, 0.5, 0.5)
            c.setLineWidth(0.5)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(x + 2, 782, f"X={x}")
            c.drawString(x + 2, 5, f"X={x}")
        else:
            c.setStrokeColorRGB(0.8, 0.8, 0.8)
            c.setLineWidth(0.1)
            if x % 20 == 0:
                c.setFont("Helvetica", 5)
                c.drawString(x + 1, 770, str(x))
        
        c.line(x, 0, x, 792)

    c.save()
    grid_buffer.seek(0)

    # 2. Fusionar
    reader = PdfReader(template_path)
    grid_reader = PdfReader(grid_buffer)
    writer = PdfWriter()
    
    page = reader.pages[0]
    page.merge_page(grid_reader.pages[0])
    writer.add_page(page)
    
    with open(output_path, "wb") as f:
        writer.write(f)
    print(f"High-resolution Calibration PDF created at {output_path}")

if __name__ == "__main__":
    create_calibration_grid()
