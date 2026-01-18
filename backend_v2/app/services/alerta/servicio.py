"""
Servicio de Alertas - Backend V2
"""
from datetime import datetime, date
from typing import List
from sqlalchemy.orm import Session
from app.models.alerta import ActividadProxima, RegistroActividad


class ServicioAlerta:
    """Lgica para la gestin de alertas y actividades"""
    
    @staticmethod
    def obtener_proximas_vencidas(db: Session):
        hoy = date.today()
        return db.query(ActividadProxima).filter(
            ActividadProxima.fecha_vencimiento <= hoy,
            ActividadProxima.estado == "Pendiente"
        ).all()

    @staticmethod
    def crear_alerta(db: Session, desarrollo_id: str, titulo: str, fecha: date, responsable: str):
        nueva_alerta = ActividadProxima(
            desarrollo_id=desarrollo_id,
            titulo=titulo,
            fecha_vencimiento=fecha,
            parte_responsable=responsable
        )
        db.add(nueva_alerta)
        db.commit()
        db.refresh(nueva_alerta)
        return nueva_alerta

    @staticmethod
    def registrar_log(db: Session, tipo: str, usuario: str, desarrollo_id: Optional[str] = None):
        log = RegistroActividad(
            tipo_actividad=tipo,
            creado_por=usuario,
            desarrollo_id=desarrollo_id,
            fecha_inicio=datetime.utcnow()
        )
        db.add(log)
        db.commit()
