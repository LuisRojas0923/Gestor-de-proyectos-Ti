"""
Servicio de negocio para KPIs y métricas de rendimiento
Implementación completa con datos reales de la base de datos
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, text
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
from fastapi import Depends
from .. import models, schemas, crud
from ..database import get_db


class KPIService:
    """Servicio para gestión de KPIs y métricas"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _get_provider_filter(self, provider: str):
        """
        Obtener filtro de proveedor homologado para usar en queries
        """
        from sqlalchemy import case, func
        
        if not provider:
            return None
            
        return case(
            # Homologaciones específicas
            (func.lower(models.Development.provider).like('%ingesoft%'), 'Ingesoft'),
            (func.lower(models.Development.provider).like('%oracle%'), 'ORACLE'),
            (func.lower(models.Development.provider).like('%itc%'), 'ITC'),
            (func.lower(models.Development.provider).like('%interno%'), 'TI Interno'),
            (func.lower(models.Development.provider).like('%ti interno%'), 'TI Interno'),
            (func.lower(models.Development.provider).like('%coomeva%'), 'Coomeva'),
            (func.lower(models.Development.provider).like('%softtek%'), 'Softtek'),
            (func.lower(models.Development.provider).like('%accenture%'), 'Accenture'),
            (func.lower(models.Development.provider).like('%microsoft%'), 'Microsoft'),
            (func.lower(models.Development.provider).like('%ibm%'), 'IBM'),
            (func.lower(models.Development.provider).like('%sap%'), 'SAP'),
            # Casos especiales
            (models.Development.provider.is_(None), 'Sin Proveedor'),
            (models.Development.provider == '', 'Sin Proveedor'),
            # Mantener original
            else_=models.Development.provider
        ) == provider
    
    def calculate_global_compliance(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular cumplimiento global usando la función de PostgreSQL.
        """
        try:
            # Establecer período por defecto si no se proporciona
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)  # 3 meses
            
            result = self.db.execute(text("""
                SELECT 
                    total_entregas, 
                    entregas_a_tiempo, 
                    entregas_tardias, 
                    porcentaje_cumplimiento,
                    provider_filter,
                    period_start,
                    period_end,
                    calculated_at
                FROM fn_kpi_cumplimiento_fechas_global(:provider, :start, :end)
            """), {
                "provider": provider,
                "start": period_start, 
                "end": period_end
            }).fetchone()

            if result:
                # Calcular período anterior para comparación (mantener lógica de tendencia)
                prev_period_start = period_start - (period_end - period_start)
                prev_period_end = period_start
                
                prev_result = self.db.execute(text("""
                    SELECT porcentaje_cumplimiento 
                    FROM fn_kpi_cumplimiento_fechas_global(:provider, :start, :end)
                """), {
                    "provider": provider,
                    "start": prev_period_start, 
                    "end": prev_period_end
                }).fetchone()
                
                prev_compliance = prev_result.porcentaje_cumplimiento if prev_result else 0.0
                change_percentage = result.porcentaje_cumplimiento - prev_compliance

                # Determine if current value meets target (e.g., 85%)
                target_value = Decimal("85.0")
                meets_target = result.porcentaje_cumplimiento >= target_value

                return {
                    "current_value": round(float(result.porcentaje_cumplimiento), 2),
                    "previous_period_value": round(float(prev_compliance), 2),
                    "change_percentage": round(float(change_percentage), 2),
                    "trend": "improving" if change_percentage > 0 else "declining" if change_percentage < 0 else "stable",
                    "total_deliveries": int(result.total_entregas or 0),
                    "on_time_deliveries": int(result.entregas_a_tiempo or 0),
                    "delayed_deliveries": int(result.entregas_tardias or 0),
                    "target_value": float(target_value),
                    "meets_target": meets_target,
                    "provider_filter": result.provider_filter,
                    "period": {"start": result.period_start, "end": result.period_end}
                }
            else:
                return {
                    "current_value": 0.0,
                    "previous_period_value": 0.0,
                    "change_percentage": 0.0,
                    "trend": "stable",
                    "total_deliveries": 0,
                    "on_time_deliveries": 0,
                    "delayed_deliveries": 0,
                    "target_value": 85.0,
                    "meets_target": False,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No hay datos de cumplimiento en el período especificado"
                }
        except Exception as e:
            print(f"Error calculando cumplimiento global con SP: {e}")
            raise Exception(f"Error calculando cumplimiento global: {str(e)}")

    def calculate_analysis_compliance(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular cumplimiento de fechas de análisis (fase 2) usando la función de PostgreSQL.
        """
        try:
            # Establecer período por defecto si no se proporciona
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)  # 3 meses
            
            result = self.db.execute(text("""
                SELECT 
                    total_entregas, 
                    entregas_a_tiempo, 
                    entregas_tardias, 
                    porcentaje_cumplimiento,
                    provider_filter,
                    period_start,
                    period_end,
                    calculated_at
                FROM fn_kpi_cumplimiento_fechas_analisis(:provider, :start, :end)
            """), {
                "provider": provider,
                "start": period_start, 
                "end": period_end
            }).fetchone()

            if result:
                # Calcular período anterior para comparación
                prev_period_start = period_start - (period_end - period_start)
                prev_period_end = period_start
                
                prev_result = self.db.execute(text("""
                    SELECT porcentaje_cumplimiento 
                    FROM fn_kpi_cumplimiento_fechas_analisis(:provider, :start, :end)
                """), {
                    "provider": provider,
                    "start": prev_period_start, 
                    "end": prev_period_end
                }).fetchone()
                
                prev_compliance = prev_result.porcentaje_cumplimiento if prev_result else 0.0
                change_percentage = result.porcentaje_cumplimiento - prev_compliance

                # Determine if current value meets target (e.g., 85%)
                target_value = Decimal("85.0")
                meets_target = result.porcentaje_cumplimiento >= target_value

                return {
                    "current_value": round(float(result.porcentaje_cumplimiento), 2),
                    "previous_period_value": round(float(prev_compliance), 2),
                    "change_percentage": round(float(change_percentage), 2),
                    "trend": "improving" if change_percentage > 0 else "declining" if change_percentage < 0 else "stable",
                    "total_deliveries": int(result.total_entregas or 0),
                    "on_time_deliveries": int(result.entregas_a_tiempo or 0),
                    "delayed_deliveries": int(result.entregas_tardias or 0),
                    "target_value": float(target_value),
                    "meets_target": meets_target,
                    "provider_filter": result.provider_filter,
                    "period": {"start": result.period_start, "end": result.period_end}
                }
            else:
                return {
                    "current_value": 0.0,
                    "previous_period_value": 0.0,
                    "change_percentage": 0.0,
                    "trend": "stable",
                    "total_deliveries": 0,
                    "on_time_deliveries": 0,
                    "delayed_deliveries": 0,
                    "target_value": 85.0,
                    "meets_target": False,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No hay datos de cumplimiento de análisis en el período especificado"
                }
        except Exception as e:
            print(f"Error calculando cumplimiento de análisis con SP: {e}")
            raise Exception(f"Error calculando cumplimiento de análisis: {str(e)}")

    def calculate_proposal_compliance(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular cumplimiento de fechas de propuesta (fase 3) usando la función de PostgreSQL.
        """
        try:
            # Establecer período por defecto si no se proporciona
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)  # 3 meses
            
            result = self.db.execute(text("""
                SELECT 
                    total_entregas, 
                    entregas_a_tiempo, 
                    entregas_tardias, 
                    porcentaje_cumplimiento,
                    provider_filter,
                    period_start,
                    period_end,
                    calculated_at
                FROM fn_kpi_cumplimiento_fechas_propuesta(:provider, :start, :end)
            """), {
                "provider": provider,
                "start": period_start, 
                "end": period_end
            }).fetchone()

            if result:
                # Calcular período anterior para comparación
                prev_period_start = period_start - (period_end - period_start)
                prev_period_end = period_start
                
                prev_result = self.db.execute(text("""
                    SELECT porcentaje_cumplimiento 
                    FROM fn_kpi_cumplimiento_fechas_propuesta(:provider, :start, :end)
                """), {
                    "provider": provider,
                    "start": prev_period_start, 
                    "end": prev_period_end
                }).fetchone()
                
                prev_compliance = prev_result.porcentaje_cumplimiento if prev_result else 0.0
                change_percentage = result.porcentaje_cumplimiento - prev_compliance

                # Determine if current value meets target (e.g., 85%)
                target_value = Decimal("85.0")
                meets_target = result.porcentaje_cumplimiento >= target_value

                return {
                    "current_value": round(float(result.porcentaje_cumplimiento), 2),
                    "previous_period_value": round(float(prev_compliance), 2),
                    "change_percentage": round(float(change_percentage), 2),
                    "trend": "improving" if change_percentage > 0 else "declining" if change_percentage < 0 else "stable",
                    "total_deliveries": int(result.total_entregas or 0),
                    "on_time_deliveries": int(result.entregas_a_tiempo or 0),
                    "delayed_deliveries": int(result.entregas_tardias or 0),
                    "target_value": float(target_value),
                    "meets_target": meets_target,
                    "provider_filter": result.provider_filter,
                    "period": {"start": result.period_start, "end": result.period_end}
                }
            else:
                return {
                    "current_value": 0.0,
                    "previous_period_value": 0.0,
                    "change_percentage": 0.0,
                    "trend": "stable",
                    "total_deliveries": 0,
                    "on_time_deliveries": 0,
                    "delayed_deliveries": 0,
                    "target_value": 85.0,
                    "meets_target": False,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No hay datos de cumplimiento de propuesta en el período especificado"
                }
        except Exception as e:
            print(f"Error calculando cumplimiento de propuesta con SP: {e}")
            raise Exception(f"Error calculando cumplimiento de propuesta: {str(e)}")

    def calculate_global_complete_compliance(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular cumplimiento global completo combinando análisis, propuesta y desarrollo.
        """
        try:
            # Establecer período por defecto si no se proporciona
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)  # 3 meses
            
            result = self.db.execute(text("""
                SELECT 
                    total_entregas, 
                    entregas_a_tiempo, 
                    entregas_tardias, 
                    porcentaje_cumplimiento,
                    provider_filter,
                    period_start,
                    period_end,
                    calculated_at
                FROM fn_kpi_cumplimiento_fechas_global_completo(:provider, :start, :end)
            """), {
                "provider": provider,
                "start": period_start, 
                "end": period_end
            }).fetchone()

            if result:
                # Calcular período anterior para comparación
                prev_period_start = period_start - (period_end - period_start)
                prev_period_end = period_start
                
                prev_result = self.db.execute(text("""
                    SELECT porcentaje_cumplimiento 
                    FROM fn_kpi_cumplimiento_fechas_global_completo(:provider, :start, :end)
                """), {
                    "provider": provider,
                    "start": prev_period_start, 
                    "end": prev_period_end
                }).fetchone()
                
                prev_compliance = prev_result.porcentaje_cumplimiento if prev_result else 0.0
                change_percentage = float(result.porcentaje_cumplimiento or 0.0) - float(prev_compliance or 0.0)

                # Determine if current value meets target (e.g., 85%)
                target_value = Decimal("85.0")
                meets_target = (result.porcentaje_cumplimiento or 0.0) >= target_value

                return {
                    "current_value": round(float(result.porcentaje_cumplimiento or 0.0), 2),
                    "previous_period_value": round(float(prev_compliance or 0.0), 2),
                    "change_percentage": round(change_percentage, 2),
                    "trend": "improving" if change_percentage > 0 else "declining" if change_percentage < 0 else "stable",
                    "total_deliveries": int(result.total_entregas or 0),
                    "on_time_deliveries": int(result.entregas_a_tiempo or 0),
                    "delayed_deliveries": int(result.entregas_tardias or 0),
                    "target_value": float(target_value),
                    "meets_target": meets_target,
                    "provider_filter": result.provider_filter,
                    "period": {"start": result.period_start, "end": result.period_end}
                }
            else:
                return {
                    "current_value": 0.0,
                    "previous_period_value": 0.0,
                    "change_percentage": 0.0,
                    "trend": "stable",
                    "total_deliveries": 0,
                    "on_time_deliveries": 0,
                    "delayed_deliveries": 0,
                    "target_value": 85.0,
                    "meets_target": False,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No hay datos de cumplimiento global completo en el período especificado"
                }
        except Exception as e:
            print(f"Error calculando cumplimiento global completo con SP: {e}")
            raise Exception(f"Error calculando cumplimiento global completo: {str(e)}")
    
    def _save_kpi_metric(
        self,
        development_id: Optional[str],
        metric_type: str,
        provider: Optional[str],
        value: Decimal,
        target_value: Optional[Decimal] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ):
        """
        Guardar métrica KPI en la base de datos
        """
        try:
            # Evitar guardar si no hay development_id (modelo requiere NOT NULL en la columna)
            if development_id is None:
                return
            # Verificar si ya existe una métrica similar reciente
            existing_metric = self.db.query(models.DevelopmentKpiMetric).filter(
                models.DevelopmentKpiMetric.metric_type == metric_type,
                models.DevelopmentKpiMetric.provider == provider,
                models.DevelopmentKpiMetric.period_start == period_start,
                models.DevelopmentKpiMetric.period_end == period_end,
                models.DevelopmentKpiMetric.calculated_at >= datetime.now() - timedelta(hours=1)
            ).first()
            
            if not existing_metric:
                # Crear nueva métrica
                new_metric = models.DevelopmentKpiMetric(
                    development_id=development_id,
                    metric_type=metric_type,
                    provider=provider,
                    period_start=period_start,
                    period_end=period_end,
                    value=value,
                    target_value=target_value,
                    calculated_by="system",
                    calculated_at=datetime.now()
                )
                
                self.db.add(new_metric)
                self.db.commit()
                
        except Exception as e:
            # Hacer rollback para no dejar la sesión en estado fallido
            try:
                self.db.rollback()
            except Exception:
                pass
            # No fallar si no se puede guardar la métrica
            print(f"Warning: No se pudo guardar métrica KPI: {e}")
    
    def calculate_first_time_quality(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular calidad en primera entrega:
        1. Porcentaje de desarrollos aprobados sin rechazos
        2. Número promedio de iteraciones hasta aprobación
        3. Análisis por tipo de rechazo
        """
        try:
            # Establecer período por defecto
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)
            
            # Obtener controles de calidad del período
            query = self.db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.completed_at >= datetime.combine(period_start, datetime.min.time()),
                models.DevelopmentQualityControl.completed_at <= datetime.combine(period_end, datetime.max.time()),
                models.DevelopmentQualityControl.status == "Completado"
            )
            
            # Filtrar por proveedor si se especifica
            if provider:
                query = query.join(models.Development).filter(
                    self._get_provider_filter(provider)
                )
            
            completed_controls = query.all()
            
            if not completed_controls:
                return {
                    "current_value": 0.0,
                    "target_value": 85.0,
                    "total_controls": 0,
                    "first_time_approvals": 0,
                    "rejected_controls": 0,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No hay controles completados en el período"
                }
            
            # Calcular controles aprobados en primera revisión
            first_time_approved = len([c for c in completed_controls if c.validation_status == "Validado"])
            total_controls = len(completed_controls)
            rejected_controls = len([c for c in completed_controls if c.validation_status == "Rechazado"])
            
            # Calcular porcentaje de calidad en primera entrega
            first_time_quality_percentage = (first_time_approved / total_controls * 100) if total_controls > 0 else 0
            
            # Análisis de rechazos
            rejection_reasons = {}
            for control in completed_controls:
                if control.validation_status == "Rechazado" and control.rejection_reason:
                    reason = control.rejection_reason
                    rejection_reasons[reason] = rejection_reasons.get(reason, 0) + 1
            
            # Guardar métrica
            self._save_kpi_metric(
                development_id=None,
                metric_type="calidad_primera_entrega",
                provider=provider,
                value=Decimal(str(first_time_quality_percentage)),
                target_value=Decimal("85.0"),
                period_start=period_start,
                period_end=period_end
            )
            
            return {
                "current_value": round(first_time_quality_percentage, 2),
                "target_value": 85.0,
                "meets_target": first_time_quality_percentage >= 85.0,
                "total_controls": total_controls,
                "first_time_approvals": first_time_approved,
                "rejected_controls": rejected_controls,
                "rejection_rate": round((rejected_controls / total_controls * 100), 2) if total_controls > 0 else 0,
                "top_rejection_reasons": dict(sorted(rejection_reasons.items(), key=lambda x: x[1], reverse=True)[:5]),
                "provider_filter": provider,
                "period": {"start": period_start, "end": period_end}
            }
            
        except Exception as e:
            raise Exception(f"Error calculando calidad primera entrega: {str(e)}")
    
    def calculate_failure_response_time(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular tiempo de respuesta a fallos REAL usando incidents:
        1. Promedio de horas de respuesta (Incident.response_time_hours)
        2. Distribución por severidad
        3. Cambio vs período anterior
        """
        try:
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)

            # Seleccionar incidentes del periodo
            incidents_query = self.db.query(models.Incident).filter(
                models.Incident.report_date >= datetime.combine(period_start, datetime.min.time()),
                models.Incident.report_date <= datetime.combine(period_end, datetime.max.time()),
                models.Incident.response_time_hours.isnot(None)
            )
            if provider:
                incidents_query = incidents_query.join(models.Development).filter(
                    self._get_provider_filter(provider)
                )

            incidents = incidents_query.all()

            def average(values):
                return (sum(values) / len(values)) if values else 0.0

            current_avg = float(average([float(i.response_time_hours) for i in incidents]))

            # Distribución por severidad
            severities = {"critical": 0.0, "high": 0.0, "medium": 0.0, "low": 0.0}
            sev_groups: Dict[str, list] = {k: [] for k in severities.keys()}
            for i in incidents:
                sev = (i.severity_level or "").lower()
                if sev in sev_groups:
                    sev_groups[sev].append(float(i.response_time_hours))
            for k, lst in sev_groups.items():
                severities[k] = float(round(average(lst), 2))

            # Período anterior
            prev_start = period_start - (period_end - period_start)
            prev_end = period_start
            prev_q = self.db.query(models.Incident).filter(
                models.Incident.report_date >= datetime.combine(prev_start, datetime.min.time()),
                models.Incident.report_date < datetime.combine(prev_end, datetime.max.time()),
                models.Incident.response_time_hours.isnot(None)
            )
            if provider:
                prev_q = prev_q.join(models.Development).filter(
                    self._get_provider_filter(provider)
                )
            prev_incidents = prev_q.all()
            prev_avg = float(average([float(i.response_time_hours) for i in prev_incidents]))

            change_value = round(abs(current_avg - prev_avg), 2)
            change_type = "decrease" if current_avg <= prev_avg else "increase"

            # SLA cumplimiento (porcentaje <= 4h)
            sla_target_hours = 4.0
            sla_ok = [1 for i in incidents if float(i.response_time_hours) <= sla_target_hours]
            sla_compliance = round((sum(sla_ok) / len(incidents) * 100) if incidents else 0.0, 2)

            # Guardar métrica
            try:
                any_dev = incidents[0].development_id if incidents else None
                self._save_kpi_metric(
                    development_id=any_dev,
                    metric_type="tiempo_respuesta",
                    provider=provider,
                    value=Decimal(str(current_avg)),
                    target_value=Decimal(str(sla_target_hours)),
                    period_start=period_start,
                    period_end=period_end
                )
            except Exception:
                pass
            
            return {
                "current_value": round(current_avg, 2),
                "target_value": sla_target_hours,
                "meets_target": current_avg <= sla_target_hours,
                "change": {"value": change_value, "type": change_type},
                "by_severity": severities,
                "sla_compliance": sla_compliance,
                "total_incidents": len(incidents),
                "provider_filter": provider,
                "period": {"start": period_start, "end": period_end}
            }
            
        except Exception as e:
            raise Exception(f"Error calculando tiempo respuesta: {str(e)}")
    
    def calculate_defects_per_delivery(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular defectos por entrega basado en instaladores:
        1. Instaladores entregados: Actividades completadas en "Despliegue (Pruebas)"
        2. Instaladores devueltos: Instaladores que aparecen en "Validación de Correcciones"
        3. Fórmula: Instaladores Devueltos / Instaladores Entregados
        """
        try:
            # Establecer período por defecto
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)
            
            # Obtener IDs de las etapas relevantes
            despliegue_pruebas_stage = self.db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.stage_name == "Despliegue (Pruebas)"
            ).first()
            
            validacion_correcciones_stage = self.db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.stage_name == "Validación de Correcciones"
            ).first()
            
            if not despliegue_pruebas_stage or not validacion_correcciones_stage:
                return {
                    "current_value": 0.0,
                    "target_value": 0.1,  # Target de máximo 10% de instaladores devueltos
                    "total_installers_delivered": 0,
                    "total_installers_returned": 0,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No se encontraron las etapas necesarias para el cálculo"
                }
            
            # 1. Obtener instaladores entregados (Despliegue Pruebas completados)
            delivered_query = self.db.query(models.DevelopmentActivityLog).filter(
                models.DevelopmentActivityLog.stage_id == despliegue_pruebas_stage.id,
                models.DevelopmentActivityLog.status.in_(["completed", "completada"]),  # Aceptar ambos idiomas
                models.DevelopmentActivityLog.created_at >= period_start,
                models.DevelopmentActivityLog.created_at <= period_end,
                models.DevelopmentActivityLog.dynamic_payload.isnot(None)
            )
            
            # 2. Obtener instaladores devueltos (Validación de Correcciones)
            returned_query = self.db.query(models.DevelopmentActivityLog).filter(
                models.DevelopmentActivityLog.stage_id == validacion_correcciones_stage.id,
                models.DevelopmentActivityLog.created_at >= period_start,
                models.DevelopmentActivityLog.created_at <= period_end,
                models.DevelopmentActivityLog.dynamic_payload.isnot(None)
            )
            
            # Filtrar por proveedor si se especifica
            if provider:
                delivered_query = delivered_query.join(models.Development).filter(
                    models.Development.provider == provider
                )
                returned_query = returned_query.join(models.Development).filter(
                    models.Development.provider == provider
                )
            
            delivered_activities = delivered_query.all()
            returned_activities = returned_query.all()
            
            # 3. Extraer números de instaladores únicos
            delivered_installers = set()
            for activity in delivered_activities:
                payload = activity.dynamic_payload
                if payload and "installer_number" in payload:
                    delivered_installers.add(payload["installer_number"])
            
            returned_installers = set()
            for activity in returned_activities:
                payload = activity.dynamic_payload
                if payload and "installer_number" in payload:
                    returned_installers.add(payload["installer_number"])
            
            # 4. Calcular métricas
            total_delivered = len(delivered_installers)
            total_returned = len(returned_installers)
            
            # 5. Calcular tasa de defectos (instaladores devueltos / instaladores entregados)
            defects_per_delivery = (total_returned / total_delivered) if total_delivered > 0 else 0
            
            # 6. Análisis detallado de instaladores devueltos
            returned_details = []
            for activity in returned_activities:
                payload = activity.dynamic_payload
                if payload and "installer_number" in payload:
                    returned_details.append({
                        "installer_number": payload["installer_number"],
                        "failure_description": payload.get("failure_description", "Sin descripción"),
                        "return_date": activity.created_at.isoformat(),
                        "development_id": activity.development_id
                    })
            
            # 7. Guardar métrica
            self._save_kpi_metric(
                development_id=None,
                metric_type="defectos_entrega",
                provider=provider,
                value=Decimal(str(defects_per_delivery)),
                target_value=Decimal("0.1"),  # Target de máximo 10% de instaladores devueltos
                period_start=period_start,
                period_end=period_end
            )
            
            return {
                "current_value": round(defects_per_delivery, 3),
                "target_value": 0.1,
                "meets_target": defects_per_delivery <= 0.1,
                "total_installers_delivered": total_delivered,
                "total_installers_returned": total_returned,
                "delivered_installers": list(delivered_installers),
                "returned_installers": list(returned_installers),
                "returned_details": returned_details,
                "success_rate": round((1 - defects_per_delivery) * 100, 2) if defects_per_delivery <= 1 else 0,
                "provider_filter": provider,
                "period": {"start": period_start, "end": period_end}
            }
            
        except Exception as e:
            raise Exception(f"Error calculando defectos por entrega: {str(e)}")
    
    def calculate_post_production_rework(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular retrabajo post-producción:
        1. Porcentaje de desarrollos que requieren correcciones después de producción
        2. Tiempo promedio de corrección
        3. Impacto en disponibilidad
        """
        try:
            # Establecer período por defecto si no se proporciona
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)  # 3 meses
            
            # Query base para actividades de entrega (producción)
            query = self.db.query(models.DevelopmentActivityLog).filter(
                models.DevelopmentActivityLog.activity_type == 'ENTREGA',
                models.DevelopmentActivityLog.start_date >= period_start,
                models.DevelopmentActivityLog.start_date <= period_end
            )
            
            # Filtrar por proveedor si se especifica usando JOIN
            if provider:
                query = query.join(models.Development).filter(
                    self._get_provider_filter(provider)
                )
            
            # Obtener todas las entregas (producciones)
            productions = query.all()
            total_productions = len(productions)
            
            if total_productions == 0:
                return {
                    "current_value": 0.0,
                    "target_value": 5.0,
                    "meets_target": True,
                    "change": {"value": 0.0, "type": "decrease"},
                    "total_productions": 0,
                    "rework_required": 0,
                    "average_correction_time_hours": 0.0,
                    "availability_impact_minutes": 0,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No hay producciones en el período especificado"
                }
            
            # Buscar actividades de seguimiento (retrabajo) para las mismas entregas
            rework_count = 0
            total_correction_time = 0
            total_availability_impact = 0
            
            for production in productions:
                # Buscar actividades de seguimiento relacionadas con esta entrega
                rework_activities = self.db.query(models.DevelopmentActivityLog).filter(
                    models.DevelopmentActivityLog.development_id == production.development_id,
                    models.DevelopmentActivityLog.activity_type == 'SEGUIMIENTO',
                    models.DevelopmentActivityLog.start_date >= production.start_date,
                    models.DevelopmentActivityLog.start_date <= period_end
                ).all()
                
                if rework_activities:
                    rework_count += 1
                    
                    # Calcular tiempo de corrección (diferencia entre entrega y seguimiento)
                    for rework in rework_activities:
                        if rework.start_date and production.start_date:
                            correction_days = (rework.start_date - production.start_date).days
                            total_correction_time += correction_days * 24  # Convertir a horas
                            
                            # Impacto en disponibilidad (minutos de downtime)
                            # Asumir 30 minutos de impacto por cada día de corrección
                            total_availability_impact += correction_days * 30
            
            # Calcular métricas
            rework_percentage = (rework_count / total_productions * 100) if total_productions > 0 else 0
            average_correction_time = (total_correction_time / rework_count) if rework_count > 0 else 0
            
            # Calcular período anterior para comparación
            prev_period_start = period_start - (period_end - period_start)
            prev_period_end = period_start
            
            prev_query = self.db.query(models.DevelopmentActivityLog).filter(
                models.DevelopmentActivityLog.activity_type == 'ENTREGA',
                models.DevelopmentActivityLog.start_date >= prev_period_start,
                models.DevelopmentActivityLog.start_date < prev_period_end
            )
            
            if provider:
                prev_query = prev_query.join(models.Development).filter(
                    self._get_provider_filter(provider)
                )
            
            prev_productions = prev_query.all()
            prev_rework_count = 0
            
            for prev_production in prev_productions:
                prev_rework = self.db.query(models.DevelopmentActivityLog).filter(
                    models.DevelopmentActivityLog.development_id == prev_production.development_id,
                    models.DevelopmentActivityLog.activity_type == 'SEGUIMIENTO',
                    models.DevelopmentActivityLog.start_date >= prev_production.start_date,
                    models.DevelopmentActivityLog.start_date < prev_period_end
                ).first()
                
                if prev_rework:
                    prev_rework_count += 1
            
            prev_rework_percentage = (prev_rework_count / len(prev_productions) * 100) if prev_productions else 0
            change_value = rework_percentage - prev_rework_percentage
            change_type = 'decrease' if change_value < 0 else 'increase' if change_value > 0 else 'stable'
            
            # Guardar métrica en base de datos
            self._save_kpi_metric(
                development_id=productions[0].development_id if productions else None,
                metric_type="retrabajo_produccion",
                provider=provider,
                value=Decimal(str(rework_percentage)),
                target_value=Decimal("5.0"),  # Target de máximo 5%
                period_start=period_start,
                period_end=period_end
            )
            
            return {
                "current_value": round(rework_percentage, 2),
                "target_value": 5.0,
                "meets_target": rework_percentage <= 5.0,
                "change": {"value": round(abs(change_value), 2), "type": change_type},
                "total_productions": total_productions,
                "rework_required": rework_count,
                "average_correction_time_hours": round(average_correction_time, 1),
                "availability_impact_minutes": total_availability_impact,
                "provider_filter": provider,
                "period": {"start": period_start, "end": period_end}
            }
            
        except Exception as e:
            raise Exception(f"Error calculando retrabajo post-producción: {str(e)}")
    
    def calculate_development_compliance_days(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular desviación promedio de días entre fecha real y planificada de entrega.
        Valor positivo indica retraso promedio; negativo indica entrega anticipada.
        También calcula el cambio respecto al período anterior.
        """
        try:
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)

            # Fechas de entrega en período actual
            query = self.db.query(models.DevelopmentDate).filter(
                models.DevelopmentDate.date_type == 'entrega',
                models.DevelopmentDate.actual_date.isnot(None),
                models.DevelopmentDate.planned_date.isnot(None),
                models.DevelopmentDate.actual_date >= period_start,
                models.DevelopmentDate.actual_date <= period_end
            )
            if provider:
                query = query.join(models.Development).filter(
                    self._get_provider_filter(provider)
                )
            deliveries = query.all()

            def average_deviation(items):
                if not items:
                    return 0.0
                diffs = [(d.actual_date - d.planned_date).days for d in items]
                return sum(diffs) / len(diffs)

            current_avg = average_deviation(deliveries)

            # Período anterior
            prev_period_start = period_start - (period_end - period_start)
            prev_period_end = period_start
            prev_query = self.db.query(models.DevelopmentDate).filter(
                models.DevelopmentDate.date_type == 'entrega',
                models.DevelopmentDate.actual_date.isnot(None),
                models.DevelopmentDate.planned_date.isnot(None),
                models.DevelopmentDate.actual_date >= prev_period_start,
                models.DevelopmentDate.actual_date < prev_period_end
            )
            if provider:
                prev_query = prev_query.join(models.Development).filter(
                    self._get_provider_filter(provider)
                )
            prev_deliveries = prev_query.all()
            prev_avg = average_deviation(prev_deliveries)

            change_value = round(abs(current_avg - prev_avg), 2)
            # Para este indicador, una disminución es positiva (menos días de desviación)
            change_type = 'decrease' if current_avg < prev_avg else 'increase' if current_avg > prev_avg else 'increase'

            # Guardar métrica como referencia (opcional, no crítica)
            try:
                first_dev = deliveries[0].development_id if deliveries else None
                self._save_kpi_metric(
                    development_id=first_dev,
                    metric_type="desviacion_fechas_dias",
                    provider=provider,
                    value=Decimal(str(current_avg)),
                    target_value=Decimal("0.0"),
                    period_start=period_start,
                    period_end=period_end
                )
            except Exception:
                pass

            return {
                "current_value": round(current_avg, 2),
                "change": {"value": change_value, "type": change_type},
                "total_deliveries": len(deliveries),
                "provider_filter": provider,
                "period": {"start": period_start, "end": period_end}
            }

        except Exception as e:
            raise Exception(f"Error calculando desviación de días: {str(e)}")

    def calculate_installer_resolution_time(
        self,
        provider: Optional[str] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calcular tiempo de resolución de instaladores devueltos:
        1. Buscar devoluciones en "Validación de Correcciones"
        2. Buscar siguiente entrega en "Despliegue (Pruebas)" del mismo desarrollo
        3. Calcular tiempo promedio de resolución
        """
        try:
            if not period_end:
                period_end = date.today()
            if not period_start:
                period_start = period_end - timedelta(days=90)

            # Obtener IDs de las etapas relevantes
            validacion_stage = self.db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.stage_name == "Validación de Correcciones"
            ).first()
            
            despliegue_stage = self.db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.stage_name == "Despliegue (Pruebas)"
            ).first()
            
            if not validacion_stage or not despliegue_stage:
                return {
                    "current_value": 0.0,
                    "total_devoluciones": 0,
                    "total_resueltas": 0,
                    "unresolved_count": 0,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No se encontraron las etapas necesarias para el cálculo"
                }

            # Buscar devoluciones en período
            devoluciones_query = self.db.query(models.DevelopmentActivityLog).filter(
                models.DevelopmentActivityLog.stage_id == validacion_stage.id,
                models.DevelopmentActivityLog.status.in_(['completed', 'completada']),
                models.DevelopmentActivityLog.dynamic_payload.isnot(None),
                models.DevelopmentActivityLog.created_at >= datetime.combine(period_start, datetime.min.time()),
                models.DevelopmentActivityLog.created_at <= datetime.combine(period_end, datetime.max.time())
            )
            
            # Filtrar por proveedor si se especifica
            if provider:
                devoluciones_query = devoluciones_query.join(models.Development).filter(
                    models.Development.provider == provider
                )
            
            devoluciones = devoluciones_query.all()
            
            if not devoluciones:
                return {
                    "current_value": 0.0,
                    "total_devoluciones": 0,
                    "total_resueltas": 0,
                    "unresolved_count": 0,
                    "provider_filter": provider,
                    "period": {"start": period_start, "end": period_end},
                    "message": "No hay devoluciones en el período especificado"
                }

            # Para cada devolución, buscar la siguiente entrega
            resolution_times = []
            resolved_count = 0
            
            for devolucion in devoluciones:
                # Buscar siguiente entrega en "Despliegue (Pruebas)" del mismo desarrollo
                siguiente_entrega = self.db.query(models.DevelopmentActivityLog).filter(
                    models.DevelopmentActivityLog.development_id == devolucion.development_id,
                    models.DevelopmentActivityLog.stage_id == despliegue_stage.id,
                    models.DevelopmentActivityLog.status.in_(['completed', 'completada']),
                    models.DevelopmentActivityLog.created_at > devolucion.created_at
                ).order_by(models.DevelopmentActivityLog.created_at.asc()).first()
                
                if siguiente_entrega:
                    # Calcular tiempo en horas
                    tiempo_horas = (siguiente_entrega.created_at - devolucion.created_at).total_seconds() / 3600
                    resolution_times.append(tiempo_horas)
                    resolved_count += 1

            # Calcular métricas
            promedio_horas = sum(resolution_times) / len(resolution_times) if resolution_times else 0
            unresolved_count = len(devoluciones) - resolved_count
            
            # Calcular período anterior para comparación
            prev_period_start = period_start - (period_end - period_start)
            prev_period_end = period_start
            
            prev_devoluciones_query = self.db.query(models.DevelopmentActivityLog).filter(
                models.DevelopmentActivityLog.stage_id == validacion_stage.id,
                models.DevelopmentActivityLog.status.in_(['completed', 'completada']),
                models.DevelopmentActivityLog.dynamic_payload.isnot(None),
                models.DevelopmentActivityLog.created_at >= datetime.combine(prev_period_start, datetime.min.time()),
                models.DevelopmentActivityLog.created_at < datetime.combine(prev_period_end, datetime.max.time())
            )
            
            if provider:
                prev_devoluciones_query = prev_devoluciones_query.join(models.Development).filter(
                    models.Development.provider == provider
                )
            
            prev_devoluciones = prev_devoluciones_query.all()
            prev_resolution_times = []
            
            for prev_devolucion in prev_devoluciones:
                prev_siguiente = self.db.query(models.DevelopmentActivityLog).filter(
                    models.DevelopmentActivityLog.development_id == prev_devolucion.development_id,
                    models.DevelopmentActivityLog.stage_id == despliegue_stage.id,
                    models.DevelopmentActivityLog.status.in_(['completed', 'completada']),
                    models.DevelopmentActivityLog.created_at > prev_devolucion.created_at
                ).order_by(models.DevelopmentActivityLog.created_at.asc()).first()
                
                if prev_siguiente:
                    prev_tiempo = (prev_siguiente.created_at - prev_devolucion.created_at).total_seconds() / 3600
                    prev_resolution_times.append(prev_tiempo)
            
            prev_promedio = sum(prev_resolution_times) / len(prev_resolution_times) if prev_resolution_times else 0
            change_value = round(abs(promedio_horas - prev_promedio), 2)
            change_type = "decrease" if promedio_horas < prev_promedio else "increase" if promedio_horas > prev_promedio else "stable"

            # Guardar métrica
            try:
                first_dev = devoluciones[0].development_id if devoluciones else None
                self._save_kpi_metric(
                    development_id=first_dev,
                    metric_type="tiempo_resolucion_instaladores",
                    provider=provider,
                    value=Decimal(str(promedio_horas)),
                    target_value=Decimal("24.0"),  # Target de 24 horas
                    period_start=period_start,
                    period_end=period_end
                )
            except Exception:
                pass

            return {
                "current_value": round(promedio_horas, 2),
                "target_value": 24.0,
                "meets_target": promedio_horas <= 24.0,
                "change": {"value": change_value, "type": change_type},
                "total_devoluciones": len(devoluciones),
                "total_resueltas": resolved_count,
                "unresolved_count": unresolved_count,
                "resolution_rate": round((resolved_count / len(devoluciones) * 100), 2) if devoluciones else 0,
                "provider_filter": provider,
                "period": {"start": period_start, "end": period_end}
            }
            
        except Exception as e:
            raise Exception(f"Error calculando tiempo de resolución de instaladores: {str(e)}")
    
    def get_providers_summary(self) -> List[Dict[str, Any]]:
        """
        Obtener resumen de KPIs por proveedor
        """
        try:
            # Obtener todos los proveedores únicos
            providers_query = self.db.query(models.Development.provider).distinct()
            providers = [p[0] for p in providers_query.all()]
            
            summary = []
            
            for provider in providers:
                # Calcular métricas para cada proveedor
                compliance = self.calculate_global_compliance(provider=provider)
                quality = self.calculate_first_time_quality(provider=provider)
                defects = self.calculate_defects_per_delivery(provider=provider)
                
                provider_summary = {
                    "provider_name": provider,
                    "global_compliance": compliance.get("current_value", 0),
                    "first_time_quality": quality.get("current_value", 0),
                    "defects_per_delivery": defects.get("current_value", 0),
                    "total_deliveries": compliance.get("total_deliveries", 0),
                    "on_time_deliveries": compliance.get("on_time_deliveries", 0),
                    "meets_compliance_target": compliance.get("meets_target", False),
                    "meets_quality_target": quality.get("meets_target", False),
                    "meets_defects_target": defects.get("meets_target", False)
                }
                
                # Calcular score general
                scores = [
                    compliance.get("current_value", 0),
                    quality.get("current_value", 0),
                    max(0, 100 - (defects.get("current_value", 0) * 10))  # Convertir defectos a score
                ]
                provider_summary["overall_score"] = round(sum(scores) / len(scores), 2)
                
                summary.append(provider_summary)
            
            # Ordenar por score general
            summary.sort(key=lambda x: x["overall_score"], reverse=True)
            
            return summary
            
        except Exception as e:
            raise Exception(f"Error obteniendo resumen de proveedores: {str(e)}")


def get_kpi_service(db: Session = Depends(get_db)) -> KPIService:
    """Dependency para obtener servicio de KPIs"""
    return KPIService(db)