import asyncio
from app.database import AsyncSessionLocal
from app.models.auth.usuario import Usuario
from sqlalchemy import select

async def reset_pwd():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Usuario).where(Usuario.cedula == '1107838693'))
        u = res.scalars().first()
        u.hash_contrasena = '$2b$12$.RIpNbgcjSIlraDm.8V2C.XCknA4R2MnkphrTCGPHVSqPmH9sKube'
        await db.commit()

asyncio.run(reset_pwd())
