import asyncio
from app.services.auth.servicio import ServicioAuth
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def reset():
    db = AsyncSessionLocal()
    hash_pwd = ServicioAuth.obtener_hash_contrasena('admin123')
    await db.execute(text(f"UPDATE usuarios SET hash_contrasena='{hash_pwd}' WHERE cedula='admin'"))
    await db.commit()
    print('EXITO')

if __name__ == '__main__':
    asyncio.run(reset())
