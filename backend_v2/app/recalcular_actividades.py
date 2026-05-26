import asyncio
import os
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.desarrollo.actividad import Actividad
from app.services.desarrollos.porcentaje_service import (
    recalcular_porcentaje_jerarquico,
    recalcular_progreso_desarrollo,
)

async def recalcular_todo():
    print("=" * 60)
    print(" RECALCULANDO PORCENTAJES Y PROGRESO DE ACTIVIDADES WBS (ACT-00049)")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Obtener todas las actividades del desarrollo ACT-00049
            stmt = select(Actividad).where(Actividad.desarrollo_id == "ACT-00049")
            result = await db.execute(stmt)
            actividades = result.scalars().all()
            
            # Identificar hojas (actividades que no tienen hijos)
            parent_ids = {a.parent_id for a in actividades if a.parent_id is not None}
            hojas = [a for a in actividades if a.id not in parent_ids]
            
            print(f"Total actividades: {len(actividades)}")
            print(f"Actividades hojas (sin hijos): {len(hojas)}")
            
            # Recalcular cada hoja para que se propague hacia arriba
            for hoja in hojas:
                print(f" -> Recalculando jerarquía desde hoja: {hoja.titulo[:50]} (ID: {hoja.id})")
                await recalcular_porcentaje_jerarquico(db, hoja)
            
            # 2. Recalcular el progreso general del desarrollo
            print("\n -> Recalculando porcentaje general del desarrollo ACT-00049...")
            await recalcular_progreso_desarrollo(db, "ACT-00049")
            
            await db.commit()
            print("\n🎉 Recálculo de porcentajes y progreso finalizado con éxito!")
            print("=" * 60)
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error durante el recálculo: {e}")

if __name__ == "__main__":
    asyncio.run(recalcular_todo())
