import io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, LETTER
import sys

def create_grid_overlay(pagesize):
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=pagesize)
    width, height = pagesize
    
    # Draw a grid with labels every 50 points
    c.setStrokeColorRGB(0.8, 0.8, 0.8) # Light gray
    c.setFont("Helvetica", 6)
    
    # Vertical lines
    for x in range(0, int(width), 20):
        c.line(x, 0, x, height)
        if x % 100 == 0:
            c.drawString(x + 2, 10, str(x))
            
    # Horizontal lines
    for y in range(0, int(height), 20):
        c.line(0, y, width, y)
        if y % 100 == 0:
            c.drawString(10, y + 2, str(y))
            
    # Red marks every 10 points for finer tuning
    c.setStrokeColorRGB(1, 0, 0)
    for x in range(0, int(width), 10):
        if x % 20 != 0:
            c.line(x, 0, x, 5)
    for y in range(0, int(height), 10):
        if y % 20 != 0:
            c.line(0, y, 5, y)
            
    c.save()
    packet.seek(0)
    return packet

def calibrate_pdf(input_path, output_path):
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        # Get dimensions of first page
        page = reader.pages[0]
        box = page.mediabox
        pagesize = (float(box.width), float(box.height))
        print(f"PDF Dimensions: {pagesize[0]} x {pagesize[1]}")
        
        grid_packet = create_grid_overlay(pagesize)
        grid_reader = PdfReader(grid_packet)
        
        page.merge_page(grid_reader.pages[0])
        writer.add_page(page)
        
        with open(output_path, "wb") as f:
            writer.write(f)
        print(f"Calibration PDF created at: {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    calibrate_pdf(sys.argv[1], sys.argv[2])
