"""
Servicio de KPIs - Backend V2
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.kpi import MetricaKpi, Funcionalidad
from decimal import Decimal


class ServicioKpi:
    """Lgica de negocio para el clculo y gestin de KPIs"""
    
    @staticmethod
    def obtener_metricas(db: Session, desarrollo_id: Optional[str] = None):
        consulta = db.query(MetricaKpi)
        if desarrollo_id:
            consulta = consulta.filter(MetricaKpi.desarrollo_id == desarrollo_id)
        return consulta.all()

    @staticmethod
    def obtener_resumen_global(db: Session):
        # Lgica para calcular cumplimiento global
        # Este es un ejemplo simplificado
        promedio = db.query(func.avg(MetricaKpi.valor)).scalar() or 0
        return {"cumplimiento_global": round(float(promedio), 2)}

    @staticmethod
    def registrar_funcionalidad(db: Session, desarrollo_id: str, nombre: str, complejidad: str):
        db_func = Funcionalidad(
            desarrollo_id=desarrollo_id,
            nombre_funcionalidad=nombre,
            nivel_complejidad=complejidad
        )
        db.add(db_func)
        db.commit()
        db.refresh(db_func)
        return db_func
