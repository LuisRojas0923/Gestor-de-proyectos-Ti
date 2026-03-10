import asyncio
from sqlalchemy import text
from app.database import async_engine

async def migrate_db():
    async with async_engine.begin() as conn:
        print("Migrating Requisiciones para flujo de aprobación...")
        queries = [
            # Nivel 1
            "ALTER TABLE requisiciones_personal ADD COLUMN IF NOT EXISTS id_jefe_aprobador VARCHAR(50);",
            "ALTER TABLE requisiciones_personal ADD COLUMN IF NOT EXISTS fecha_revision_jefe TIMESTAMP;",
            "ALTER TABLE requisiciones_personal ADD COLUMN IF NOT EXISTS comentario_revision_jefe TEXT;",
            
            # Nivel 2
            "ALTER TABLE requisiciones_personal ADD COLUMN IF NOT EXISTS id_gh_aprobador VARCHAR(50);",
            "ALTER TABLE requisiciones_personal ADD COLUMN IF NOT EXISTS fecha_revision_gh TIMESTAMP;",
            "ALTER TABLE requisiciones_personal ADD COLUMN IF NOT EXISTS comentario_revision_gh TEXT;",
            
            # Actualizar estado actual para coincidir con nuevo flujo
            "UPDATE requisiciones_personal SET estado = 'Pendiente de Jefe' WHERE estado = 'Pendiente';",
        ]
        
        for q in queries:
            try:
                await conn.execute(text(q))
                print(f"Ejecutado: {q}")
            except Exception as e:
                print(f"Error ejecutando {q}: {e}")
        
        print("Migración completada con éxito.")

if __name__ == "__main__":
    asyncio.run(migrate_db())
