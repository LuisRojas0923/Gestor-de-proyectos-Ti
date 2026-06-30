import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.biometria.biometria_models import SQLModel
import app.models.auth.usuario # to load the usuario model

DATABASE_URL = 'postgresql+asyncpg://postgres:AdminSolid2025@192.168.0.21:5432/solid'
engine = create_async_engine(DATABASE_URL, echo=True)

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

asyncio.run(init_models())
