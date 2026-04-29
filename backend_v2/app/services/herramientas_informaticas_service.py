from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from ..models.herramientas_informaticas.maestro import HerramientaInformatica

class HerramientasInformaticasService:
    @staticmethod
    async def get_all(db: AsyncSession) -> List[HerramientaInformatica]:
        query = select(HerramientaInformatica).order_by(HerramientaInformatica.id)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(id: int, db: AsyncSession) -> Optional[HerramientaInformatica]:
        query = select(HerramientaInformatica).where(HerramientaInformatica.id == id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(data: dict, db: AsyncSession) -> HerramientaInformatica:
        nueva_herramienta = HerramientaInformatica(**data)
        db.add(nueva_herramienta)
        await db.commit()
        await db.refresh(nueva_herramienta)
        return nueva_herramienta

    @staticmethod
    async def update(id: int, data: dict, db: AsyncSession) -> Optional[HerramientaInformatica]:
        # Filtrar campos que no existen en el modelo y excluir campos de sistema (sys_)
        allowed_fields = {c.name for c in HerramientaInformatica.__table__.columns}
        update_data = {
            k: v for k, v in data.items() 
            if k in allowed_fields and k != "id" and not k.startswith("sys_")
        }
        
        if not update_data:
            return await HerramientasInformaticasService.get_by_id(id, db)

        query = update(HerramientaInformatica).where(HerramientaInformatica.id == id).values(**update_data)
        await db.execute(query)
        await db.commit()
        return await HerramientasInformaticasService.get_by_id(id, db)

    @staticmethod
    async def delete(id: int, db: AsyncSession) -> bool:
        query = delete(HerramientaInformatica).where(HerramientaInformatica.id == id)
        result = await db.execute(query)
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def export_excel(db: AsyncSession):
        import polars as pl
        import io
        
        herramientas = await HerramientasInformaticasService.get_all(db)
        
        # Mapeo exacto solicitado por el usuario
        data = []
        for h in herramientas:
            data.append({
                "ID": h.id,
                "Nombre de la Herramienta": h.nombre,
                "Descripción": h.descripcion,
                "Funcionalidad Principal": h.funcionalidad,
                "Usuario Responsable": h.responsable,
                "Departamento": h.departamento,
                "Fecha de Creación": h.fecha_creacion,
                "Última Actualización": h.ultima_actualizacion,
                "Estado": h.estado,
                "Versión": h.version,
                "Ubicación del Archivo": h.ubicacion_archivo,
                "Fallas Comunes": h.fallas_comunes,
                "Fuentes": h.fuentes,
                "Observaciones": h.observaciones,
                "Ecosistema Perteneciente": h.ecosistema
            })
            
        df = pl.DataFrame(data)
        
        output = io.BytesIO()
        # Usamos fastexcel o xlsxwriter según disponibilidad
        df.write_excel(output)
        output.seek(0)
        return output
