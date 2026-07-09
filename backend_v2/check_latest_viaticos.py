import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(AuditoriaAccionUsuario).where(
            AuditoriaAccionUsuario.modulo == "viaticos"
        ).order_by(AuditoriaAccionUsuario.timestamp.desc()).limit(5)
        
        try:
            result = await db.execute(stmt)
            rows = result.scalars().all()
            
            print("--- ÚLTIMOS REGISTROS DE AUDITORÍA ---")
            for row in rows:
                print(f"ID: {row.id}")
                print(f"  Usuario Actor: {row.usuario_nombre} ({row.usuario_id})")
                print(f"  Accion: {row.accion}")
                print(f"  Ruta: {row.ruta}")
                print(f"  Metadatos: {row.metadatos}")
                print("-" * 40)
        except Exception as e:
            print(f"Error al ejecutar consulta: {e}")

if __name__ == "__main__":
    asyncio.run(main())
