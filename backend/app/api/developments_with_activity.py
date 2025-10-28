"""
Endpoint para obtener desarrollos con su última actividad
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from ..database import get_db

router = APIRouter(prefix="/developments", tags=["developments"])


@router.get("/with-last-activity")
async def get_developments_with_last_activity(
    limit: int = 100,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Obtener desarrollos con su última actividad de la bitácora
    """
    try:
        # Consulta SQL optimizada
        query = text("""
            SELECT 
                d.id as desarrollo_id,
                d.name as nombre_desarrollo,
                d.general_status as estado_general,
                d.provider as proveedor,
                dp.phase_name as fase_actual,
                ds.stage_name as etapa_actual,
                ds.stage_code as codigo_etapa,
                -- Última actividad de development_activity_log
                COALESCE(dal.activity_type, 'Sin actividad específica') as tipo_actividad_especifica,
                COALESCE(dal.start_date::text, 'N/A') as fecha_inicio_actividad,
                COALESCE(dal.status, 'N/A') as estado_actividad_especifica,
                COALESCE(dal.notes, 'Sin notas') as notas_actividad_especifica,
                COALESCE(dal.created_at::text, 'N/A') as fecha_creacion_actividad_especifica,
                -- Última actividad de activity_logs (bitácora general)
                COALESCE(al.description, 'Sin actividad en bitácora') as ultima_actividad_bitacora,
                COALESCE(al.date::text, 'N/A') as fecha_ultima_actividad_bitacora,
                COALESCE(al.category, 'N/A') as categoria_actividad_bitacora,
                COALESCE(al.user_id, 'N/A') as usuario_ultima_actividad,
                COALESCE(al.created_at::text, 'N/A') as fecha_creacion_bitacora
            FROM developments d
            LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
            LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
            -- Última actividad específica
            LEFT JOIN LATERAL (
                SELECT 
                    dal.activity_type,
                    dal.start_date,
                    dal.status,
                    dal.notes,
                    dal.created_at
                FROM development_activity_log dal
                WHERE dal.development_id = d.id
                ORDER BY dal.created_at DESC
                LIMIT 1
            ) dal ON true
            -- Última actividad de bitácora
            LEFT JOIN LATERAL (
                SELECT 
                    al.description,
                    al.date,
                    al.category,
                    al.user_id,
                    al.created_at
                FROM activity_logs al
                WHERE al.development_id = d.id
                ORDER BY al.created_at DESC
                LIMIT 1
            ) al ON true
            ORDER BY d.id
            LIMIT :limit
        """)
        
        result = db.execute(query, {"limit": limit})
        rows = result.fetchall()
        
        # Convertir a lista de diccionarios
        developments = []
        for row in rows:
            development = {
                "desarrollo_id": row.desarrollo_id,
                "nombre_desarrollo": row.nombre_desarrollo,
                "estado_general": row.estado_general,
                "proveedor": row.proveedor,
                "fase_actual": row.fase_actual,
                "etapa_actual": row.etapa_actual,
                "codigo_etapa": row.codigo_etapa,
                "actividad_especifica": {
                    "tipo": row.tipo_actividad_especifica,
                    "fecha_inicio": row.fecha_inicio_actividad,
                    "estado": row.estado_actividad_especifica,
                    "notas": row.notas_actividad_especifica,
                    "fecha_creacion": row.fecha_creacion_actividad_especifica
                },
                "ultima_actividad_bitacora": {
                    "descripcion": row.ultima_actividad_bitacora,
                    "fecha": row.fecha_ultima_actividad_bitacora,
                    "categoria": row.categoria_actividad_bitacora,
                    "usuario": row.usuario_ultima_actividad,
                    "fecha_creacion": row.fecha_creacion_bitacora
                }
            }
            developments.append(development)
        
        return {
            "total": len(developments),
            "developments": developments
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando consulta: {str(e)}")


@router.get("/with-last-activity-simple")
async def get_developments_with_last_activity_simple(
    limit: int = 100,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Versión simplificada: solo desarrollos con última actividad de bitácora
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
                al.description as ultima_actividad,
                al.date as fecha_ultima_actividad,
                al.category as categoria_actividad,
                al.user_id as usuario_actividad
            FROM developments d
            LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
            LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
            LEFT JOIN activity_logs al ON d.id = al.development_id
            WHERE al.id IN (
                SELECT MAX(id) 
                FROM activity_logs 
                WHERE development_id = d.id
            )
            ORDER BY d.id
            LIMIT :limit
        """)
        
        result = db.execute(query, {"limit": limit})
        rows = result.fetchall()
        
        developments = []
        for row in rows:
            development = {
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
            developments.append(development)
        
        return {
            "total": len(developments),
            "developments": developments
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando consulta: {str(e)}")
