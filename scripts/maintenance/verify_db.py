
import asyncio
from sqlalchemy import text
from backend_v2.app.database import async_engine

async def verify_columns():
    try:
        async with async_engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'lineas_corporativas'
            """))
            columns = [row[0] for row in result.fetchall()]
            print("COLUMNS FOUND:", columns)
            
            required = [
                'nombre_plan', 'convenio', 'aprobado_por', 
                'cobro_fijo_coef', 'cobro_especiales_coef',
                'cfm_con_iva', 'vr_factura'
            ]
            
            missing = [c for c in required if c not in columns]
            if missing:
                print("MISSING COLUMNS:", missing)
            else:
                print("ALL REQUIRED COLUMNS PRESENT")
    except Exception as e:
        print(f"Error verificando columnas: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(verify_columns())
