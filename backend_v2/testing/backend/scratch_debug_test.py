import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.auth.usuario import Usuario

async def main():
    async with AsyncSessionLocal() as s:
        r = await s.execute(
            select(Usuario.id, Usuario.nombre, Usuario.rol, Usuario.cedula).where(
                Usuario.cedula == "1107068093"
            )
        )
        u = r.first()
        if u:
            print(f"ID: {u[0]}")
            print(f"Nombre: {u[1]}")
            print(f"Rol: {u[2]}")
            print(f"Cedula: {u[3]}")
        else:
            print("Usuario no encontrado")

asyncio.run(main())
