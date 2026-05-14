import asyncio
from app.database import AsyncSessionLocal
from app.models.auth.usuario import Usuario
from sqlmodel import select

async def main():
    async with AsyncSessionLocal() as session:
        try:
            try:
                res = await session.execute(select(Usuario).where(Usuario.cedula == 'admin'))
            except Exception:
                pass
        except Exception:
            pass
        u = res.scalar_one_or_none()
        if u:
            print(f'Admin found: activo={u.esta_activo}, rol={u.rol}')
        else:
            print('Admin NOT found')

if __name__ == '__main__':
    asyncio.run(main())