"""
Router de Reportes Consolidados - Backend V2
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import obtener_db
from app.models.desarrollo.desarrollo import Desarrollo
from app.models.desarrollo.actividad import Actividad

router = APIRouter()

@router.get("/maestro")
async def obtener_maestro_actividades(
    db: AsyncSession = Depends(obtener_db)
):
    """
    Retorna la lista maestra de proyectos (Desarrollos) con sus KPIs principales
    para el Dashboard de Nivel 1.
    """
    try:
        query = select(Desarrollo).order_by(Desarrollo.id)
        result = await db.execute(query)
        desarrollos = result.scalars().all()
        
        reporte = []
        for dev in desarrollos:
            reporte.append({
                "id": dev.id,
                "responsable": dev.responsable,
                "area": dev.modulo,
                "tipo_actividad": dev.tipo,
                "actividad": dev.nombre,
                "fecha_inicio": dev.fecha_inicio,
                "fecha_fin": dev.fecha_estimada_fin,
                "objetivo": dev.descripcion,
                "porcentaje_cumplimiento": float(dev.porcentaje_progreso),
                "estado": dev.estado_general,
                "area_desarrollo": dev.area_desarrollo,
                "analista": dev.analista
            })
            
        return reporte
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar reporte maestro: {str(e)}")

@router.get("/detalle/{desarrollo_id}")
async def obtener_detalle_consolidado(
    desarrollo_id: str,
    db: AsyncSession = Depends(obtener_db)
):
    """
    Retorna una vista plana que combina el contexto del proyecto con cada una de sus tareas.
    Ideal para el análisis detallado de Nivel 2.
    """
    try:
        # Cargamos el desarrollo con sus actividades
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id).options(
            selectinload(Desarrollo.actividades)
        )
        result = await db.execute(query)
        dev = result.scalar_one_or_none()
        
        if not dev:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
            
        reporte_plano = []
        
        # Si no hay actividades, al menos devolvemos una fila con los datos del proyecto
        if not dev.actividades:
             reporte_plano.append(mapear_fila_consolidada(dev, None))
        else:
            for act in dev.actividades:
                reporte_plano.append(mapear_fila_consolidada(dev, act))
                
        return reporte_plano
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar detalle consolidado: {str(e)}")

def mapear_fila_consolidada(dev: Desarrollo, act: Actividad = None) -> Dict[str, Any]:
    """Mapea los datos de desarrollo y actividad a una estructura plana"""
    
    # Cálculo de tiempo en días
    tiempo_d = None
    if dev.fecha_inicio and dev.fecha_estimada_fin:
        tiempo_d = (dev.fecha_estimada_fin - dev.fecha_inicio).days

    return {
        "id": dev.id,
        "responsable": dev.responsable,
        "area": dev.modulo,
        "tipo_actividad": dev.tipo,
        "actividad": dev.nombre,
        "inicio": dev.fecha_inicio,
        "fin": dev.fecha_estimada_fin,
        "tiempo_d": tiempo_d,
        "porcentaje_cumplimiento": float(dev.porcentaje_progreso),
        "estado": dev.estado_general,
        "objetivo": dev.descripcion,
        "tarea": act.titulo if act else "Sin tareas registradas",
        "estado_tarea": act.estado if act else None,
        "seguimiento": act.seguimiento if act else None,
        "compromiso": act.compromiso if act else None,
        "archivo_url": act.archivo_url if act else None,
        "area_desarrollo": dev.area_desarrollo,
        "analista": dev.analista
    }
