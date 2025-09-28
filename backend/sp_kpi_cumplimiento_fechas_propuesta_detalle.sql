-- =====================================================
-- STORED PROCEDURE: fn_kpi_cumplimiento_fechas_propuesta_detalle
-- =====================================================
-- Descripción: Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas de propuesta
--              Incluye nombre del desarrollo para identificación
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_cumplimiento_fechas_propuesta_detalle(
    p_provider VARCHAR(255) DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    development_id CHARACTER VARYING,
    development_name CHARACTER VARYING,
    provider_original CHARACTER VARYING,
    provider_homologado CHARACTER VARYING,
    fecha_propuesta_comprometida DATE,
    fecha_real_aprobacion DATE,
    dias_desviacion INTEGER,
    estado_entrega CHARACTER VARYING,
    total_entregas_propuesta BIGINT,
    actividad_propuesta_id INTEGER,
    actividad_aprobacion_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_period_start DATE := COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE);
    v_current_period_end DATE := COALESCE(p_period_end, NOW()::DATE);
BEGIN
    RETURN QUERY
    WITH entregas_propuesta AS (
        -- Actividades de propuesta (fase 3) completadas
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
            al.end_date as fecha_propuesta_comprometida,
            al.created_at as fecha_actividad_propuesta,
            COUNT(*) OVER (PARTITION BY al.development_id) as total_entregas_propuesta
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        WHERE ds.stage_code = '3' 
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
    aprobaciones AS (
        -- Actividades de aprobación (fase 4)
        SELECT 
            al.id as actividad_id,
            al.development_id,
            al.start_date as fecha_inicio_aprobacion,
            al.created_at as fecha_actividad_aprobacion
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code = '4'
    ),
    cumplimiento_detallado AS (
        SELECT 
            ep.development_id,
            ep.development_name,
            ep.provider_original,
            ep.provider_homologado,
            ep.fecha_propuesta_comprometida,
            a.fecha_inicio_aprobacion,
            ep.total_entregas_propuesta,
            ep.actividad_id as actividad_propuesta_id,
            a.actividad_id as actividad_aprobacion_id,
            CASE 
                WHEN ep.total_entregas_propuesta > 1 THEN 'INCUMPLIMIENTO (múltiples propuestas)'::CHARACTER VARYING
                WHEN a.fecha_inicio_aprobacion IS NOT NULL AND ep.fecha_propuesta_comprometida IS NOT NULL 
                     AND a.fecha_inicio_aprobacion <= ep.fecha_propuesta_comprometida THEN 'A TIEMPO'::CHARACTER VARYING
                WHEN a.fecha_inicio_aprobacion IS NOT NULL AND ep.fecha_propuesta_comprometida IS NOT NULL 
                     AND a.fecha_inicio_aprobacion > ep.fecha_propuesta_comprometida THEN 'TARDÍO'::CHARACTER VARYING
                ELSE 'SIN APROBACIÓN'::CHARACTER VARYING
            END as estado_entrega,
            CASE 
                WHEN a.fecha_inicio_aprobacion IS NOT NULL AND ep.fecha_propuesta_comprometida IS NOT NULL 
                THEN a.fecha_inicio_aprobacion - ep.fecha_propuesta_comprometida
                ELSE NULL
            END as dias_desviacion
        FROM entregas_propuesta ep
        LEFT JOIN aprobaciones a ON ep.development_id = a.development_id
            AND a.fecha_actividad_aprobacion > ep.fecha_actividad_propuesta
    )
    SELECT 
        cd.development_id,
        cd.development_name,
        cd.provider_original,
        cd.provider_homologado,
        cd.fecha_propuesta_comprometida,
        cd.fecha_inicio_aprobacion,
        COALESCE(cd.dias_desviacion, 0)::INTEGER,
        cd.estado_entrega,
        cd.total_entregas_propuesta,
        cd.actividad_propuesta_id,
        cd.actividad_aprobacion_id
    FROM cumplimiento_detallado cd
    ORDER BY cd.development_id, cd.fecha_propuesta_comprometida;
END;
$$;
