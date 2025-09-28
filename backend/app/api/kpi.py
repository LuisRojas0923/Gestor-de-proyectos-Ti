"""
Endpoints de API para KPIs y métricas de rendimiento
Implementación completa con datos reales de la base de datos
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, text
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal
from .. import models, schemas
from ..database import get_db
from ..services.kpi_service import KPIService, get_kpi_service

router = APIRouter(prefix="/kpi", tags=["kpi"])


@router.get("/_debug/base-data")
def debug_base_data(db: Session = Depends(get_db)):
    """
    Endpoint temporal para auditar datos base que alimentan los KPIs.
    Devuelve conteos y pequeñas muestras de tablas clave.
    """
    try:
        # Conteos
        counts = {
            "developments": db.query(models.Development).count(),
            "development_dates": db.query(models.DevelopmentDate).count(),
            "development_activity_log": db.query(models.DevelopmentActivityLog).count(),
            "development_quality_controls": db.query(models.DevelopmentQualityControl).count(),
            "incidents": db.query(models.Incident).count(),
            "development_kpi_metrics": db.query(models.DevelopmentKpiMetric).count(),
        }

        # Muestras
        samples = {
            "developments": [
                {
                    "id": d.id,
                    "name": d.name,
                    "provider": getattr(d, "provider", None),
                }
                for d in db.query(models.Development).limit(5).all()
            ],
            "development_dates": [
                {
                    "development_id": dd.development_id,
                    "date_type": dd.date_type,
                    "planned_date": dd.planned_date,
                    "actual_date": dd.actual_date,
                }
                for dd in db.query(models.DevelopmentDate).limit(5).all()
            ],
            "development_activity_log": [
                {
                    "id": al.id,
                    "development_id": al.development_id,
                    "activity_type": al.activity_type,
                    "start_date": getattr(al, "start_date", None),
                    "end_date": getattr(al, "end_date", None),
                    "actor_type": getattr(al, "actor_type", None),
                    "notes": al.notes,
                }
                for al in db.query(models.DevelopmentActivityLog).limit(5).all()
            ],
            "incidents": [
                {
                    "id": i.id,
                    "report_date": getattr(i, "report_date", None),
                    "resolution_date": getattr(i, "resolution_date", None),
                    "severity": getattr(i, "severity", None),
                }
                for i in db.query(models.Incident).limit(5).all()
            ],
        }

        return {"counts": counts, "samples": samples}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error leyendo datos base: {str(e)}"
        )


@router.get("/metrics")
def get_kpi_metrics(
    provider: Optional[str] = None,
    metric_type: Optional[str] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Obtener métricas de KPIs con datos reales
    
    - **provider**: Filtrar por proveedor específico
    - **metric_type**: Tipo de métrica ('cumplimiento_fechas', 'calidad_primera_entrega', etc.)
    - **period_start**: Fecha inicio del período
    - **period_end**: Fecha fin del período
    """
    try:
        query = db.query(models.DevelopmentKpiMetric).options(
            joinedload(models.DevelopmentKpiMetric.development)
        )
        
        if provider:
            query = query.filter(models.DevelopmentKpiMetric.provider.ilike(f"%{provider}%"))
        
        if metric_type:
            query = query.filter(models.DevelopmentKpiMetric.metric_type == metric_type)
        
        if period_start:
            query = query.filter(models.DevelopmentKpiMetric.period_start >= period_start)
        
        if period_end:
            query = query.filter(models.DevelopmentKpiMetric.period_end <= period_end)
        
        metrics = query.order_by(models.DevelopmentKpiMetric.calculated_at.desc()).all()
        
        return {
            "total_metrics": len(metrics),
            "metrics": [
                {
                    "id": metric.id,
                    "development_id": metric.development_id,
                    "development_name": metric.development.name if metric.development else None,
                    "metric_type": metric.metric_type,
                    "provider": metric.provider,
                    "value": float(metric.value) if metric.value else None,
                    "target_value": float(metric.target_value) if metric.target_value else None,
                    "period_start": metric.period_start,
                    "period_end": metric.period_end,
                    "calculated_at": metric.calculated_at
                }
                for metric in metrics
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo métricas: {str(e)}"
        )


@router.post("/calculate")
def calculate_metrics(
    calculation_request: schemas.KPICalculationRequest,
    kpi_service: KPIService = Depends(get_kpi_service)
):
    """
    Calcular métricas automáticamente
    
    Ejecuta el cálculo de métricas para el período y proveedor especificado
    """
    try:
        results = {}
        
        # Calcular según el tipo de métrica solicitado
        if calculation_request.metric_types is None or "cumplimiento_fechas" in calculation_request.metric_types:
            compliance = kpi_service.calculate_global_compliance(
                provider=calculation_request.provider,
                period_start=calculation_request.period_start,
                period_end=calculation_request.period_end
            )
            results["cumplimiento_fechas"] = compliance
        
        if calculation_request.metric_types is None or "calidad_primera_entrega" in calculation_request.metric_types:
            quality = kpi_service.calculate_first_time_quality(
                provider=calculation_request.provider,
                period_start=calculation_request.period_start,
                period_end=calculation_request.period_end
            )
            results["calidad_primera_entrega"] = quality
        
        if calculation_request.metric_types is None or "tiempo_respuesta" in calculation_request.metric_types:
            response_time = kpi_service.calculate_failure_response_time(
                provider=calculation_request.provider,
                period_start=calculation_request.period_start,
                period_end=calculation_request.period_end
            )
            results["tiempo_respuesta"] = response_time
        
        if calculation_request.metric_types is None or "defectos_entrega" in calculation_request.metric_types:
            defects = kpi_service.calculate_defects_per_delivery(
                provider=calculation_request.provider,
                period_start=calculation_request.period_start,
                period_end=calculation_request.period_end
            )
            results["defectos_entrega"] = defects
        
        if calculation_request.metric_types is None or "retrabajo_produccion" in calculation_request.metric_types:
            rework = kpi_service.calculate_post_production_rework(
                provider=calculation_request.provider,
                period_start=calculation_request.period_start,
                period_end=calculation_request.period_end
            )
            results["retrabajo_produccion"] = rework
        
        return {
            "calculation_completed": True,
            "provider": calculation_request.provider,
            "period_start": calculation_request.period_start,
            "period_end": calculation_request.period_end,
            "calculated_at": datetime.now(),
            "metrics": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculando métricas: {str(e)}"
        )


@router.get("/providers")
def get_kpi_providers(db: Session = Depends(get_db)):
    """
    Obtener lista de proveedores únicos para filtros usando JOIN entre actividades y developments
    """
    try:
        # Ejecutar stored procedure que hace JOIN entre development_activity_log y developments
        from sqlalchemy import text
        
        result = db.execute(text("SELECT * FROM fn_get_providers_from_activities()"))
        
        providers = []
        for row in result:
            providers.append({
                "name": row.provider_homologado,
                "developments_count": row.cantidad_desarrollos_con_actividades,
                "activities_count": row.total_actividades
            })
        
        # Extraer solo los nombres para compatibilidad con el frontend
        provider_names = [p["name"] for p in providers]
        
        return {
            "providers": provider_names,
            "total": len(provider_names),
            "detailed_info": providers,
            "source": "stored_procedure_with_join"
        }
        
    except Exception as e:
        # Fallback a consulta directa si el SP no existe aún
        try:
            print(f"⚠️ SP no encontrado, usando consulta directa: {e}")
            
            # Consulta directa con JOIN
            from sqlalchemy import func, case
            
            query = db.query(
                case(
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
                ).label('provider_homologado'),
                func.count(models.DevelopmentActivityLog.id.distinct()).label('activities_count')
            ).select_from(
                models.DevelopmentActivityLog
            ).join(
                models.Development, 
                models.DevelopmentActivityLog.development_id == models.Development.id
            ).group_by(
                'provider_homologado'
            ).order_by(
                'provider_homologado'
            )
            
            result = query.all()
            
            providers = []
            for row in result:
                providers.append({
                    "name": row.provider_homologado,
                    "activities_count": row.activities_count
                })
            
            provider_names = [p["name"] for p in providers]
            
            return {
                "providers": provider_names,
                "total": len(provider_names),
                "detailed_info": providers,
                "source": "direct_query_with_join"
            }
            
        except Exception as fallback_error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error obteniendo proveedores (SP y fallback fallaron): {str(e)} | Fallback: {str(fallback_error)}"
            )


@router.get("/dashboard")
def get_kpi_dashboard(
    provider: Optional[str] = None,
    kpi_service: KPIService = Depends(get_kpi_service)
):
    """
    Dashboard completo de KPIs con datos reales
    
    Proporciona vista consolidada de todas las métricas principales
    """
    try:
        # Obtener período actual (últimos 3 meses)
        end_date = date.today()
        start_date = end_date - timedelta(days=90)
        
        # Calcular métricas principales
        dashboard_data = {
            "period": {
                "start": start_date,
                "end": end_date,
                "description": "Últimos 3 meses"
            },
            "provider_filter": provider,
            "updated_at": datetime.now()
        }
        
        # 1. Cumplimiento Global de Fechas (Desarrollo - Fase 5)
        try:
            compliance = kpi_service.calculate_global_compliance(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["global_compliance"] = compliance
        except Exception as e:
            print(f"Warning: Error calculando cumplimiento global: {e}")
            dashboard_data["global_compliance"] = {"current_value": 0, "change_percentage": 0, "trend": "stable"}
        
        # 1b. Cumplimiento de Fechas de Análisis (Fase 2)
        try:
            analysis_compliance = kpi_service.calculate_analysis_compliance(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["analysis_compliance"] = analysis_compliance
        except Exception as e:
            print(f"Warning: Error calculando cumplimiento análisis: {e}")
            dashboard_data["analysis_compliance"] = {"current_value": 0, "change_percentage": 0, "trend": "stable"}
        
        # 1c. Cumplimiento de Fechas de Propuesta (Fase 3)
        try:
            proposal_compliance = kpi_service.calculate_proposal_compliance(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["proposal_compliance"] = proposal_compliance
        except Exception as e:
            print(f"Warning: Error calculando cumplimiento propuesta: {e}")
            dashboard_data["proposal_compliance"] = {"current_value": 0, "change_percentage": 0, "trend": "stable"}
        
        # 1d. Cumplimiento de Fechas Global Completo (Análisis + Propuesta + Desarrollo)
        try:
            global_complete_compliance = kpi_service.calculate_global_complete_compliance(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["global_complete_compliance"] = global_complete_compliance
        except Exception as e:
            print(f"Warning: Error calculando cumplimiento global completo: {e}")
            dashboard_data["global_complete_compliance"] = {"current_value": 0, "change_percentage": 0, "trend": "stable"}
        
        # 2. Calidad en Primera Entrega
        try:
            quality = kpi_service.calculate_first_time_quality(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["first_time_quality"] = quality
        except Exception as e:
            print(f"Warning: Error calculando calidad primera entrega: {e}")
            dashboard_data["first_time_quality"] = {"current_value": 0, "rejection_rate": 0}
        
        # 3. Tiempo de Respuesta a Fallas
        try:
            response_time = kpi_service.calculate_failure_response_time(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["failure_response_time"] = response_time
        except Exception as e:
            print(f"Warning: Error calculando tiempo respuesta: {e}")
            dashboard_data["failure_response_time"] = {"current_value": 0, "change": {"value": 0, "type": "decrease"}}
        
        # 3b. Desviación de días en cumplimiento de fechas (nuevo)
        try:
            dev_days = kpi_service.calculate_development_compliance_days(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["development_compliance_days"] = dev_days
        except Exception as e:
            print(f"Warning: Error calculando desviación de días: {e}")
            dashboard_data["development_compliance_days"] = {"current_value": 0, "change": {"value": 0, "type": "decrease"}}

        # 4. Defectos por Entrega ⭐ (SIEMPRE FUNCIONA)
        defects = kpi_service.calculate_defects_per_delivery(
            provider=provider,
            period_start=start_date,
            period_end=end_date
        )
        dashboard_data["defects_per_delivery"] = defects
        
        # 5. Retrabajo Post-Producción
        try:
            rework = kpi_service.calculate_post_production_rework(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["post_production_rework"] = rework
        except Exception as e:
            print(f"Warning: Error calculando retrabajo: {e}")
            dashboard_data["post_production_rework"] = {"current_value": 0, "change": {"value": 0, "type": "decrease"}}
        
        # 6. Tiempo de Resolución de Instaladores
        try:
            installer_resolution = kpi_service.calculate_installer_resolution_time(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            dashboard_data["installer_resolution_time"] = installer_resolution
        except Exception as e:
            print(f"Warning: Error calculando tiempo resolución instaladores: {e}")
            dashboard_data["installer_resolution_time"] = {"current_value": 0, "change": {"value": 0, "type": "decrease"}}

        # 7. Calidad por Proveedor
        provider_quality = kpi_service.get_providers_summary()
        dashboard_data["provider_quality"] = [
            {
                "name": p["provider_name"],
                "quality": p["first_time_quality"],
                "color": "#10B981" if p["first_time_quality"] >= 90 else "#F59E0B" if p["first_time_quality"] >= 80 else "#EF4444"
            }
            for p in provider_quality
        ]
        
        # 8. Resumen por Proveedores
        if not provider:
            providers_summary = kpi_service.get_providers_summary()
            dashboard_data["providers_summary"] = providers_summary
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando dashboard: {str(e)}"
        )


@router.get("/reports")
def get_kpi_reports(
    provider: Optional[str] = None,
    period: Optional[str] = "monthly",  # monthly, quarterly, yearly
    format: Optional[str] = "json",  # json, csv, excel
    db: Session = Depends(get_db)
):
    """
    Reportes detallados de rendimiento
    
    Genera reportes con análisis histórico y tendencias
    """
    try:
        # Determinar período según parámetro
        end_date = date.today()
        
        if period == "monthly":
            start_date = end_date.replace(day=1)
            period_description = "Mes actual"
        elif period == "quarterly":
            # Trimestre actual
            quarter_start_month = ((end_date.month - 1) // 3) * 3 + 1
            start_date = end_date.replace(month=quarter_start_month, day=1)
            period_description = "Trimestre actual"
        elif period == "yearly":
            start_date = end_date.replace(month=1, day=1)
            period_description = "Año actual"
        else:
            start_date = end_date - timedelta(days=30)
            period_description = "Últimos 30 días"
        
        # Obtener datos históricos
        query = db.query(models.DevelopmentKpiMetric).filter(
            models.DevelopmentKpiMetric.period_start >= start_date,
            models.DevelopmentKpiMetric.period_end <= end_date
        )
        
        if provider:
            query = query.filter(models.DevelopmentKpiMetric.provider.ilike(f"%{provider}%"))
        
        historical_metrics = query.order_by(models.DevelopmentKpiMetric.calculated_at).all()
        
        # Agrupar por tipo de métrica
        metrics_by_type = {}
        for metric in historical_metrics:
            if metric.metric_type not in metrics_by_type:
                metrics_by_type[metric.metric_type] = []
            metrics_by_type[metric.metric_type].append({
                "value": float(metric.value) if metric.value else 0,
                "target_value": float(metric.target_value) if metric.target_value else 0,
                "provider": metric.provider,
                "date": metric.calculated_at.date(),
                "development_id": metric.development_id
            })
        
        # Calcular tendencias
        trends = {}
        for metric_type, values in metrics_by_type.items():
            if len(values) >= 2:
                recent_avg = sum(v["value"] for v in values[-5:]) / min(len(values), 5)
                older_avg = sum(v["value"] for v in values[:-5]) / max(len(values) - 5, 1) if len(values) > 5 else recent_avg
                
                trend = "improving" if recent_avg > older_avg else "declining" if recent_avg < older_avg else "stable"
                trends[metric_type] = {
                    "trend": trend,
                    "recent_average": round(recent_avg, 2),
                    "change_percentage": round(((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0, 2)
                }
        
        report_data = {
            "report_info": {
                "period": period_description,
                "start_date": start_date,
                "end_date": end_date,
                "provider_filter": provider,
                "generated_at": datetime.now(),
                "total_metrics": len(historical_metrics)
            },
            "metrics_summary": metrics_by_type,
            "trends_analysis": trends,
            "recommendations": _generate_recommendations(trends, metrics_by_type)
        }
        
        # TODO: Implementar exportación a CSV/Excel si se solicita
        if format in ["csv", "excel"]:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=f"Exportación a {format} no implementada aún"
            )
        
        return report_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando reportes: {str(e)}"
        )


@router.get("/functionalities", response_model=List[schemas.DevelopmentFunctionality])
def get_functionalities(
    development_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Obtener funcionalidades entregadas por desarrollo"""
    try:
        query = db.query(models.DevelopmentFunctionality).options(
            joinedload(models.DevelopmentFunctionality.development)
        )
        
        if development_id:
            query = query.filter(models.DevelopmentFunctionality.development_id == development_id)
        
        if status:
            query = query.filter(models.DevelopmentFunctionality.status == status)
        
        functionalities = query.offset(skip).limit(limit).all()
        
        return functionalities
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo funcionalidades: {str(e)}"
        )


@router.post("/functionalities", response_model=schemas.DevelopmentFunctionality)
def create_functionality(
    functionality: schemas.DevelopmentFunctionalityCreate,
    db: Session = Depends(get_db)
):
    """Crear nueva funcionalidad para un desarrollo"""
    try:
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == functionality.development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {functionality.development_id} no encontrado"
            )
        
        # Crear funcionalidad
        db_functionality = models.DevelopmentFunctionality(**functionality.dict())
        
        db.add(db_functionality)
        db.commit()
        db.refresh(db_functionality)
        
        return db_functionality
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando funcionalidad: {str(e)}"
        )


@router.get("/quality-metrics", response_model=List[schemas.DevelopmentQualityMetric])
def get_quality_metrics(
    development_id: Optional[str] = None,
    provider: Optional[str] = None,
    is_current: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Obtener métricas de calidad calculadas"""
    try:
        query = db.query(models.DevelopmentQualityMetric).options(
            joinedload(models.DevelopmentQualityMetric.development)
        )
        
        if development_id:
            query = query.filter(models.DevelopmentQualityMetric.development_id == development_id)
        
        if provider:
            query = query.filter(models.DevelopmentQualityMetric.provider.ilike(f"%{provider}%"))
        
        if is_current:
            query = query.filter(models.DevelopmentQualityMetric.is_current == True)
        
        quality_metrics = query.order_by(
            models.DevelopmentQualityMetric.calculated_at.desc()
        ).offset(skip).limit(limit).all()
        
        return quality_metrics
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo métricas de calidad: {str(e)}"
        )


def _generate_recommendations(trends: dict, metrics_by_type: dict) -> List[dict]:
    """
    Generar recomendaciones basadas en tendencias y métricas
    """
    recommendations = []
    
    for metric_type, trend_data in trends.items():
        if trend_data["trend"] == "declining":
            if metric_type == "cumplimiento_fechas":
                recommendations.append({
                    "priority": "high",
                    "metric": metric_type,
                    "issue": "Cumplimiento de fechas en declive",
                    "recommendation": "Revisar estimaciones de tiempo y procesos de planificación",
                    "impact": "Retrasos en entregas afectan satisfacción del cliente"
                })
            elif metric_type == "calidad_primera_entrega":
                recommendations.append({
                    "priority": "high",
                    "metric": metric_type,
                    "issue": "Calidad en primera entrega disminuyendo",
                    "recommendation": "Fortalecer procesos de revisión y testing antes de entrega",
                    "impact": "Incremento en retrabajo y costos"
                })
            elif metric_type == "tiempo_respuesta":
                recommendations.append({
                    "priority": "medium",
                    "metric": metric_type,
                    "issue": "Tiempo de respuesta a fallas incrementando",
                    "recommendation": "Mejorar procesos de soporte y escalamiento",
                    "impact": "Afecta disponibilidad del servicio"
                })
        elif trend_data["trend"] == "improving":
            recommendations.append({
                "priority": "info",
                "metric": metric_type,
                "issue": "Mejora continua detectada",
                "recommendation": "Mantener y documentar las buenas prácticas implementadas",
                "impact": "Tendencia positiva que debe preservarse"
            })
    
    return recommendations


@router.get("/_debug/dashboard-calculation")
def debug_dashboard_calculation(
    provider: Optional[str] = None,
    kpi_service: KPIService = Depends(get_kpi_service)
):
    """
    Endpoint de debug para ver exactamente qué se está calculando en el dashboard
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=90)
        
        debug_info = {
            "period": {
                "start": str(start_date),
                "end": str(end_date),
                "days": (end_date - start_date).days
            },
            "provider_filter": provider,
            "calculations": {}
        }
        
        # Debug de cada cálculo individual
        try:
            compliance = kpi_service.calculate_global_compliance(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            debug_info["calculations"]["global_compliance"] = {
                "success": True,
                "data": compliance
            }
        except Exception as e:
            debug_info["calculations"]["global_compliance"] = {
                "success": False,
                "error": str(e)
            }
        
        try:
            quality = kpi_service.calculate_first_time_quality(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            debug_info["calculations"]["first_time_quality"] = {
                "success": True,
                "data": quality
            }
        except Exception as e:
            debug_info["calculations"]["first_time_quality"] = {
                "success": False,
                "error": str(e)
            }
        
        try:
            dev_days = kpi_service.calculate_development_compliance_days(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            debug_info["calculations"]["development_compliance_days"] = {
                "success": True,
                "data": dev_days
            }
        except Exception as e:
            debug_info["calculations"]["development_compliance_days"] = {
                "success": False,
                "error": str(e)
            }
        
        try:
            defects = kpi_service.calculate_defects_per_delivery(
                provider=provider,
                period_start=start_date,
                period_end=end_date
            )
            debug_info["calculations"]["defects_per_delivery"] = {
                "success": True,
                "data": defects
            }
        except Exception as e:
            debug_info["calculations"]["defects_per_delivery"] = {
                "success": False,
                "error": str(e)
            }
        
        try:
            providers_summary = kpi_service.get_providers_summary()
            debug_info["calculations"]["providers_summary"] = {
                "success": True,
                "data": providers_summary
            }
        except Exception as e:
            debug_info["calculations"]["providers_summary"] = {
                "success": False,
                "error": str(e)
            }
        
        return debug_info
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en debug: {str(e)}"
        )


@router.get("/development-compliance/details")
def get_development_compliance_details(
    provider: Optional[str] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas desarrollo.
    Incluye nombre del desarrollo, fechas, proveedor y estado de cumplimiento.
    """
    try:
        # Ejecutar el stored procedure de detalles
        result = db.execute(text("""
            SELECT 
                development_id,
                development_name,
                provider_original,
                provider_homologado,
                fecha_compromiso_original,
                fecha_real_entrega,
                dias_desviacion,
                estado_entrega,
                total_entregas_desarrollo,
                actividad_entrega_id,
                actividad_despliegue_id
            FROM fn_kpi_cumplimiento_fechas_desarrollo_detalle(:provider, :start, :end)
        """), {
            "provider": provider,
            "start": period_start, 
            "end": period_end
        }).fetchall()

        # Convertir resultados a lista de diccionarios
        details = []
        for row in result:
            details.append({
                "development_id": row.development_id,
                "development_name": row.development_name,
                "provider_original": row.provider_original,
                "provider_homologado": row.provider_homologado,
                "fecha_compromiso_original": row.fecha_compromiso_original.isoformat() if row.fecha_compromiso_original else None,
                "fecha_real_entrega": row.fecha_real_entrega.isoformat() if row.fecha_real_entrega else None,
                "fecha_analisis_comprometida": None,
                "fecha_real_propuesta": None,
                "fecha_propuesta_comprometida": None,
                "fecha_real_aprobacion": None,
                "dias_desviacion": row.dias_desviacion,
                "estado_entrega": row.estado_entrega,
                "total_entregas_desarrollo": row.total_entregas_desarrollo,
                "total_entregas_analisis": 0,
                "total_entregas_propuesta": 0,
                "actividad_entrega_id": row.actividad_entrega_id,
                "actividad_despliegue_id": row.actividad_despliegue_id,
                "actividad_analisis_id": 0,
                "actividad_propuesta_id": None,
                "actividad_aprobacion_id": None
            })

        # Calcular resumen
        total_entregas = len(details)
        entregas_a_tiempo = len([d for d in details if d["estado_entrega"] == "A TIEMPO"])
        entregas_tardias = len([d for d in details if d["estado_entrega"] in ["TARDÍO", "INCUMPLIMIENTO (múltiples entregas)"]])
        porcentaje_cumplimiento = round((entregas_a_tiempo / total_entregas * 100), 2) if total_entregas > 0 else 0.0

        return {
            "summary": {
                "total_entregas": total_entregas,
                "entregas_a_tiempo": entregas_a_tiempo,
                "entregas_tardias": entregas_tardias,
                "porcentaje_cumplimiento": porcentaje_cumplimiento,
                "provider_filter": provider,
                "period_start": period_start.isoformat() if period_start else None,
                "period_end": period_end.isoformat() if period_end else None
            },
            "details": details
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo detalles del cumplimiento desarrollo: {str(e)}"
        )


@router.get("/analysis-compliance/details")
def get_analysis_compliance_details(
    provider: Optional[str] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas de análisis.
    Incluye nombre del desarrollo, fechas, proveedor y estado de cumplimiento.
    """
    try:
        # Ejecutar el stored procedure de detalles
        result = db.execute(text("""
            SELECT 
                development_id,
                development_name,
                provider_original,
                provider_homologado,
                fecha_analisis_comprometida,
                fecha_real_propuesta,
                dias_desviacion,
                estado_entrega,
                total_entregas_analisis,
                actividad_id,
                siguiente_actividad_id
            FROM fn_kpi_cumplimiento_fechas_analisis_detalle(:provider, :start, :end)
        """), {
            "provider": provider,
            "start": period_start, 
            "end": period_end
        }).fetchall()

        # Convertir resultados a lista de diccionarios
        details = []
        for row in result:
            details.append({
                "development_id": row.development_id,
                "development_name": row.development_name,
                "provider_original": row.provider_original,
                "provider_homologado": row.provider_homologado,
                "fecha_compromiso_original": None,
                "fecha_real_entrega": None,
                "fecha_analisis_comprometida": row.fecha_analisis_comprometida.isoformat() if row.fecha_analisis_comprometida else None,
                "fecha_real_propuesta": row.fecha_real_propuesta.isoformat() if row.fecha_real_propuesta else None,
                "fecha_propuesta_comprometida": None,
                "fecha_real_aprobacion": None,
                "dias_desviacion": row.dias_desviacion,
                "estado_entrega": row.estado_entrega,
                "total_entregas_desarrollo": 0,
                "total_entregas_analisis": row.total_entregas_analisis,
                "total_entregas_propuesta": 0,
                "actividad_entrega_id": 0,
                "actividad_despliegue_id": None,
                "actividad_analisis_id": row.actividad_id,
                "actividad_propuesta_id": row.siguiente_actividad_id,
                "actividad_aprobacion_id": None
            })

        # Calcular resumen
        total_entregas = len(details)
        entregas_a_tiempo = len([d for d in details if d["estado_entrega"] == "A TIEMPO"])
        entregas_tardias = len([d for d in details if d["estado_entrega"] in ["TARDÍO", "INCUMPLIMIENTO (múltiples análisis)"]])
        porcentaje_cumplimiento = round((entregas_a_tiempo / total_entregas * 100), 2) if total_entregas > 0 else 0.0

        return {
            "summary": {
                "total_entregas": total_entregas,
                "entregas_a_tiempo": entregas_a_tiempo,
                "entregas_tardias": entregas_tardias,
                "porcentaje_cumplimiento": porcentaje_cumplimiento,
                "provider_filter": provider,
                "period_start": period_start.isoformat() if period_start else None,
                "period_end": period_end.isoformat() if period_end else None
            },
            "details": details
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo detalles del cumplimiento análisis: {str(e)}"
        )


@router.get("/proposal-compliance/details")
def get_proposal_compliance_details(
    provider: Optional[str] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas de propuesta.
    Incluye nombre del desarrollo, fechas, proveedor y estado de cumplimiento.
    """
    try:
        # Ejecutar el stored procedure de detalles
        result = db.execute(text("""
            SELECT 
                development_id,
                development_name,
                provider_original,
                provider_homologado,
                fecha_propuesta_comprometida,
                fecha_real_aprobacion,
                dias_desviacion,
                estado_entrega,
                total_entregas_propuesta,
                actividad_id,
                siguiente_actividad_id
            FROM fn_kpi_cumplimiento_fechas_propuesta_detalle(:provider, :start, :end)
        """), {
            "provider": provider,
            "start": period_start, 
            "end": period_end
        }).fetchall()

        # Convertir resultados a lista de diccionarios
        details = []
        for row in result:
            details.append({
                "development_id": row.development_id,
                "development_name": row.development_name,
                "provider_original": row.provider_original,
                "provider_homologado": row.provider_homologado,
                "fecha_compromiso_original": None,
                "fecha_real_entrega": None,
                "fecha_analisis_comprometida": None,
                "fecha_real_propuesta": None,
                "fecha_propuesta_comprometida": row.fecha_propuesta_comprometida.isoformat() if row.fecha_propuesta_comprometida else None,
                "fecha_real_aprobacion": row.fecha_real_aprobacion.isoformat() if row.fecha_real_aprobacion else None,
                "dias_desviacion": row.dias_desviacion,
                "estado_entrega": row.estado_entrega,
                "total_entregas_desarrollo": 0,
                "total_entregas_analisis": 0,
                "total_entregas_propuesta": row.total_entregas_propuesta,
                "actividad_entrega_id": 0,
                "actividad_despliegue_id": None,
                "actividad_analisis_id": 0,
                "actividad_propuesta_id": row.actividad_id,
                "actividad_aprobacion_id": row.siguiente_actividad_id
            })

        # Calcular resumen
        total_entregas = len(details)
        entregas_a_tiempo = len([d for d in details if d["estado_entrega"] == "A TIEMPO"])
        entregas_tardias = len([d for d in details if d["estado_entrega"] in ["TARDÍO", "INCUMPLIMIENTO (múltiples propuestas)"]])
        porcentaje_cumplimiento = round((entregas_a_tiempo / total_entregas * 100), 2) if total_entregas > 0 else 0.0

        return {
            "summary": {
                "total_entregas": total_entregas,
                "entregas_a_tiempo": entregas_a_tiempo,
                "entregas_tardias": entregas_tardias,
                "porcentaje_cumplimiento": porcentaje_cumplimiento,
                "provider_filter": provider,
                "period_start": period_start.isoformat() if period_start else None,
                "period_end": period_end.isoformat() if period_end else None
            },
            "details": details
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo detalles del cumplimiento propuesta: {str(e)}"
        )


@router.get("/global-complete-compliance/details")
def get_global_complete_compliance_details(
    provider: Optional[str] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas global completo.
    Incluye análisis, propuesta y desarrollo con nombre del desarrollo para identificación.
    """
    try:
        # Ejecutar el stored procedure de detalles
        result = db.execute(text("""
            SELECT 
                development_id,
                development_name,
                provider_original,
                provider_homologado,
                fase,
                fecha_comprometida,
                fecha_real,
                dias_desviacion,
                estado_entrega,
                total_entregas_fase,
                actividad_id,
                siguiente_actividad_id
            FROM fn_kpi_cumplimiento_fechas_global_completo_detalle(:provider, :start, :end)
        """), {
            "provider": provider,
            "start": period_start, 
            "end": period_end
        }).fetchall()

        # Convertir resultados a lista de diccionarios
        details = []
        for row in result:
            details.append({
                "development_id": row.development_id,
                "development_name": row.development_name,
                "provider_original": row.provider_original,
                "provider_homologado": row.provider_homologado,
                "fase": row.fase,
                "fecha_comprometida": row.fecha_comprometida.isoformat() if row.fecha_comprometida else None,
                "fecha_real": row.fecha_real.isoformat() if row.fecha_real else None,
                "dias_desviacion": row.dias_desviacion,
                "estado_entrega": row.estado_entrega,
                "total_entregas_fase": row.total_entregas_fase,
                "actividad_id": row.actividad_id,
                "siguiente_actividad_id": row.siguiente_actividad_id
            })

        # Calcular resumen
        total_entregas = len(details)
        entregas_a_tiempo = len([d for d in details if d["estado_entrega"] == "A TIEMPO"])
        entregas_tardias = len([d for d in details if d["estado_entrega"] in ["TARDÍO", "INCUMPLIMIENTO (múltiples entregas)"]])
        porcentaje_cumplimiento = round((entregas_a_tiempo / total_entregas * 100), 2) if total_entregas > 0 else 0.0

        return {
            "summary": {
                "total_entregas": total_entregas,
                "entregas_a_tiempo": entregas_a_tiempo,
                "entregas_tardias": entregas_tardias,
                "porcentaje_cumplimiento": porcentaje_cumplimiento,
                "provider_filter": provider,
                "period_start": period_start.isoformat() if period_start else None,
                "period_end": period_end.isoformat() if period_end else None
            },
            "details": details
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo detalles del cumplimiento global completo: {str(e)}"
        )