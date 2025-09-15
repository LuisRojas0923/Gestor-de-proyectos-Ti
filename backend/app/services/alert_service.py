"""
Servicio de negocio para alertas y monitoreo proactivo
Genera alertas automáticas basadas en reglas de negocio
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import Depends
from .. import models, schemas
from ..database import get_db


class AlertService:
    """Servicio para gestión de alertas y monitoreo"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_automatic_alerts(self) -> List[Dict[str, Any]]:
        """
        Generar alertas automáticas del sistema basadas en reglas de negocio
        """
        alerts = []
        
        try:
            # 1. Alertas por fechas vencidas
            alerts.extend(self._generate_overdue_alerts())
            
            # 2. Alertas por controles de calidad rechazados
            alerts.extend(self._generate_quality_alerts())
            
            # 3. Alertas por desarrollos sin actividad reciente
            alerts.extend(self._generate_inactive_development_alerts())
            
            # 4. Alertas por próximas fechas críticas
            alerts.extend(self._generate_upcoming_critical_alerts())
            
            # 5. Alertas por KPIs fuera de rango
            alerts.extend(self._generate_kpi_alerts())
            
            return alerts
            
        except Exception as e:
            print(f"Error generando alertas automáticas: {e}")
            return []
    
    def _generate_overdue_alerts(self) -> List[Dict[str, Any]]:
        """
        Generar alertas por actividades vencidas
        """
        alerts = []
        today = date.today()
        
        try:
            # Obtener actividades vencidas
            overdue_activities = self.db.query(models.DevelopmentUpcomingActivity).options(
                joinedload(models.DevelopmentUpcomingActivity.development)
            ).filter(
                models.DevelopmentUpcomingActivity.due_date < today,
                models.DevelopmentUpcomingActivity.status.in_(["Pendiente", "En Progreso"]),
                models.DevelopmentUpcomingActivity.alert_sent == False
            ).all()
            
            for activity in overdue_activities:
                days_overdue = (today - activity.due_date).days
                
                alert = {
                    "type": "overdue_activity",
                    "severity": "high" if days_overdue > 7 else "medium",
                    "title": f"Actividad Vencida: {activity.title}",
                    "description": f"La actividad '{activity.title}' está vencida por {days_overdue} días",
                    "development_id": activity.development_id,
                    "development_name": activity.development.name if activity.development else None,
                    "activity_id": activity.id,
                    "due_date": activity.due_date,
                    "days_overdue": days_overdue,
                    "responsible_party": activity.responsible_party,
                    "responsible_person": activity.responsible_person,
                    "priority": activity.priority,
                    "created_at": datetime.now()
                }
                
                alerts.append(alert)
                
                # Marcar alerta como enviada
                activity.alert_sent = True
            
            if overdue_activities:
                self.db.commit()
            
        except Exception as e:
            print(f"Error generando alertas de vencimiento: {e}")
        
        return alerts
    
    def _generate_quality_alerts(self) -> List[Dict[str, Any]]:
        """
        Generar alertas por controles de calidad rechazados
        """
        alerts = []
        
        try:
            # Obtener controles rechazados recientes
            rejected_controls = self.db.query(models.DevelopmentQualityControl).options(
                joinedload(models.DevelopmentQualityControl.development),
                joinedload(models.DevelopmentQualityControl.catalog)
            ).filter(
                models.DevelopmentQualityControl.validation_status == "Rechazado",
                models.DevelopmentQualityControl.validated_at >= datetime.now() - timedelta(days=7)
            ).all()
            
            for control in rejected_controls:
                alert = {
                    "type": "quality_control_rejected",
                    "severity": "high",
                    "title": f"Control de Calidad Rechazado: {control.control_code}",
                    "description": f"El control '{control.control_code}' fue rechazado. Motivo: {control.rejection_reason}",
                    "development_id": control.development_id,
                    "development_name": control.development.name if control.development else None,
                    "control_id": control.id,
                    "control_code": control.control_code,
                    "rejection_reason": control.rejection_reason,
                    "validated_by": control.validated_by,
                    "validated_at": control.validated_at,
                    "created_at": datetime.now()
                }
                
                alerts.append(alert)
            
        except Exception as e:
            print(f"Error generando alertas de calidad: {e}")
        
        return alerts
    
    def _generate_inactive_development_alerts(self) -> List[Dict[str, Any]]:
        """
        Generar alertas por desarrollos sin actividad reciente
        """
        alerts = []
        
        try:
            # Buscar desarrollos sin actividad en los últimos 30 días
            cutoff_date = datetime.now() - timedelta(days=30)
            
            # Desarrollos activos (no finalizados)
            active_developments = self.db.query(models.Development).filter(
                models.Development.general_status.in_(["Pendiente", "En curso"])
            ).all()
            
            for development in active_developments:
                # Verificar última actividad
                last_activity = self.db.query(models.DevelopmentUpcomingActivity).filter(
                    models.DevelopmentUpcomingActivity.development_id == development.id,
                    models.DevelopmentUpcomingActivity.updated_at >= cutoff_date
                ).first()
                
                last_quality_control = self.db.query(models.DevelopmentQualityControl).filter(
                    models.DevelopmentQualityControl.development_id == development.id,
                    models.DevelopmentQualityControl.updated_at >= cutoff_date
                ).first()
                
                # Si no hay actividad reciente, generar alerta
                if not last_activity and not last_quality_control:
                    alert = {
                        "type": "inactive_development",
                        "severity": "medium",
                        "title": f"Desarrollo Inactivo: {development.name}",
                        "description": f"El desarrollo '{development.name}' no tiene actividad registrada en los últimos 30 días",
                        "development_id": development.id,
                        "development_name": development.name,
                        "current_status": development.general_status,
                        "provider": development.provider,
                        "created_at": datetime.now()
                    }
                    
                    alerts.append(alert)
            
        except Exception as e:
            print(f"Error generando alertas de inactividad: {e}")
        
        return alerts
    
    def _generate_upcoming_critical_alerts(self) -> List[Dict[str, Any]]:
        """
        Generar alertas por actividades críticas próximas
        """
        alerts = []
        
        try:
            # Actividades críticas en los próximos 3 días
            upcoming_date = date.today() + timedelta(days=3)
            
            critical_activities = self.db.query(models.DevelopmentUpcomingActivity).options(
                joinedload(models.DevelopmentUpcomingActivity.development)
            ).filter(
                models.DevelopmentUpcomingActivity.priority == "Crítica",
                models.DevelopmentUpcomingActivity.due_date <= upcoming_date,
                models.DevelopmentUpcomingActivity.due_date >= date.today(),
                models.DevelopmentUpcomingActivity.status.in_(["Pendiente", "En Progreso"])
            ).all()
            
            for activity in critical_activities:
                days_until_due = (activity.due_date - date.today()).days
                
                alert = {
                    "type": "upcoming_critical_activity",
                    "severity": "high",
                    "title": f"Actividad Crítica Próxima: {activity.title}",
                    "description": f"La actividad crítica '{activity.title}' vence en {days_until_due} días",
                    "development_id": activity.development_id,
                    "development_name": activity.development.name if activity.development else None,
                    "activity_id": activity.id,
                    "due_date": activity.due_date,
                    "days_until_due": days_until_due,
                    "responsible_party": activity.responsible_party,
                    "responsible_person": activity.responsible_person,
                    "created_at": datetime.now()
                }
                
                alerts.append(alert)
            
        except Exception as e:
            print(f"Error generando alertas de actividades críticas: {e}")
        
        return alerts
    
    def _generate_kpi_alerts(self) -> List[Dict[str, Any]]:
        """
        Generar alertas por KPIs fuera de rango objetivo
        """
        alerts = []
        
        try:
            # Obtener métricas recientes (últimos 7 días)
            recent_date = datetime.now() - timedelta(days=7)
            
            poor_metrics = self.db.query(models.DevelopmentKpiMetric).filter(
                models.DevelopmentKpiMetric.calculated_at >= recent_date,
                models.DevelopmentKpiMetric.target_value.isnot(None),
                models.DevelopmentKpiMetric.value < models.DevelopmentKpiMetric.target_value
            ).all()
            
            # Agrupar por tipo de métrica para evitar spam
            metrics_by_type = {}
            for metric in poor_metrics:
                if metric.metric_type not in metrics_by_type:
                    metrics_by_type[metric.metric_type] = []
                metrics_by_type[metric.metric_type].append(metric)
            
            for metric_type, metrics in metrics_by_type.items():
                avg_value = sum(float(m.value) for m in metrics) / len(metrics)
                avg_target = sum(float(m.target_value) for m in metrics) / len(metrics)
                
                alert = {
                    "type": "kpi_below_target",
                    "severity": "medium",
                    "title": f"KPI Bajo Objetivo: {metric_type.replace('_', ' ').title()}",
                    "description": f"El KPI '{metric_type}' está en {avg_value:.1f}%, por debajo del objetivo de {avg_target:.1f}%",
                    "metric_type": metric_type,
                    "current_value": round(avg_value, 2),
                    "target_value": round(avg_target, 2),
                    "gap_percentage": round(avg_target - avg_value, 2),
                    "affected_developments": len(set(m.development_id for m in metrics)),
                    "created_at": datetime.now()
                }
                
                alerts.append(alert)
            
        except Exception as e:
            print(f"Error generando alertas de KPIs: {e}")
        
        return alerts
    
    def create_manual_alert(
        self,
        development_id: str,
        title: str,
        description: str,
        priority: str = "Media",
        responsible_party: str = "equipo_interno",
        due_date: Optional[date] = None
    ) -> models.DevelopmentUpcomingActivity:
        """
        Crear alerta manual/actividad
        """
        try:
            if not due_date:
                due_date = date.today() + timedelta(days=7)
            
            activity = models.DevelopmentUpcomingActivity(
                development_id=development_id,
                activity_type="revision",
                title=title,
                description=description,
                due_date=due_date,
                responsible_party=responsible_party,
                priority=priority,
                status="Pendiente",
                created_by="sistema_alertas"
            )
            
            self.db.add(activity)
            self.db.commit()
            self.db.refresh(activity)
            
            return activity
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Error creando alerta manual: {str(e)}")
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """
        Obtener estadísticas de alertas del sistema
        """
        try:
            today = date.today()
            
            # Actividades por estado
            total_activities = self.db.query(models.DevelopmentUpcomingActivity).count()
            
            pending_activities = self.db.query(models.DevelopmentUpcomingActivity).filter(
                models.DevelopmentUpcomingActivity.status == "Pendiente"
            ).count()
            
            overdue_activities = self.db.query(models.DevelopmentUpcomingActivity).filter(
                models.DevelopmentUpcomingActivity.due_date < today,
                models.DevelopmentUpcomingActivity.status.in_(["Pendiente", "En Progreso"])
            ).count()
            
            critical_activities = self.db.query(models.DevelopmentUpcomingActivity).filter(
                models.DevelopmentUpcomingActivity.priority == "Crítica",
                models.DevelopmentUpcomingActivity.status.in_(["Pendiente", "En Progreso"])
            ).count()
            
            # Controles de calidad
            rejected_controls = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.validation_status == "Rechazado"
            ).count()
            
            pending_controls = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.status == "Pendiente"
            ).count()
            
            return {
                "total_activities": total_activities,
                "pending_activities": pending_activities,
                "overdue_activities": overdue_activities,
                "critical_activities": critical_activities,
                "rejected_quality_controls": rejected_controls,
                "pending_quality_controls": pending_controls,
                "alert_coverage": {
                    "developments_with_activities": self.db.query(
                        models.DevelopmentUpcomingActivity.development_id
                    ).distinct().count(),
                    "developments_with_quality_controls": self.db.query(
                        models.DevelopmentQualityControl.development_id
                    ).distinct().count()
                },
                "generated_at": datetime.now()
            }
            
        except Exception as e:
            raise Exception(f"Error obteniendo estadísticas de alertas: {str(e)}")
    
    def cleanup_old_alerts(self, days_old: int = 90):
        """
        Limpiar alertas antiguas completadas
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days_old)
            
            # Eliminar actividades completadas muy antiguas
            old_activities = self.db.query(models.DevelopmentUpcomingActivity).filter(
                models.DevelopmentUpcomingActivity.status == "Completada",
                models.DevelopmentUpcomingActivity.completed_at < cutoff_date
            )
            
            count = old_activities.count()
            old_activities.delete()
            
            self.db.commit()
            
            return {"cleaned_activities": count}
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Error limpiando alertas antiguas: {str(e)}")


def get_alert_service(db: Session = Depends(get_db)) -> AlertService:
    """Dependency para obtener servicio de alertas"""
    return AlertService(db)