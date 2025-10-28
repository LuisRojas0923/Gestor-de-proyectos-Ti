"""
Endpoint simple para consulta de desarrollos con última actividad
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from ..database import get_db

router = APIRouter(prefix="/desarrollos", tags=["desarrollos"])


@router.get("/con-actividad")
async def get_desarrollos_con_actividad(
    limit: int = 10,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Obtener desarrollos con su última actividad de la bitácora
    """
    try:
        # Consulta SQL que funciona
        query = text("""
            SELECT 
                d.id as desarrollo_id,
                d.name as nombre_desarrollo,
                d.general_status as estado_general,
                d.provider as proveedor,
                dp.phase_name as fase_actual,
                ds.stage_name as etapa_actual,
                COALESCE(al.description, 'Sin actividad registrada') as ultima_actividad,
                COALESCE(al.date::text, 'N/A') as fecha_ultima_actividad,
                COALESCE(al.category, 'N/A') as categoria_actividad,
                COALESCE(al.user_id, 'N/A') as usuario_actividad
            FROM developments d
            LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
            LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
            LEFT JOIN activity_logs al ON d.id = al.development_id
            WHERE al.id IN (
                SELECT MAX(id) 
                FROM activity_logs 
                WHERE development_id = d.id
            ) OR al.id IS NULL
            ORDER BY d.id
            LIMIT :limit
        """)
        
        result = db.execute(query, {"limit": limit})
        rows = result.fetchall()
        
        # Convertir a lista de diccionarios
        desarrollos = []
        for row in rows:
            desarrollo = {
                "desarrollo_id": row.desarrollo_id,
                "nombre_desarrollo": row.nombre_desarrollo,
                "estado_general": row.estado_general,
                "proveedor": row.proveedor,
                "fase_actual": row.fase_actual,
                "etapa_actual": row.etapa_actual,
                "ultima_actividad": {
                    "descripcion": row.ultima_actividad,
                    "fecha": row.fecha_ultima_actividad,
                    "categoria": row.categoria_actividad,
                    "usuario": row.usuario_actividad
                }
            }
            desarrollos.append(desarrollo)
        
        return {
            "total": len(desarrollos),
            "desarrollos": desarrollos,
            "mensaje": "Consulta exitosa - Desarrollos con última actividad"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando consulta: {str(e)}")


@router.get("/todos")
async def get_todos_desarrollos(
    limit: int = 20,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Obtener todos los desarrollos (con o sin actividad)
    """
    try:
        query = text("""
            SELECT 
                d.id as desarrollo_id,
                d.name as nombre_desarrollo,
                d.general_status as estado_general,
                d.provider as proveedor,
                dp.phase_name as fase_actual,
                ds.stage_name as etapa_actual,
                d.created_at as fecha_creacion,
                d.updated_at as fecha_actualizacion
            FROM developments d
            LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
            LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
            ORDER BY d.id
            LIMIT :limit
        """)
        
        result = db.execute(query, {"limit": limit})
        rows = result.fetchall()
        
        desarrollos = []
        for row in rows:
            desarrollo = {
                "desarrollo_id": row.desarrollo_id,
                "nombre_desarrollo": row.nombre_desarrollo,
                "estado_general": row.estado_general,
                "proveedor": row.proveedor,
                "fase_actual": row.fase_actual,
                "etapa_actual": row.etapa_actual,
                "fecha_creacion": str(row.fecha_creacion) if row.fecha_creacion else None,
                "fecha_actualizacion": str(row.fecha_actualizacion) if row.fecha_actualizacion else None
            }
            desarrollos.append(desarrollo)
        
        return {
            "total": len(desarrollos),
            "desarrollos": desarrollos,
            "mensaje": "Todos los desarrollos obtenidos exitosamente"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando consulta: {str(e)}")
