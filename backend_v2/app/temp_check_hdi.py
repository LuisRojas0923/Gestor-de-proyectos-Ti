
import asyncio
from sqlmodel import select, Session
from app.database import async_engine
from app.models.novedades_nomina.nomina import NominaRegistroNormalizado, NominaArchivo

async def check_data():
    async with async_engine.connect() as conn:
        # Check normalizados
        res = await conn.execute(select(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "SEGUROS HDI"))
        rows = res.all()
        print(f"DEBUG_INFO: Found {len(rows)} normalizados for SEGUROS HDI")
        for r in rows[:5]:
            print(f"DEBUG_INFO: Row - Cedula: {r.cedula}, Concepto: {r.concepto}, Mes: {r.mes_fact}, Año: {r.año_fact}")
        
        # Check files
        res_f = await conn.execute(select(NominaArchivo).where(NominaArchivo.subcategoria == "SEGUROS HDI"))
        files = res_f.all()
        print(f"DEBUG_INFO: Found {len(files)} files for SEGUROS HDI")

if __name__ == "__main__":
    asyncio.run(check_data())
