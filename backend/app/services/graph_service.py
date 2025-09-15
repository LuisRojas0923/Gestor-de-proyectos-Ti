"""
Servicio para generación de gráficos y visualizaciones
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, text
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
from fastapi import Depends
from .. import models, schemas
from ..database import get_db


class GraphService:
    """Servicio para generación de datos para gráficos"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_developments_by_phase_chart(self) -> Dict[str, Any]:
        """Gráfico de desarrollos por fase"""
        try:
            phase_counts = self.db.query(
                models.DevelopmentPhase.phase_name,
                models.DevelopmentPhase.phase_color,
                func.count(models.Development.id).label('count')
            ).outerjoin(
                models.Development,
                models.Development.current_phase_id == models.DevelopmentPhase.id
            ).group_by(
                models.DevelopmentPhase.id,
                models.DevelopmentPhase.phase_name,
                models.DevelopmentPhase.phase_color
            ).order_by(models.DevelopmentPhase.sort_order).all()
            
            return {
                "chart_type": "pie",
                "title": "Desarrollos por Fase",
                "data": {
                    "labels": [phase.phase_name for phase in phase_counts],
                    "values": [phase.count for phase in phase_counts],
                    "colors": [phase.phase_color or "#3498db" for phase in phase_counts]
                },
                "total": sum(phase.count for phase in phase_counts)
            }
            
        except Exception as e:
            raise Exception(f"Error generando gráfico de fases: {str(e)}")
    
    def get_quality_metrics_trend_chart(self, days: int = 30) -> Dict[str, Any]:
        """Gráfico de tendencia de métricas de calidad"""
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=days)
            
            quality_metrics = self.db.query(models.DevelopmentKpiMetric).filter(
                models.DevelopmentKpiMetric.metric_type.in_([
                    "cumplimiento_fechas",
                    "calidad_primera_entrega",
                    "defectos_entrega"
                ]),
                models.DevelopmentKpiMetric.calculated_at >= datetime.combine(start_date, datetime.min.time()),
                models.DevelopmentKpiMetric.calculated_at <= datetime.combine(end_date, datetime.max.time())
            ).order_by(models.DevelopmentKpiMetric.calculated_at).all()
            
            # Organizar por fecha y tipo
            daily_metrics = {}
            for metric in quality_metrics:
                metric_date = metric.calculated_at.date()
                if metric_date not in daily_metrics:
                    daily_metrics[metric_date] = {}
                
                daily_metrics[metric_date][metric.metric_type] = float(metric.value or 0)
            
            return {
                "chart_type": "line",
                "title": "Tendencia de Métricas de Calidad",
                "data": daily_metrics,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": days
                }
            }
            
        except Exception as e:
            raise Exception(f"Error generando gráfico de tendencias: {str(e)}")


def get_graph_service(db: Session = Depends(get_db)) -> GraphService:
    """Dependency para obtener servicio de gráficos"""
    return GraphService(db)