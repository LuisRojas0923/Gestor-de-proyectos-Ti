from app.database import sync_engine
from sqlalchemy import text
import pdfplumber

def main():
    with sync_engine.connect() as conn:
        result = conn.execute(text("SELECT ruta_almacenamiento FROM nomina_archivos WHERE subcategoria='SEGUROS HDI' ORDER BY id DESC LIMIT 1"))
        row = result.fetchone()
        if row:
            print('Path:', row[0])
            with pdfplumber.open(row[0]) as pdf:
                print('Total pages:', len(pdf.pages))
                for i, page in enumerate(pdf.pages):
                    print(f'--- PAGE {i} ---')
                    t = page.extract_text()
                    print('Text length:', len(t) if t else 0)
        else:
            print('No file found')

if __name__ == '__main__':
    main()
