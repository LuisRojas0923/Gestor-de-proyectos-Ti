import os
import sys

# Añadir el path al backend para importar el extractor
sys.path.append(os.path.join(os.getcwd(), 'backend_v2'))

from sqlmodel import Session, select
from app.database import sync_engine
from app.models.novedades_nomina.nomina import NominaArchivo

import json

def check_latest_error():
    with Session(sync_engine) as session:
        statement = select(NominaArchivo).order_by(NominaArchivo.id.desc()).limit(5)
        results = session.exec(statement).all()
        
        print("Last 5 files:")
        for res in results:
            print(f"ID: {res.id}, Subcat: {res.subcategoria}, Status: {res.estado}")
            if res.estado == "Error":
                print(f"  Error Log: {res.error_log}")
            print("-" * 20)

if __name__ == "__main__":
    check_latest_error()
