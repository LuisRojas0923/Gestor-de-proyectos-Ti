"""
Servicio de negocio para gestión de desarrollos
Implementa lógica de negocio completa según arquitectura
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
from fastapi import Depends
from .. import models, schemas, crud
from ..database import get_db
from .quality_service import QualityService
from .alert_service import AlertService


class DevelopmentService:
    """Servicio para gestión integral de desarrollos"""
    
    def __init__(self, db: Session):
        self.db = db
        self.quality_service = QualityService(db)
        self.alert_service = AlertService(db)
    
    def create_development_with_workflow(
        self, 
        development: schemas.DevelopmentCreateV2,
        created_by: str = "sistema"
    ) -> models.Development:
        """
        Crear desarrollo con flujo completo:
        1. Crear desarrollo
        2. Asignar fase inicial
        3. Generar controles de calidad automáticos
        4. Crear actividades próximas
        """
        try:
            # 1. Crear desarrollo básico
            db_development = models.Development(**development.dict(exclude={"current_phase_id", "current_stage_id"}))
            
            # 2. Asignar a fase y etapa inicial si no se especifica
            if not development.current_phase_id:
                # Buscar fase "En Ejecución"
                initial_phase = self.db.query(models.DevelopmentPhase).filter(
                    models.DevelopmentPhase.phase_name == "En Ejecución"
                ).first()
                
                if initial_phase:
                    db_development.current_phase_id = initial_phase.id
            else:
                db_development.current_phase_id = development.current_phase_id
            
            if not development.current_stage_id and db_development.current_phase_id:
                # Buscar primera etapa de la fase
                initial_stage = self.db.query(models.DevelopmentStage).filter(
                    models.DevelopmentStage.phase_id == db_development.current_phase_id
                ).order_by(models.DevelopmentStage.sort_order).first()
                
                if initial_stage:
                    db_development.current_stage_id = initial_stage.id
            else:
                db_development.current_stage_id = development.current_stage_id
            
            # Establecer progreso inicial
            db_development.stage_progress_percentage = Decimal("0.0")
            
            self.db.add(db_development)
            self.db.commit()
            self.db.refresh(db_development)
            
            # 3. Generar controles de calidad automáticos
            if db_development.current_stage_id:
                stage = self.db.query(models.DevelopmentStage).filter(
                    models.DevelopmentStage.id == db_development.current_stage_id
                ).first()
                
                if stage:
                    self.quality_service.generate_automatic_controls(
                        development_id=db_development.id,
                        stage_code=stage.stage_code
                    )
            
            # 4. Crear actividades próximas iniciales
            self._create_initial_activities(db_development, created_by)
            
            # 5. Registrar historial de estado
            self._record_status_history(
                development_id=db_development.id,
                status="Creado",
                progress_stage="Inicial",
                changed_by=created_by,
                notes="Desarrollo creado con flujo automático"
            )
            
            return db_development
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Error creando desarrollo con workflow: {str(e)}")
    
    def change_development_stage(
        self,
        development_id: str,
        new_stage_id: int,
        progress_percentage: Optional[Decimal] = None,
        notes: Optional[str] = None,
        changed_by: str = "sistema"
    ) -> models.Development:
        """
        Cambiar etapa del desarrollo con validaciones y flujo automático
        """
        try:
            # Obtener desarrollo
            development = self.db.query(models.Development).filter(
                models.Development.id == development_id
            ).first()
            
            if not development:
                raise ValueError(f"Desarrollo {development_id} no encontrado")
            
            # Obtener nueva etapa
            new_stage = self.db.query(models.DevelopmentStage).options(
                joinedload(models.DevelopmentStage.phase)
            ).filter(models.DevelopmentStage.id == new_stage_id).first()
            
            if not new_stage:
                raise ValueError(f"Etapa {new_stage_id} no encontrada")
            
            # Guardar estado anterior
            previous_stage_id = development.current_stage_id
            previous_phase_id = development.current_phase_id
            
            # Actualizar desarrollo
            development.current_stage_id = new_stage_id
            development.current_phase_id = new_stage.phase_id
            
            if progress_percentage is not None:
                development.stage_progress_percentage = progress_percentage
            else:
                development.stage_progress_percentage = Decimal("0.0")
            
            development.updated_at = datetime.now()
            
            # Registrar historial
            self._record_status_history(
                development_id=development_id,
                status=f"Etapa cambiada a {new_stage.stage_name}",
                progress_stage=new_stage.stage_name,
                changed_by=changed_by,
                notes=notes,
                previous_status=f"Etapa anterior: {previous_stage_id}"
            )
            
            # Generar controles de calidad para nueva etapa
            self.quality_service.generate_automatic_controls(
                development_id=development_id,
                stage_code=new_stage.stage_code
            )
            
            # Generar actividades automáticas para nueva etapa
            self._create_stage_activities(development, new_stage, changed_by)
            
            self.db.commit()
            self.db.refresh(development)
            
            return development
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Error cambiando etapa del desarrollo: {str(e)}")
    
    def update_development_progress(
        self,
        development_id: str,
        progress_percentage: Decimal,
        progress_notes: Optional[str] = None,
        updated_by: str = "sistema"
    ) -> models.Development:
        """
        Actualizar progreso del desarrollo en su etapa actual
        """
        try:
            development = self.db.query(models.Development).filter(
                models.Development.id == development_id
            ).first()
            
            if not development:
                raise ValueError(f"Desarrollo {development_id} no encontrado")
            
            # Validar progreso
            if progress_percentage < 0 or progress_percentage > 100:
                raise ValueError("El progreso debe estar entre 0 y 100")
            
            old_progress = development.stage_progress_percentage or Decimal("0.0")
            development.stage_progress_percentage = progress_percentage
            development.updated_at = datetime.now()
            
            # Registrar observación del progreso
            if progress_notes:
                self._record_observation(
                    development_id=development_id,
                    observation_type="seguimiento",
                    content=f"Progreso actualizado de {old_progress}% a {progress_percentage}%. {progress_notes}",
                    author=updated_by
                )
            
            # Si el progreso llega al 100%, crear actividad de revisión
            if progress_percentage == 100 and old_progress < 100:
                self.alert_service.create_manual_alert(
                    development_id=development_id,
                    title="Etapa Completada - Revisión Requerida",
                    description=f"La etapa actual ha sido completada al 100%. Se requiere revisión para avanzar a la siguiente etapa.",
                    priority="Alta",
                    responsible_party="equipo_interno",
                    due_date=date.today() + timedelta(days=2)
                )
            
            self.db.commit()
            self.db.refresh(development)
            
            return development
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Error actualizando progreso: {str(e)}")
    
    def get_development_with_full_context(self, development_id: str) -> Dict[str, Any]:
        """
        Obtener desarrollo con todo el contexto necesario
        """
        try:
            # Desarrollo principal con relaciones
            development = self.db.query(models.Development).options(
                joinedload(models.Development.current_phase),
                joinedload(models.Development.current_stage),
                joinedload(models.Development.dates),
                joinedload(models.Development.proposals),
                # joinedload(models.Development.installers),  # ELIMINADO - relación no existe
                joinedload(models.Development.providers),
                joinedload(models.Development.responsibles),
                joinedload(models.Development.quality_controls),
                joinedload(models.Development.upcoming_activities),
                joinedload(models.Development.status_history),
                joinedload(models.Development.observations)
            ).filter(models.Development.id == development_id).first()
            
            if not development:
                raise ValueError(f"Desarrollo {development_id} no encontrado")
            
            # Estado de calidad
            quality_status = self.quality_service.get_quality_status_by_development(development_id)
            
            # Actividades próximas activas
            upcoming_activities = [a for a in development.upcoming_activities if a.status != "Completada"]
            
            # Métricas del desarrollo
            kpi_metrics = self.db.query(models.DevelopmentKpiMetric).filter(
                models.DevelopmentKpiMetric.development_id == development_id
            ).order_by(models.DevelopmentKpiMetric.calculated_at.desc()).limit(10).all()
            
            # Funcionalidades
            functionalities = self.db.query(models.DevelopmentFunctionality).filter(
                models.DevelopmentFunctionality.development_id == development_id
            ).all()
            
            # Resultados de pruebas
            test_results = self.db.query(models.DevelopmentTestResult).filter(
                models.DevelopmentTestResult.development_id == development_id
            ).order_by(models.DevelopmentTestResult.test_date.desc()).all()
            
            return {
                "development": development,
                "quality_status": quality_status,
                "upcoming_activities": upcoming_activities,
                "recent_kpi_metrics": kpi_metrics,
                "functionalities": functionalities,
                "test_results": test_results,
                "summary": {
                    "current_phase": development.current_phase.phase_name if development.current_phase else None,
                    "current_stage": development.current_stage.stage_name if development.current_stage else None,
                    "progress_percentage": float(development.stage_progress_percentage or 0),
                    "total_quality_controls": len(development.quality_controls),
                    "pending_activities": len(upcoming_activities),
                    "total_functionalities": len(functionalities),
                    "last_updated": development.updated_at
                }
            }
            
        except Exception as e:
            raise Exception(f"Error obteniendo contexto completo: {str(e)}")
    
    def get_developments_dashboard(
        self,
        provider: Optional[str] = None,
        phase_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dashboard ejecutivo de desarrollos
        """
        try:
            # Query base
            query = self.db.query(models.Development).options(
                joinedload(models.Development.current_phase),
                joinedload(models.Development.current_stage)
            )
            
            # Aplicar filtros
            if provider:
                query = query.filter(models.Development.provider.ilike(f"%{provider}%"))
            
            if phase_id:
                query = query.filter(models.Development.current_phase_id == phase_id)
            
            if status:
                query = query.filter(models.Development.general_status == status)
            
            developments = query.all()
            
            # Estadísticas generales
            total_developments = len(developments)
            by_status = {}
            by_phase = {}
            by_provider = {}
            
            for dev in developments:
                # Por estado
                status = dev.general_status or "Sin estado"
                by_status[status] = by_status.get(status, 0) + 1
                
                # Por fase
                phase_name = dev.current_phase.phase_name if dev.current_phase else "Sin fase"
                by_phase[phase_name] = by_phase.get(phase_name, 0) + 1
                
                # Por proveedor
                provider_name = dev.provider or "Sin proveedor"
                by_provider[provider_name] = by_provider.get(provider_name, 0) + 1
            
            # Desarrollos con alertas
            today = date.today()
            developments_with_overdue = self.db.query(models.Development.id).join(
                models.DevelopmentUpcomingActivity
            ).filter(
                models.DevelopmentUpcomingActivity.due_date < today,
                models.DevelopmentUpcomingActivity.status != "Completada"
            ).distinct().count()
            
            # Desarrollos con controles rechazados
            developments_with_quality_issues = self.db.query(models.Development.id).join(
                models.DevelopmentQualityControl
            ).filter(
                models.DevelopmentQualityControl.validation_status == "Rechazado"
            ).distinct().count()
            
            # Progreso promedio por fase
            phase_progress = {}
            for phase_name in by_phase.keys():
                if phase_name != "Sin fase":
                    phase_devs = [d for d in developments if d.current_phase and d.current_phase.phase_name == phase_name]
                    if phase_devs:
                        avg_progress = sum(float(d.stage_progress_percentage or 0) for d in phase_devs) / len(phase_devs)
                        phase_progress[phase_name] = round(avg_progress, 2)
            
            return {
                "summary": {
                    "total_developments": total_developments,
                    "by_status": by_status,
                    "by_phase": by_phase,
                    "by_provider": by_provider,
                    "developments_with_overdue_activities": developments_with_overdue,
                    "developments_with_quality_issues": developments_with_quality_issues
                },
                "progress_analysis": {
                    "average_progress_by_phase": phase_progress,
                    "overall_progress": round(sum(float(d.stage_progress_percentage or 0) for d in developments) / total_developments, 2) if total_developments > 0 else 0
                },
                "recent_developments": sorted(developments, key=lambda x: x.created_at, reverse=True)[:10],
                "filters_applied": {
                    "provider": provider,
                    "phase_id": phase_id,
                    "status": status
                },
                "generated_at": datetime.now()
            }
            
        except Exception as e:
            raise Exception(f"Error generando dashboard de desarrollos: {str(e)}")
    
    def _create_initial_activities(self, development: models.Development, created_by: str):
        """
        Crear actividades iniciales para un nuevo desarrollo
        """
        try:
            # Actividad de kick-off
            kickoff_activity = models.DevelopmentUpcomingActivity(
                development_id=development.id,
                activity_type="reunion",
                title="Reunión de Kick-off",
                description="Reunión inicial para definir alcance y cronograma del desarrollo",
                due_date=date.today() + timedelta(days=3),
                responsible_party="equipo_interno",
                priority="Alta",
                status="Pendiente",
                created_by=created_by
            )
            
            # Actividad de definición de requerimientos
            requirements_activity = models.DevelopmentUpcomingActivity(
                development_id=development.id,
                activity_type="documentacion",
                title="Definición de Requerimientos",
                description="Documentar y validar los requerimientos técnicos y funcionales",
                due_date=date.today() + timedelta(days=7),
                responsible_party="usuario",
                priority="Alta",
                status="Pendiente",
                created_by=created_by
            )
            
            self.db.add_all([kickoff_activity, requirements_activity])
            
        except Exception as e:
            print(f"Warning: Error creando actividades iniciales: {e}")
    
    def _create_stage_activities(self, development: models.Development, stage: models.DevelopmentStage, created_by: str):
        """
        Crear actividades específicas para una etapa
        """
        try:
            stage_code = stage.stage_code.lower()
            
            # Actividades según la etapa
            if "definicion" in stage_code:
                activity = models.DevelopmentUpcomingActivity(
                    development_id=development.id,
                    activity_type="documentacion",
                    title=f"Completar Definición - {stage.stage_name}",
                    description=f"Completar todas las actividades de la etapa {stage.stage_name}",
                    due_date=date.today() + timedelta(days=stage.estimated_days or 7),
                    responsible_party="proveedor",
                    priority="Media",
                    status="Pendiente",
                    created_by=created_by
                )
            elif "desarrollo" in stage_code or "construccion" in stage_code:
                activity = models.DevelopmentUpcomingActivity(
                    development_id=development.id,
                    activity_type="entrega_proveedor",
                    title=f"Entrega de Desarrollo - {stage.stage_name}",
                    description=f"Entrega del desarrollo correspondiente a {stage.stage_name}",
                    due_date=date.today() + timedelta(days=stage.estimated_days or 14),
                    responsible_party="proveedor",
                    priority="Alta",
                    status="Pendiente",
                    created_by=created_by
                )
            elif "prueba" in stage_code or "testing" in stage_code:
                activity = models.DevelopmentUpcomingActivity(
                    development_id=development.id,
                    activity_type="pruebas",
                    title=f"Pruebas - {stage.stage_name}",
                    description=f"Ejecutar pruebas correspondientes a {stage.stage_name}",
                    due_date=date.today() + timedelta(days=stage.estimated_days or 5),
                    responsible_party="equipo_interno",
                    priority="Alta",
                    status="Pendiente",
                    created_by=created_by
                )
            elif "despliegue" in stage_code or "produccion" in stage_code:
                activity = models.DevelopmentUpcomingActivity(
                    development_id=development.id,
                    activity_type="despliegue",
                    title=f"Despliegue - {stage.stage_name}",
                    description=f"Desplegar a ambiente correspondiente a {stage.stage_name}",
                    due_date=date.today() + timedelta(days=stage.estimated_days or 3),
                    responsible_party="equipo_interno",
                    priority="Crítica",
                    status="Pendiente",
                    created_by=created_by
                )
            else:
                # Actividad genérica
                activity = models.DevelopmentUpcomingActivity(
                    development_id=development.id,
                    activity_type="revision",
                    title=f"Actividad - {stage.stage_name}",
                    description=f"Completar actividades de {stage.stage_name}",
                    due_date=date.today() + timedelta(days=stage.estimated_days or 7),
                    responsible_party="proveedor",
                    priority="Media",
                    status="Pendiente",
                    created_by=created_by
                )
            
            self.db.add(activity)
            
        except Exception as e:
            print(f"Warning: Error creando actividades de etapa: {e}")
    
    def _record_status_history(
        self,
        development_id: str,
        status: str,
        progress_stage: Optional[str] = None,
        changed_by: Optional[str] = None,
        notes: Optional[str] = None,
        previous_status: Optional[str] = None
    ):
        """
        Registrar cambio en historial de estados
        """
        try:
            history_entry = models.DevelopmentStatusHistory(
                development_id=development_id,
                status=status,
                progress_stage=progress_stage,
                changed_by=changed_by,
                previous_status=previous_status,
                change_date=datetime.now()
            )
            
            self.db.add(history_entry)
            
            # También agregar observación si hay notas
            if notes:
                self._record_observation(
                    development_id=development_id,
                    observation_type="estado",
                    content=f"Estado cambiado: {status}. {notes}",
                    author=changed_by
                )
                
        except Exception as e:
            print(f"Warning: Error registrando historial: {e}")
    
    def _record_observation(
        self,
        development_id: str,
        observation_type: str,
        content: str,
        author: Optional[str] = None,
        is_current: bool = True
    ):
        """
        Registrar observación del desarrollo
        """
        try:
            observation = models.DevelopmentObservation(
                development_id=development_id,
                observation_type=observation_type,
                content=content,
                author=author,
                is_current=is_current,
                observation_date=datetime.now()
            )
            
            self.db.add(observation)
            
        except Exception as e:
            print(f"Warning: Error registrando observación: {e}")


def get_development_service(db: Session = Depends(get_db)) -> DevelopmentService:
    """Dependency para obtener servicio de desarrollo"""
    return DevelopmentService(db)