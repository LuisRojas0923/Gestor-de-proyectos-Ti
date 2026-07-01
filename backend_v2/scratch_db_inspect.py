import asyncio
from sqlmodel import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.novedades_nomina.nomina import NominaRegistroNormalizado

async def main():
    DATABASE_URL = "postgresql+asyncpg://user:password_segura_refridcol@127.0.0.1:5432/project_manager"
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        stmt = select(NominaRegistroNormalizado).where(
            NominaRegistroNormalizado.subcategoria_final == "SEGUROS HDI",
            NominaRegistroNormalizado.mes_fact == 6,
            NominaRegistroNormalizado.año_fact == 2026
        ).limit(10)
        result = await session.execute(stmt)
        regs = result.scalars().all()
        print("REGISTROS DE SEGUROS HDI EN 6/2026:")
        for r in regs:
            print(f"Cedula: {r.cedula}, Nombre: {r.nombre_asociado}, Valor: {r.valor}, RDC: {r.valor_rdc}, Colab: {r.valor_colaborador}, Estado: {r.estado_validacion}, Obs: {r.observaciones}")

if __name__ == "__main__":
    asyncio.run(main())
