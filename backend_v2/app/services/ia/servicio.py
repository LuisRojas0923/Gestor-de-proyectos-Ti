"""
Servicio de IA - Backend V2
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.ia import HistorialAnalisisIA, RecomendacionIA


class ServicioIA:
    """Integracin con servicios de IA y gestin de recomendaciones"""
    
    @staticmethod
    def realizar_analisis(db: Session, desarrollo_id: str, consulta: str, respuesta_ia: str, modelo: str):
        nuevo_analisis = HistorialAnalisisIA(
            desarrollo_id=desarrollo_id,
            texto_consulta=consulta,
            respuesta_ia=respuesta_ia,
            modelo_ia=modelo
        )
        db.add(nuevo_analisis)
        db.commit()
        db.refresh(nuevo_analisis)
        return nuevo_analisis

    @staticmethod
    def obtener_recomendaciones(db: Session, desarrollo_id: Optional[str] = None):
        consulta = db.query(RecomendacionIA)
        if desarrollo_id:
            consulta = consulta.filter(RecomendacionIA.desarrollo_id == desarrollo_id)
        return consulta.all()
