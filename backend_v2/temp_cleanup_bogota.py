import asyncio
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import async_session_maker
from app.models.novedades_nomina.nomina import NominaArchivo

async def clean_bogota_libranza():
    async with async_session_maker() as session:
        # Encontrar archivos con subcategoria 'BOGOTA LIBRANZA'
        stmt = select(NominaArchivo).where(NominaArchivo.subcategoria == "BOGOTA LIBRANZA")
        result = await session.execute(stmt)
        archivos = result.scalars().all()
        
        if not archivos:
            print("No se encontraron registros de BOGOTA LIBRANZA para eliminar.")
            return

        print(f"Eliminando {len(archivos)} archivos de BOGOTA LIBRANZA y sus registros en cascada...")
        for archivo in archivos:
            await session.delete(archivo)
        
        await session.commit()
        print("Eliminación completada con éxito.")

if __name__ == "__main__":
    asyncio.run(clean_bogota_libranza())
