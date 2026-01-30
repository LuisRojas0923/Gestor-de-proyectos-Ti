
import asyncio
from sqlalchemy import create_engine, text
from app.config import config

async def debug_user(cedula):
    print(f"--- Diagnóstico Usuario {cedula} ---")
    
    # 1. Verificar en BD Local
    try:
        local_engine = create_engine(config.database_url.replace("postgresql+asyncpg", "postgresql"))
        with local_engine.connect() as conn:
            print(f"\nConsultando BD Local...")
            query = text("SELECT id, cedula, nombre, rol, viaticante FROM usuarios WHERE cedula = :cedula")
            res = conn.execute(query, {"cedula": cedula}).first()
            if res:
                print(f"Local Data: {dict(res._mapping)}")
            else:
                print("Local: Usuario no registrado")
    except Exception as e:
        print(f"Error BD Local: {e}")

    # 2. Verificar en ERP
    try:
        erp_engine = create_engine(config.erp_database_url)
        with erp_engine.connect() as conn:
            print(f"Consultando ERP...")
            conn.execute(text("SET client_encoding TO 'LATIN1'"))
            query = text("SELECT nrocedula, nombre, cargo, area, estado FROM establecimiento WHERE nrocedula = :cedula")
            res = conn.execute(query, {"cedula": cedula}).first()
            if res:
                print(f"ERP Data: {dict(res._mapping)}")
            else:
                print("ERP: Usuario no encontrado")
    except Exception as e:
        print(f"Error ERP: {e}")

if __name__ == "__main__":
    asyncio.run(debug_user("14836440"))
