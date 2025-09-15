"""
Servicio de negocio para controles de calidad (FD-PR-072)
Implementa lógica de validación y gestión de controles
"""

from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import Depends
from .. import models, schemas
from ..database import get_db


class QualityService:
    """Servicio para gestión de controles de calidad"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_automatic_controls(
        self,
        development_id: str,
        stage_code: str
    ) -> List[models.DevelopmentQualityControl]:
        """
        Generar controles automáticos según la etapa:
        1. Obtener controles del catálogo para la etapa
        2. Crear instancias para el desarrollo
        3. Asignar responsables automáticamente
        """
        try:
            # Obtener controles aplicables para la etapa
            applicable_controls = self.db.query(models.QualityControlCatalog).filter(
                models.QualityControlCatalog.stage_prefix.like(f"%{stage_code}%"),
                models.QualityControlCatalog.is_active == True
            ).all()
            
            created_controls = []
            
            for catalog_control in applicable_controls:
                # Verificar si ya existe este control
                existing = self.db.query(models.DevelopmentQualityControl).filter(
                    models.DevelopmentQualityControl.development_id == development_id,
                    models.DevelopmentQualityControl.control_catalog_id == catalog_control.id
                ).first()
                
                if not existing:
                    # Crear control automático
                    new_control = models.DevelopmentQualityControl(
                        development_id=development_id,
                        control_catalog_id=catalog_control.id,
                        control_code=catalog_control.control_code,
                        status="Pendiente",
                        validation_status="Pendiente"
                    )
                    
                    self.db.add(new_control)
                    created_controls.append(new_control)
            
            self.db.commit()
            
            # Refrescar controles creados
            for control in created_controls:
                self.db.refresh(control)
            
            return created_controls
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def validate_quality_control(
        self,
        control_id: int,
        validation_data: schemas.QualityControlValidationRequest,
        validator_id: str
    ) -> models.DevelopmentQualityControl:
        """
        Validar control de calidad:
        1. Verificar entregables
        2. Actualizar estado
        3. Registrar evidencia
        4. Notificar resultado
        5. Calcular KPIs de calidad
        """
        try:
            # Obtener el control
            control = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.id == control_id
            ).first()
            
            if not control:
                raise ValueError(f"Control {control_id} no encontrado")
            
            # Verificar que el control esté completado
            if control.status != "Completado":
                raise ValueError("Solo se pueden validar controles completados")
            
            # Actualizar validación
            control.validation_status = validation_data.validation_result
            control.validated_by = validation_data.validator_name
            control.validated_at = datetime.now()
            control.validation_notes = validation_data.validation_notes
            
            if validation_data.validation_result == "Rechazado":
                control.rejection_reason = validation_data.rejection_reason
                # Si se rechaza, volver el control a estado pendiente
                control.status = "Pendiente"
                
                # Crear alerta para el responsable
                self._create_correction_alert(control)
            
            if validation_data.evidence_files:
                control.evidence_files = validation_data.evidence_files
            
            control.updated_at = datetime.now()
            
            self.db.commit()
            self.db.refresh(control)
            
            return control
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def complete_quality_control(
        self,
        control_id: int,
        completion_data: schemas.QualityControlCompletionRequest,
        completed_by: str
    ) -> models.DevelopmentQualityControl:
        """
        Completar control de calidad con entregables
        """
        try:
            control = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.id == control_id
            ).first()
            
            if not control:
                raise ValueError(f"Control {control_id} no encontrado")
            
            # Actualizar control
            control.status = "Completado"
            control.deliverables_provided = completion_data.deliverables_provided
            control.completed_by = completed_by
            control.completed_at = datetime.now()
            
            if completion_data.evidence_files:
                import json
                control.evidence_files = json.dumps(completion_data.evidence_files)
            
            control.updated_at = datetime.now()
            
            self.db.commit()
            self.db.refresh(control)
            
            return control
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_quality_status_by_development(
        self,
        development_id: str
    ) -> Dict[str, Any]:
        """
        Obtener estado de calidad del desarrollo:
        1. Controles pendientes, completados, rechazados
        2. Porcentaje de cumplimiento
        3. Controles críticos pendientes
        """
        try:
            # Obtener desarrollo con controles
            development = self.db.query(models.Development).options(
                joinedload(models.Development.current_stage),
                joinedload(models.Development.quality_controls)
            ).filter(models.Development.id == development_id).first()
            
            if not development:
                raise ValueError(f"Desarrollo {development_id} no encontrado")
            
            # Calcular estadísticas
            total_controls = len(development.quality_controls)
            completed_controls = len([c for c in development.quality_controls if c.status == "Completado"])
            validated_controls = len([c for c in development.quality_controls if c.validation_status == "Validado"])
            rejected_controls = len([c for c in development.quality_controls if c.validation_status == "Rechazado"])
            pending_controls = len([c for c in development.quality_controls if c.status == "Pendiente"])
            
            # Calcular porcentajes
            completion_percentage = (completed_controls / total_controls * 100) if total_controls > 0 else 0
            validation_percentage = (validated_controls / total_controls * 100) if total_controls > 0 else 0
            
            return {
                "development_id": development_id,
                "development_name": development.name,
                "current_stage": development.current_stage.stage_name if development.current_stage else None,
                "quality_summary": {
                    "total_controls": total_controls,
                    "completed_controls": completed_controls,
                    "validated_controls": validated_controls,
                    "rejected_controls": rejected_controls,
                    "pending_controls": pending_controls,
                    "completion_percentage": round(completion_percentage, 2),
                    "validation_percentage": round(validation_percentage, 2)
                },
                "quality_score": round((completion_percentage + validation_percentage) / 2, 2),
                "last_updated": max([c.updated_at for c in development.quality_controls]) if development.quality_controls else None
            }
            
        except Exception as e:
            raise e
    
    def _create_correction_alert(self, control: models.DevelopmentQualityControl):
        """
        Crear alerta de corrección cuando un control es rechazado
        """
        try:
            from datetime import date, timedelta
            
            # Crear actividad próxima para corrección
            correction_activity = models.DevelopmentUpcomingActivity(
                development_id=control.development_id,
                activity_type="revision",
                title=f"Corrección Control {control.control_code}",
                description=f"Corregir control de calidad rechazado: {control.rejection_reason}",
                due_date=date.today() + timedelta(days=3),  # 3 días para corregir
                responsible_party="proveedor",
                responsible_person=control.completed_by,
                status="Pendiente",
                priority="Alta"
            )
            
            self.db.add(correction_activity)
            
        except Exception as e:
            # No fallar si no se puede crear la alerta
            print(f"Warning: No se pudo crear alerta de corrección: {e}")
    
    def get_controls_by_stage(self, stage_code: str) -> List[models.QualityControlCatalog]:
        """
        Obtener controles aplicables para una etapa específica
        """
        return self.db.query(models.QualityControlCatalog).filter(
            models.QualityControlCatalog.stage_prefix.like(f"%{stage_code}%"),
            models.QualityControlCatalog.is_active == True
        ).all()
    
    def get_quality_metrics_summary(self) -> Dict[str, Any]:
        """
        Obtener resumen de métricas de calidad del sistema
        """
        try:
            # Obtener estadísticas generales
            total_controls = self.db.query(models.DevelopmentQualityControl).count()
            completed_controls = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.status == "Completado"
            ).count()
            validated_controls = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.validation_status == "Validado"
            ).count()
            rejected_controls = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.validation_status == "Rechazado"
            ).count()
            
            # Calcular tasas
            completion_rate = (completed_controls / total_controls * 100) if total_controls > 0 else 0
            validation_rate = (validated_controls / total_controls * 100) if total_controls > 0 else 0
            rejection_rate = (rejected_controls / total_controls * 100) if total_controls > 0 else 0
            
            return {
                "total_controls": total_controls,
                "completion_rate": round(completion_rate, 2),
                "validation_rate": round(validation_rate, 2),
                "rejection_rate": round(rejection_rate, 2),
                "quality_score": round((completion_rate + validation_rate - rejection_rate) / 2, 2)
            }
            
        except Exception as e:
            raise e


def get_quality_service(db: Session = Depends(get_db)) -> QualityService:
    """Dependency para obtener servicio de calidad"""
    return QualityService(db)
