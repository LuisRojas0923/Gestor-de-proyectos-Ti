
import asyncio
from sqlmodel import Session, select
from sqlalchemy import create_engine
import sys
import os

sys.path.append(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2')
from app.config import config
from app.models.novedades_nomina.nomina import NominaArchivo

async def check_recent():
    sync_url = config.database_url.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(sync_url)
    with Session(engine) as session:
        statement = select(NominaArchivo).where(NominaArchivo.subcategoria == "MEDICINA PREPAGADA").order_by(NominaArchivo.creado_en.desc()).limit(5)
        results = session.exec(statement).all()
        for res in results:
            print(f"ID: {res.id}, Archivo: {res.nombre_archivo}, Creado: {res.creado_en}, Estado: {res.estado}")

if __name__ == "__main__":
    asyncio.run(check_recent())
