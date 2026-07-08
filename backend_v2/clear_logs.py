import asyncio
from app.database import AsyncSessionLocal
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario
from sqlalchemy import delete

async def main():
    async with AsyncSessionLocal() as db:
        # Limpiar registros de viáticos para permitir repetir pruebas de auditoría
        await db.execute(delete(AuditoriaAccionUsuario).where(AuditoriaAccionUsuario.modulo == "viaticos"))
        await db.commit()
        print("Registros de viáticos eliminados exitosamente de la auditoría.")

if __name__ == "__main__":
    asyncio.run(main())
