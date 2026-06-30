import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://postgres:AdminSolid2025@192.168.0.21:5432/solid'
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test_insert():
    async with async_session() as session:
        res = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuarios';"))
        for row in res:
            print(row)

asyncio.run(test_insert())
