-- =====================================================
-- STORED PROCEDURE: fn_kpi_cumplimiento_fechas_analisis_detalle
-- =====================================================
-- Descripción: Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas de análisis
--              Incluye nombre del desarrollo para identificación
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_cumplimiento_fechas_analisis_detalle(
    p_provider VARCHAR(255) DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    development_id CHARACTER VARYING,
    development_name CHARACTER VARYING,
    provider_original CHARACTER VARYING,
    provider_homologado CHARACTER VARYING,
    fecha_analisis_comprometida DATE,
    fecha_real_propuesta DATE,
    dias_desviacion INTEGER,
    estado_entrega CHARACTER VARYING,
    total_entregas_analisis BIGINT,
    actividad_analisis_id INTEGER,
    actividad_propuesta_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_period_start DATE := COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE);
    v_current_period_end DATE := COALESCE(p_period_end, NOW()::DATE);
BEGIN
    RETURN QUERY
    WITH entregas_analisis AS (
        -- Actividades de análisis (fase 2) completadas
        SELECT 
            al.id as actividad_id,
            al.development_id,
            d.name as development_name,
            d.provider as provider_original,
            CASE 
                WHEN LOWER(d.provider) LIKE '%ingesoft%' THEN 'Ingesoft'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%oracle%' THEN 'ORACLE'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%itc%' THEN 'ITC'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%interno%' OR LOWER(d.provider) LIKE '%ti interno%' THEN 'TI Interno'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%coomeva%' THEN 'Coomeva'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%softtek%' THEN 'Softtek'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%accenture%' THEN 'Accenture'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%microsoft%' THEN 'Microsoft'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%ibm%' THEN 'IBM'::CHARACTER VARYING
                WHEN LOWER(d.provider) LIKE '%sap%' THEN 'SAP'::CHARACTER VARYING
                WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'::CHARACTER VARYING
                ELSE TRIM(d.provider)::CHARACTER VARYING
            END AS provider_homologado,
            al.end_date as fecha_analisis_comprometida,
            al.created_at as fecha_actividad_analisis,
            COUNT(*) OVER (PARTITION BY al.development_id) as total_entregas_analisis
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        WHERE ds.stage_code = '2' 
            AND al.status = 'completada'
            AND al.end_date IS NOT NULL
            AND al.created_at::DATE >= v_current_period_start
            AND al.created_at::DATE <= v_current_period_end
            AND (p_provider IS NULL OR (
                CASE 
                    WHEN LOWER(d.provider) LIKE '%ingesoft%' THEN 'Ingesoft'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%oracle%' THEN 'ORACLE'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%itc%' THEN 'ITC'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%interno%' OR LOWER(d.provider) LIKE '%ti interno%' THEN 'TI Interno'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%coomeva%' THEN 'Coomeva'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%softtek%' THEN 'Softtek'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%accenture%' THEN 'Accenture'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%microsoft%' THEN 'Microsoft'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%ibm%' THEN 'IBM'::CHARACTER VARYING
                    WHEN LOWER(d.provider) LIKE '%sap%' THEN 'SAP'::CHARACTER VARYING
                    WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'::CHARACTER VARYING
                    ELSE TRIM(d.provider)::CHARACTER VARYING
                END = p_provider
            ))
    ),
    propuestas AS (
        -- Actividades de propuesta (fase 3)
        SELECT 
            al.id as actividad_id,
            al.development_id,
            al.start_date as fecha_inicio_propuesta,
            al.created_at as fecha_actividad_propuesta
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code = '3'
    ),
    cumplimiento_detallado AS (
        SELECT 
            ea.development_id,
            ea.development_name,
            ea.provider_original,
            ea.provider_homologado,
            ea.fecha_analisis_comprometida,
            p.fecha_inicio_propuesta,
            ea.total_entregas_analisis,
            ea.actividad_id as actividad_analisis_id,
            p.actividad_id as actividad_propuesta_id,
            CASE 
                WHEN ea.total_entregas_analisis > 1 THEN 'INCUMPLIMIENTO (múltiples análisis)'::CHARACTER VARYING
                WHEN p.fecha_inicio_propuesta IS NOT NULL AND ea.fecha_analisis_comprometida IS NOT NULL 
                     AND p.fecha_inicio_propuesta <= ea.fecha_analisis_comprometida THEN 'A TIEMPO'::CHARACTER VARYING
                WHEN p.fecha_inicio_propuesta IS NOT NULL AND ea.fecha_analisis_comprometida IS NOT NULL 
                     AND p.fecha_inicio_propuesta > ea.fecha_analisis_comprometida THEN 'TARDÍO'::CHARACTER VARYING
                ELSE 'SIN PROPUESTA'::CHARACTER VARYING
            END as estado_entrega,
            CASE 
                WHEN p.fecha_inicio_propuesta IS NOT NULL AND ea.fecha_analisis_comprometida IS NOT NULL 
                THEN p.fecha_inicio_propuesta - ea.fecha_analisis_comprometida
                ELSE NULL
            END as dias_desviacion
        FROM entregas_analisis ea
        LEFT JOIN propuestas p ON ea.development_id = p.development_id
            AND p.fecha_actividad_propuesta > ea.fecha_actividad_analisis
    )
    SELECT 
        cd.development_id,
        cd.development_name,
        cd.provider_original,
        cd.provider_homologado,
        cd.fecha_analisis_comprometida,
        cd.fecha_inicio_propuesta,
        COALESCE(cd.dias_desviacion, 0)::INTEGER,
        cd.estado_entrega,
        cd.total_entregas_analisis,
        cd.actividad_analisis_id,
        cd.actividad_propuesta_id
    FROM cumplimiento_detallado cd
    ORDER BY cd.development_id, cd.fecha_analisis_comprometida;
END;
$$;
