import asyncio
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario

async def main():
    async with AsyncSessionLocal() as session:
        # Buscar todos los registros de hoy de viáticos
        stmt = select(AuditoriaAccionUsuario).where(
            AuditoriaAccionUsuario.modulo == "viaticos"
        ).order_by(AuditoriaAccionUsuario.timestamp.desc()).limit(10)
        
        try:
            result = await session.execute(stmt)
            rows = result.scalars().all()
            
            print("--- REGISTROS DE HOY EN VIÁTICOS ---")
            for row in rows:
                print(f"ID: {row.id} | Fecha: {row.timestamp} | Usuario ID/Cédula: {row.usuario_id} | Nombre: {row.usuario_nombre} | Ruta: {row.ruta}")
        except Exception as e:
            print(f"Error al ejecutar consulta: {e}")

if __name__ == "__main__":
    asyncio.run(main())
