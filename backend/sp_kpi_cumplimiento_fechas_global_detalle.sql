-- =====================================================
-- STORED PROCEDURE: fn_kpi_cumplimiento_fechas_desarrollo_detalle
-- =====================================================
-- Descripción: Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas desarrollo
--              Incluye nombre del desarrollo para identificación
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_cumplimiento_fechas_desarrollo_detalle(
    p_provider VARCHAR(255) DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    development_id CHARACTER VARYING,
    development_name CHARACTER VARYING,
    provider_original CHARACTER VARYING,
    provider_homologado CHARACTER VARYING,
    fecha_compromiso_original DATE,
    fecha_real_entrega DATE,
    dias_desviacion INTEGER,
    estado_entrega CHARACTER VARYING,
    total_entregas_desarrollo BIGINT,
    actividad_entrega_id INTEGER,
    actividad_despliegue_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_period_start DATE := COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE);
    v_current_period_end DATE := COALESCE(p_period_end, NOW()::DATE);
BEGIN
    RETURN QUERY
    WITH entregas_desarrollo AS (
        -- Actividades de entrega de desarrollo (fase 5) completadas
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
            al.end_date as fecha_entrega_comprometida,
            al.created_at as fecha_actividad_entrega,
            COUNT(*) OVER (PARTITION BY al.development_id) as total_entregas_desarrollo
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        WHERE ds.stage_code = '5' 
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
    despliegues_pruebas AS (
        -- Actividades de despliegue en pruebas (fase 6)
        SELECT 
            al.id as actividad_id,
            al.development_id,
            al.start_date as fecha_inicio_despliegue,
            al.created_at as fecha_actividad_despliegue
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code = '6'
    ),
    cumplimiento_detallado AS (
        SELECT 
            ed.development_id,
            ed.development_name,
            ed.provider_original,
            ed.provider_homologado,
            ed.fecha_entrega_comprometida,
            dp.fecha_inicio_despliegue,
            ed.total_entregas_desarrollo,
            ed.actividad_id as actividad_entrega_id,
            dp.actividad_id as actividad_despliegue_id,
            CASE 
                WHEN ed.total_entregas_desarrollo > 1 THEN 'INCUMPLIMIENTO (múltiples entregas)'::CHARACTER VARYING
                WHEN dp.fecha_inicio_despliegue IS NOT NULL AND ed.fecha_entrega_comprometida IS NOT NULL 
                     AND dp.fecha_inicio_despliegue <= ed.fecha_entrega_comprometida THEN 'A TIEMPO'::CHARACTER VARYING
                WHEN dp.fecha_inicio_despliegue IS NOT NULL AND ed.fecha_entrega_comprometida IS NOT NULL 
                     AND dp.fecha_inicio_despliegue > ed.fecha_entrega_comprometida THEN 'TARDÍO'::CHARACTER VARYING
                ELSE 'SIN DESPLIEGUE'::CHARACTER VARYING
            END as estado_entrega,
            CASE 
                WHEN dp.fecha_inicio_despliegue IS NOT NULL AND ed.fecha_entrega_comprometida IS NOT NULL 
                THEN dp.fecha_inicio_despliegue - ed.fecha_entrega_comprometida
                ELSE NULL
            END as dias_desviacion
        FROM entregas_desarrollo ed
        LEFT JOIN despliegues_pruebas dp ON ed.development_id = dp.development_id
            AND dp.fecha_actividad_despliegue > ed.fecha_actividad_entrega
    )
    SELECT 
        cd.development_id,
        cd.development_name,
        cd.provider_original,
        cd.provider_homologado,
        cd.fecha_entrega_comprometida,
        cd.fecha_inicio_despliegue,
        COALESCE(cd.dias_desviacion, 0)::INTEGER,
        cd.estado_entrega,
        cd.total_entregas_desarrollo,
        cd.actividad_entrega_id,
        cd.actividad_despliegue_id
    FROM cumplimiento_detallado cd
    ORDER BY cd.development_id, cd.fecha_entrega_comprometida;
END;
$$;
