-- =====================================================
-- STORED PROCEDURE: fn_kpi_cumplimiento_fechas_global_completo_detalle
-- =====================================================
-- Descripción: Obtiene el detalle de los cálculos del KPI de cumplimiento de fechas GLOBAL
--              Combinando análisis (fase 2), propuesta (fase 3) y desarrollo (fase 5)
--              Incluye nombre del desarrollo para identificación
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_cumplimiento_fechas_global_completo_detalle(
    p_provider VARCHAR(255) DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    development_id CHARACTER VARYING,
    development_name CHARACTER VARYING,
    provider_original CHARACTER VARYING,
    provider_homologado CHARACTER VARYING,
    fase CHARACTER VARYING,
    fecha_comprometida DATE,
    fecha_real DATE,
    dias_desviacion INTEGER,
    estado_entrega CHARACTER VARYING,
    total_entregas_fase BIGINT,
    actividad_id INTEGER,
    siguiente_actividad_id INTEGER
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
            al.end_date as fecha_comprometida,
            al.created_at as fecha_actividad,
            COUNT(*) OVER (PARTITION BY al.development_id) as total_entregas_fase,
            'Análisis (Fase 2)'::CHARACTER VARYING as fase
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
    entregas_propuesta AS (
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
            al.end_date as fecha_comprometida,
            al.created_at as fecha_actividad,
            COUNT(*) OVER (PARTITION BY al.development_id) as total_entregas_fase,
            'Propuesta (Fase 3)'::CHARACTER VARYING as fase
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
    entregas_desarrollo AS (
        -- Actividades de desarrollo (fase 5) completadas
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
            al.end_date as fecha_comprometida,
            al.created_at as fecha_actividad,
            COUNT(*) OVER (PARTITION BY al.development_id) as total_entregas_fase,
            'Desarrollo (Fase 5)'::CHARACTER VARYING as fase
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
    siguiente_fase AS (
        -- Actividades de la siguiente fase para cada desarrollo
        SELECT 
            al.development_id,
            CASE 
                WHEN ds.stage_code = '2' THEN 'Propuesta (Fase 3)'::CHARACTER VARYING
                WHEN ds.stage_code = '3' THEN 'Aprobación (Fase 4)'::CHARACTER VARYING
                WHEN ds.stage_code = '5' THEN 'Despliegue (Fase 6)'::CHARACTER VARYING
                ELSE 'Siguiente Fase'::CHARACTER VARYING
            END as siguiente_fase,
            al.start_date as fecha_real,
            al.id as actividad_id
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code IN ('3', '4', '6')
            AND al.status = 'completada'
            AND al.start_date IS NOT NULL
    ),
    todas_entregas AS (
        -- Unir todas las entregas
        SELECT * FROM entregas_analisis
        UNION ALL
        SELECT * FROM entregas_propuesta
        UNION ALL
        SELECT * FROM entregas_desarrollo
    ),
    cumplimiento_detallado AS (
        SELECT 
            te.development_id,
            te.development_name,
            te.provider_original,
            te.provider_homologado,
            te.fase,
            te.fecha_comprometida,
            sf.fecha_real,
            te.total_entregas_fase,
            te.actividad_id,
            sf.actividad_id as siguiente_actividad_id,
            CASE 
                WHEN te.total_entregas_fase > 1 THEN 'INCUMPLIMIENTO (múltiples entregas)'::CHARACTER VARYING
                WHEN sf.fecha_real IS NOT NULL AND te.fecha_comprometida IS NOT NULL 
                     AND sf.fecha_real <= te.fecha_comprometida THEN 'A TIEMPO'::CHARACTER VARYING
                WHEN sf.fecha_real IS NOT NULL AND te.fecha_comprometida IS NOT NULL 
                     AND sf.fecha_real > te.fecha_comprometida THEN 'TARDÍO'::CHARACTER VARYING
                ELSE 'SIN SIGUIENTE FASE'::CHARACTER VARYING
            END as estado_entrega,
            CASE 
                WHEN sf.fecha_real IS NOT NULL AND te.fecha_comprometida IS NOT NULL 
                THEN sf.fecha_real - te.fecha_comprometida
                ELSE NULL
            END as dias_desviacion
        FROM todas_entregas te
        LEFT JOIN siguiente_fase sf ON te.development_id = sf.development_id
            AND sf.siguiente_fase = CASE 
                WHEN te.fase = 'Análisis (Fase 2)' THEN 'Propuesta (Fase 3)'::CHARACTER VARYING
                WHEN te.fase = 'Propuesta (Fase 3)' THEN 'Aprobación (Fase 4)'::CHARACTER VARYING
                WHEN te.fase = 'Desarrollo (Fase 5)' THEN 'Despliegue (Fase 6)'::CHARACTER VARYING
                ELSE NULL::CHARACTER VARYING
            END
    )
    SELECT 
        cd.development_id,
        cd.development_name,
        cd.provider_original,
        cd.provider_homologado,
        cd.fase,
        cd.fecha_comprometida,
        cd.fecha_real,
        COALESCE(cd.dias_desviacion, 0)::INTEGER,
        cd.estado_entrega,
        cd.total_entregas_fase,
        cd.actividad_id,
        cd.siguiente_actividad_id
    FROM cumplimiento_detallado cd
    ORDER BY cd.development_id, cd.fase, cd.fecha_comprometida;
END;
$$;
