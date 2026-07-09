import asyncio
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario

async def main():
    async with AsyncSessionLocal() as session:
        # Consultar la cantidad de registros por día en julio
        stmt = select(
            AuditoriaAccionUsuario.timestamp,
            AuditoriaAccionUsuario.usuario_nombre,
            AuditoriaAccionUsuario.modulo,
            AuditoriaAccionUsuario.accion,
            AuditoriaAccionUsuario.resultado
        ).order_by(AuditoriaAccionUsuario.timestamp.desc()).limit(15)
        
        try:
            result = await session.execute(stmt)
            rows = result.all()
            
            print("--- ÚLTIMOS 15 REGISTROS DE AUDITORÍA ---")
            for row in rows:
                print(f"Fecha: {row.timestamp} | Usuario: {row.usuario_nombre} | Módulo: {row.modulo} | Acción: {row.accion} | Resultado: {row.resultado}")
        except Exception as e:
            print(f"Error al ejecutar consulta: {e}")

if __name__ == "__main__":
    asyncio.run(main())
