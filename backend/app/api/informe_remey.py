"""
Endpoint para el informe Remedy usando el stored procedure informe_remey
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from ..database import get_db

router = APIRouter(prefix="/informe-remey", tags=["informe-remey"])


@router.get("/")
async def get_informe_remey(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Obtener informe Remedy usando el stored procedure informe_remey
    """
    try:
        # Ejecutar el stored procedure
        query = text("SELECT * FROM informe_remey()")
        result = db.execute(query)
        rows = result.fetchall()
        
        # Convertir a lista de diccionarios
        casos = []
        for row in rows:
            caso = {
                "desarrollo_id": row.desarrollo_id,
                "nombre_desarrollo": row.nombre_desarrollo,
                "proveedor": row.proveedor,
                "tipo_actividad": row.tipo_actividad,
                "fecha_inicio_actividad": row.fecha_inicio_actividad.isoformat() if row.fecha_inicio_actividad else None,
                "fecha_fin_actividad": row.fecha_fin_actividad.isoformat() if row.fecha_fin_actividad else None,
                "estado_actividad": row.estado_actividad,
                "tipo_actor": row.tipo_actor,
                "notas_actividad": row.notas_actividad,
                "nombre_etapa": row.nombre_etapa
            }
            casos.append(caso)
        
        # Calcular estadísticas
        total_casos = len(casos)
        status_distribution = {}
        provider_distribution = {}
        
        for caso in casos:
            # Distribución por estado
            estado = caso.get('estado_actividad', 'sin_estado')
            status_distribution[estado] = status_distribution.get(estado, 0) + 1
            
            # Distribución por proveedor
            proveedor = caso.get('proveedor', 'Sin proveedor')
            provider_distribution[proveedor] = provider_distribution.get(proveedor, 0) + 1
        
        return {
            "total_casos": total_casos,
            "casos": casos,
            "summary": {
                "status_distribution": status_distribution,
                "provider_distribution": provider_distribution
            },
            "mensaje": "Informe Remedy generado exitosamente"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando informe Remedy: {str(e)}")
