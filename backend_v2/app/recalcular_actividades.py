import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.desarrollo.actividad import Actividad
from app.services.desarrollos.porcentaje_service import (
    recalcular_porcentaje_jerarquico,
    recalcular_progreso_desarrollo,
)
from app.seed_data_actividades import DEVELOPMENTS_DATA

async def recalcular_todo():
    print("=" * 60)
    print(" RECALCULANDO PORCENTAJES Y PROGRESOS PARA TODOS LOS NUEVOS DESARROLLOS")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            for dev_data in DEVELOPMENTS_DATA:
                dev_id = dev_data["id"]
                print(f"\n📁 Recalculando WBS para desarrollo: {dev_id}...")
                
                # 1. Obtener todas las actividades del desarrollo
                stmt = select(Actividad).where(Actividad.desarrollo_id == dev_id)
                result = await db.execute(stmt)
                actividades = result.scalars().all()
                
                # Identificar hojas (actividades que no tienen hijos)
                parent_ids = {a.parent_id for a in actividades if a.parent_id is not None}
                hojas = [a for a in actividades if a.id not in parent_ids]
                
                print(f"  Total actividades: {len(actividades)} | Actividades hojas: {len(hojas)}")
                
                # Recalcular cada hoja para que se propague hacia arriba
                for hoja in hojas:
                    await recalcular_porcentaje_jerarquico(db, hoja)
                
                # 2. Recalcular el progreso general del desarrollo
                await recalcular_progreso_desarrollo(db, dev_id)
                print(f"  -> Avance general actualizado.")
            
            await db.commit()
            print("\n🎉 Recálculo de porcentajes y progresos finalizado con éxito!")
            print("=" * 60)
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error durante el recálculo: {e}")

if __name__ == "__main__":
    asyncio.run(recalcular_todo())
