import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://user:pass@127.0.0.1:5432/project_manager'
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test_insert():
    async with async_session() as session:
        res = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'registros_asistencia';"))
        rows = [row for row in res]
        if not rows:
            print("TABLE NOT FOUND")
        for row in rows:
            print(row)

asyncio.run(test_insert())
