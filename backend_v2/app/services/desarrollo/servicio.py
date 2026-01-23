"""
Servicio de Desarrollos - Backend V2
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.desarrollo.desarrollo import Desarrollo, DesarrolloCrear, DesarrolloActualizar


class ServicioDesarrollo:
    """Lgica de negocio para la gestin de desarrollos"""
    
    @staticmethod
    def obtener_desarrollos(db: Session, skip: int = 0, limit: int = 100):
        return db.query(Desarrollo).offset(skip).limit(limit).all()

    @staticmethod
    def obtener_por_id(db: Session, desarrollo_id: str):
        return db.query(Desarrollo).filter(Desarrollo.id == desarrollo_id).first()

    @staticmethod
    def crear(db: Session, desarrollo: DesarrolloCrear):
        db_desarrollo = Desarrollo(**desarrollo.dict())
        db.add(db_desarrollo)
        db.commit()
        db.refresh(db_desarrollo)
        return db_desarrollo

    @staticmethod
    def actualizar(db: Session, desarrollo_id: str, datos: DesarrolloActualizar):
        db_desarrollo = ServicioDesarrollo.obtener_por_id(db, desarrollo_id)
        if not db_desarrollo:
            return None
        
        for clave, valor in datos.dict(exclude_unset=True).items():
            setattr(db_desarrollo, clave, valor)
        
        db.commit()
        db.refresh(db_desarrollo)
        return db_desarrollo
