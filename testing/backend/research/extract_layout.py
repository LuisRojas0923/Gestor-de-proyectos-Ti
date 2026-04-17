from pypdf import PdfReader
import sys

def extract_text_with_coords(pdf_path):
    reader = PdfReader(pdf_path)
    page = reader.pages[0]
    
    def visitor_body(text, cm, tm, fontDict, fontSize):
        x = tm[4]
        y = tm[5]
        if text.strip():
            print(f"'{text.strip()}' at ({x:.2f}, {y:.2f}) size {fontSize}")

    page.extract_text(visitor_text=visitor_body)

if __name__ == "__main__":
    extract_text_with_coords(sys.argv[1])
