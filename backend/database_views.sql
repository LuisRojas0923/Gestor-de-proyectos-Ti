-- =============================================================================
-- VISTAS SQL PARA KPIs Y FUNCIONALIDADES AVANZADAS
-- Sistema de Gestión de Proyectos TI
-- =============================================================================

-- Vista para obtener el estado actual del desarrollo
-- =============================================================================
CREATE VIEW current_development_status AS
SELECT 
    d.id,
    d.name,
    d.description,
    d.module,
    d.type,
    d.environment,
    d.remedy_link,
    dp.phase_name as current_phase,
    dp.phase_color as phase_color,
    ds.stage_code,
    ds.stage_name as current_stage,
    ds.stage_description,
    ds.responsible_party,
    ds.is_milestone,
    d.stage_progress_percentage,
    d.created_at,
    d.updated_at
FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id;

-- Vista para el flujo completo del ciclo de desarrollo
-- =============================================================================
CREATE VIEW development_cycle_flow AS
SELECT 
    ds.stage_code,
    ds.stage_name,
    ds.stage_description,
    dp.phase_name,
    dp.phase_color,
    ds.is_milestone,
    ds.estimated_days,
    ds.responsible_party,
    ds.sort_order,
    CASE 
        WHEN ds.responsible_party = 'proveedor' THEN 'Proveedor'
        WHEN ds.responsible_party = 'usuario' THEN 'Usuario'
        WHEN ds.responsible_party = 'equipo_interno' THEN 'Equipo Interno'
        ELSE 'No Definido'
    END as responsible_party_name
FROM development_stages ds
JOIN development_phases dp ON ds.phase_id = dp.id
WHERE ds.is_active = TRUE
ORDER BY ds.sort_order;

-- Vista para obtener la observación más reciente
-- =============================================================================
CREATE VIEW latest_development_observation AS
SELECT 
    d.*,
    do.content as latest_observation,
    do.author as observation_author,
    do.observation_date
FROM developments d
LEFT JOIN development_observations do ON d.id = do.development_id
WHERE do.is_current = TRUE;

-- Vista para alertas de próximas actividades
-- =============================================================================
CREATE VIEW upcoming_activities_alerts AS
SELECT 
    d.id as development_id,
    d.name as development_name,
    dua.*,
    CASE 
        WHEN dua.due_date < CURRENT_DATE THEN 'Vencido'
        WHEN dua.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Urgente'
        WHEN dua.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Próximo'
        ELSE 'Normal'
    END as alert_level
FROM developments d
JOIN development_upcoming_activities dua ON d.id = dua.development_id
WHERE dua.status = 'Pendiente' 
  AND dua.due_date <= CURRENT_DATE + INTERVAL '30 days';

-- Vista para controles de calidad por etapa actual
-- =============================================================================
CREATE VIEW current_quality_controls AS
SELECT 
    d.id as development_id,
    d.name as development_name,
    ds.stage_code as current_stage,
    qcc.control_code,
    qcc.control_name,
    qcc.description,
    qcc.deliverables,
    qcc.validation_criteria,
    COALESCE(dqc.status, 'Pendiente') as status,
    COALESCE(dqc.validation_status, 'Pendiente') as validation_status,
    dqc.completed_by,
    dqc.completed_at,
    dqc.validated_by,
    dqc.validated_at,
    dqc.deliverables_provided,
    dqc.validation_notes,
    dqc.evidence_files
FROM developments d
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
CROSS JOIN quality_control_catalog qcc
LEFT JOIN development_quality_controls dqc ON d.id = dqc.development_id AND qcc.id = dqc.control_catalog_id
WHERE qcc.is_active = TRUE
  AND (ds.stage_code IS NULL OR qcc.stage_prefix LIKE '%' || ds.stage_code || '%');

-- Vista para controles aplicables por etapa
-- =============================================================================
CREATE VIEW applicable_quality_controls AS
SELECT 
    qcc.*,
    CASE 
        WHEN dqc.id IS NULL THEN 'No Aplica'
        ELSE dqc.status
    END as current_status
FROM quality_control_catalog qcc
LEFT JOIN development_quality_controls dqc ON qcc.id = dqc.control_catalog_id
WHERE qcc.is_active = TRUE;

-- =============================================================================
-- VISTAS PARA CÁLCULO DE INDICADORES DE CALIDAD (KPIs)
-- =============================================================================

-- Vista para Cumplimiento Global de Fechas
-- =============================================================================
CREATE VIEW global_compliance_view AS
SELECT 
    dp.provider_name,
    COUNT(*) as total_deliveries,
    SUM(CASE WHEN dd.delivery_status = 'on_time' THEN 1 ELSE 0 END) as on_time_deliveries,
    SUM(CASE WHEN dd.delivery_status = 'delayed' THEN 1 ELSE 0 END) as delayed_deliveries,
    ROUND(
        (SUM(CASE WHEN dd.delivery_status = 'on_time' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
    ) as compliance_percentage,
    AVG(dd.delivery_compliance_score) as avg_compliance_score,
    MAX(dd.actual_date) as last_delivery_date
FROM development_dates dd
JOIN development_providers dp ON dd.development_id = dp.development_id
WHERE dd.date_type = 'entrega' 
  AND dd.actual_date IS NOT NULL
GROUP BY dp.provider_name;

-- Vista para Cumplimiento de Fechas por Desarrollo
-- =============================================================================
CREATE VIEW development_compliance_days_view AS
SELECT 
    d.id as development_id,
    d.name as development_name,
    dp.provider_name,
    dd.planned_date,
    dd.actual_date,
    dd.delivery_status,
    CASE 
        WHEN dd.actual_date IS NOT NULL AND dd.planned_date IS NOT NULL THEN
            EXTRACT(DAYS FROM (dd.actual_date - dd.planned_date))
        ELSE NULL
    END as days_difference,
    dd.days_estimated,
    dd.days_actual,
    CASE 
        WHEN dd.days_actual IS NOT NULL AND dd.days_estimated IS NOT NULL THEN
            (dd.days_actual - dd.days_estimated)
        ELSE NULL
    END as estimated_vs_actual_days
FROM developments d
JOIN development_dates dd ON d.id = dd.development_id
JOIN development_providers dp ON d.id = dp.development_id
WHERE dd.date_type = 'entrega';

-- Vista para Calidad en Primera Entrega
-- =============================================================================
CREATE VIEW first_time_quality_view AS
SELECT 
    dp.provider_name,
    COUNT(*) as total_deliveries,
    SUM(CASE WHEN dd.approval_status = 'approved_first_time' THEN 1 ELSE 0 END) as first_time_approved,
    SUM(CASE WHEN dd.approval_status = 'approved_with_returns' THEN 1 ELSE 0 END) as approved_with_returns,
    SUM(CASE WHEN dd.approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected_deliveries,
    ROUND(
        (SUM(CASE WHEN dd.approval_status = 'approved_first_time' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
    ) as quality_percentage,
    AVG(dd.delivery_compliance_score) as avg_quality_score
FROM development_dates dd
JOIN development_providers dp ON dd.development_id = dp.development_id
WHERE dd.date_type = 'entrega' 
  AND dd.approval_status IS NOT NULL
GROUP BY dp.provider_name;

-- Vista para Tiempo de Respuesta a Fallas
-- =============================================================================
CREATE VIEW failure_response_time_view AS
SELECT 
    dp.provider_name,
    COUNT(*) as total_incidents,
    AVG(i.response_time_hours) as avg_response_time_hours,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY i.response_time_hours) as median_response_time_hours,
    AVG(i.resolution_time_hours) as avg_resolution_time_hours,
    SUM(CASE WHEN i.response_time_hours <= 4 THEN 1 ELSE 0 END) as incidents_within_4h,
    ROUND(
        (SUM(CASE WHEN i.response_time_hours <= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
    ) as response_sla_compliance
FROM incidents i
JOIN development_providers dp ON i.development_id = dp.development_id
WHERE i.response_time_hours IS NOT NULL
  AND i.status = 'Cerrada'
GROUP BY dp.provider_name;

-- Vista para Defectos por Entrega
-- =============================================================================
CREATE VIEW defects_per_delivery_view AS
SELECT 
    dp.provider_name,
    COUNT(DISTINCT dd.development_id) as total_deliveries,
    SUM(df.defects_count) as total_defects,
    SUM(dd.functionality_count) as total_functionalities,
    ROUND(
        CASE 
            WHEN SUM(dd.functionality_count) > 0 THEN 
                (SUM(df.defects_count) * 1.0 / SUM(dd.functionality_count))
            ELSE 0
        END, 2
    ) as defects_per_functionality,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT dd.development_id) > 0 THEN 
                (SUM(df.defects_count) * 1.0 / COUNT(DISTINCT dd.development_id))
            ELSE 0
        END, 2
    ) as defects_per_delivery,
    AVG(df.test_coverage_percentage) as avg_test_coverage
FROM development_dates dd
JOIN development_providers dp ON dd.development_id = dp.development_id
LEFT JOIN development_functionalities df ON dd.development_id = df.development_id
WHERE dd.date_type = 'entrega'
GROUP BY dp.provider_name;

-- Vista para Retrabajo Post-Producción
-- =============================================================================
CREATE VIEW post_production_rework_view AS
SELECT 
    dp.provider_name,
    COUNT(DISTINCT i.development_id) as total_production_deliveries,
    SUM(CASE WHEN i.is_production_derived = TRUE THEN 1 ELSE 0 END) as production_incidents,
    SUM(CASE WHEN i.is_rework = TRUE THEN 1 ELSE 0 END) as rework_incidents,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT i.development_id) > 0 THEN 
                (SUM(CASE WHEN i.is_production_derived = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT i.development_id))
            ELSE 0
        END, 2
    ) as production_incident_rate,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT i.development_id) > 0 THEN 
                (SUM(CASE WHEN i.is_rework = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT i.development_id))
            ELSE 0
        END, 2
    ) as rework_rate,
    AVG(CASE WHEN i.is_production_derived = TRUE THEN i.resolution_time_hours END) as avg_production_resolution_time
FROM incidents i
JOIN development_providers dp ON i.development_id = dp.development_id
JOIN development_dates dd ON i.development_id = dd.development_id
WHERE dd.date_type = 'produccion' 
  AND dd.actual_date IS NOT NULL
GROUP BY dp.provider_name;

-- Vista Consolidada de Indicadores por Proveedor
-- =============================================================================
CREATE VIEW provider_kpi_summary AS
SELECT 
    COALESCE(gc.provider_name, ftq.provider_name, frt.provider_name, dpd.provider_name, ppr.provider_name) as provider_name,
    
    -- Cumplimiento Global
    COALESCE(gc.compliance_percentage, 0) as global_compliance,
    COALESCE(gc.total_deliveries, 0) as total_deliveries,
    COALESCE(gc.on_time_deliveries, 0) as on_time_deliveries,
    
    -- Calidad Primera Entrega
    COALESCE(ftq.quality_percentage, 0) as first_time_quality,
    COALESCE(ftq.total_deliveries, 0) as quality_tracked_deliveries,
    
    -- Tiempo de Respuesta
    COALESCE(frt.median_response_time_hours, 0) as failure_response_time_hours,
    COALESCE(frt.response_sla_compliance, 0) as response_sla_compliance,
    
    -- Defectos por Entrega
    COALESCE(dpd.defects_per_delivery, 0) as defects_per_delivery,
    COALESCE(dpd.avg_test_coverage, 0) as avg_test_coverage,
    
    -- Retrabajo Post-Producción
    COALESCE(ppr.production_incident_rate, 0) as post_production_rework_rate,
    COALESCE(ppr.rework_rate, 0) as rework_rate,
    
    -- Métricas Calculadas
    CURRENT_TIMESTAMP as calculated_at

FROM global_compliance_view gc
FULL OUTER JOIN first_time_quality_view ftq ON gc.provider_name = ftq.provider_name
FULL OUTER JOIN failure_response_time_view frt ON COALESCE(gc.provider_name, ftq.provider_name) = frt.provider_name
FULL OUTER JOIN defects_per_delivery_view dpd ON COALESCE(gc.provider_name, ftq.provider_name, frt.provider_name) = dpd.provider_name
FULL OUTER JOIN post_production_rework_view ppr ON COALESCE(gc.provider_name, ftq.provider_name, frt.provider_name, dpd.provider_name) = ppr.provider_name;

-- Vista para Historial de Métricas por Período
-- =============================================================================
CREATE VIEW kpi_historical_view AS
SELECT 
    dqm.provider,
    dqm.metric_type,
    dqm.metric_name,
    dqm.value,
    dqm.target_value,
    dqm.unit,
    dqm.period_start,
    dqm.period_end,
    dqm.calculated_at,
    ROUND(
        CASE 
            WHEN dqm.target_value > 0 THEN 
                ((dqm.value - dqm.target_value) / dqm.target_value * 100)
            ELSE 0
        END, 2
    ) as variance_percentage,
    CASE 
        WHEN dqm.value >= dqm.target_value THEN 'Target Met'
        ELSE 'Below Target'
    END as target_status
FROM development_quality_metrics dqm
WHERE dqm.is_current = TRUE
ORDER BY dqm.provider, dqm.metric_type, dqm.period_start DESC;

-- Vista para Dashboard de Desarrollos con Estado Completo
-- =============================================================================
CREATE VIEW development_dashboard_view AS
SELECT 
    d.id,
    d.name,
    d.description,
    d.module,
    d.type,
    d.environment,
    dp.phase_name as current_phase,
    dp.phase_color,
    ds.stage_name as current_stage,
    ds.stage_code,
    ds.responsible_party,
    d.stage_progress_percentage,
    
    -- Información de proveedores
    STRING_AGG(DISTINCT dprov.provider_name, ', ') as providers,
    
    -- Información de responsables
    STRING_AGG(DISTINCT CASE WHEN dr.is_primary THEN dr.user_name END, ', ') as main_responsible,
    
    -- Fechas importantes
    dd_inicio.planned_date as start_date,
    dd_fin.planned_date as estimated_end_date,
    dd_fin.actual_date as actual_end_date,
    
    -- Observación más reciente
    do_recent.content as latest_observation,
    do_recent.observation_date as last_observation_date,
    
    -- Contadores
    (SELECT COUNT(*) FROM development_upcoming_activities WHERE development_id = d.id AND status = 'Pendiente') as pending_activities,
    (SELECT COUNT(*) FROM incidents WHERE development_id = d.id AND status = 'Abierta') as open_incidents,
    
    d.created_at,
    d.updated_at

FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
LEFT JOIN development_providers dprov ON d.id = dprov.development_id
LEFT JOIN development_responsibles dr ON d.id = dr.development_id
LEFT JOIN development_dates dd_inicio ON d.id = dd_inicio.development_id AND dd_inicio.date_type = 'inicio'
LEFT JOIN development_dates dd_fin ON d.id = dd_fin.development_id AND dd_fin.date_type = 'fin_estimado'
LEFT JOIN (
    SELECT DISTINCT ON (development_id) 
           development_id, content, observation_date
    FROM development_observations 
    WHERE is_current = TRUE 
    ORDER BY development_id, observation_date DESC
) do_recent ON d.id = do_recent.development_id

GROUP BY 
    d.id, d.name, d.description, d.module, d.type, d.environment,
    dp.phase_name, dp.phase_color, ds.stage_name, ds.stage_code, ds.responsible_party,
    d.stage_progress_percentage, dd_inicio.planned_date, dd_fin.planned_date, 
    dd_fin.actual_date, do_recent.content, do_recent.observation_date,
    d.created_at, d.updated_at;

-- =============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- =============================================================================

SELECT 'VISTAS SQL CREADAS EXITOSAMENTE' as status;

-- Contar vistas creadas
SELECT COUNT(*) as vistas_creadas
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
    'current_development_status',
    'development_cycle_flow',
    'latest_development_observation',
    'upcoming_activities_alerts',
    'current_quality_controls',
    'applicable_quality_controls',
    'global_compliance_view',
    'development_compliance_days_view',
    'first_time_quality_view',
    'failure_response_time_view',
    'defects_per_delivery_view',
    'post_production_rework_view',
    'provider_kpi_summary',
    'kpi_historical_view',
    'development_dashboard_view'
);

-- =============================================================================
-- FIN DEL SCRIPT DE VISTAS
-- =============================================================================
