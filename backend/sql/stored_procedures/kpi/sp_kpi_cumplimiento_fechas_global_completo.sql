-- =====================================================
-- STORED PROCEDURE: fn_kpi_cumplimiento_fechas_global_completo
-- =====================================================
-- Descripción: Calcula el KPI de cumplimiento de fechas GLOBAL
--              Combinando análisis (fase 2), propuesta (fase 3) y desarrollo (fase 5)
--              Entregas a tiempo ÷ Entregas totales × 100%
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_cumplimiento_fechas_global_completo(
    p_provider VARCHAR(255) DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    total_entregas BIGINT,
    entregas_a_tiempo BIGINT,
    entregas_tardias BIGINT,
    porcentaje_cumplimiento NUMERIC(5,2),
    provider_filter VARCHAR(255),
    period_start DATE,
    period_end DATE,
    calculated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_entregas BIGINT;
    v_entregas_a_tiempo BIGINT;
    v_porcentaje_cumplimiento NUMERIC(5,2);
    v_current_period_start DATE := COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE);
    v_current_period_end DATE := COALESCE(p_period_end, NOW()::DATE);
BEGIN
    WITH cumplimiento_analisis AS (
        -- KPI de análisis (fase 2)
        SELECT 
            COUNT(DISTINCT al.development_id)::BIGINT AS total_entregas,
            SUM(CASE 
                WHEN dp.fecha_inicio_propuesta IS NOT NULL 
                     AND al.end_date IS NOT NULL 
                     AND dp.fecha_inicio_propuesta <= al.end_date THEN 1 
                ELSE 0 
            END)::BIGINT AS entregas_a_tiempo,
            SUM(CASE 
                WHEN dp.fecha_inicio_propuesta IS NOT NULL 
                     AND al.end_date IS NOT NULL 
                     AND dp.fecha_inicio_propuesta > al.end_date THEN 1 
                WHEN (SELECT COUNT(*) FROM development_activity_log al2 
                      INNER JOIN development_stages ds2 ON al2.stage_id = ds2.id 
                      WHERE al2.development_id = al.development_id 
                        AND ds2.stage_code = '2' 
                        AND al2.status = 'completada') > 1 THEN 1
                ELSE 0 
            END)::BIGINT AS entregas_tardias
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        LEFT JOIN (
            SELECT 
                al3.development_id,
                MIN(al3.start_date) AS fecha_inicio_propuesta
            FROM development_activity_log al3
            INNER JOIN development_stages ds3 ON al3.stage_id = ds3.id
            WHERE ds3.stage_code = '3' 
                AND al3.status = 'completada'
                AND al3.start_date IS NOT NULL
            GROUP BY al3.development_id
        ) dp ON al.development_id = dp.development_id
        WHERE ds.stage_code = '2' 
            AND al.status = 'completada'
            AND al.end_date IS NOT NULL
            AND (al.created_at::DATE >= v_current_period_start)
            AND (al.created_at::DATE <= v_current_period_end)
            AND (p_provider IS NULL OR (
                CASE 
                    WHEN LOWER(d.provider) LIKE '%ingesoft%' THEN 'Ingesoft'
                    WHEN LOWER(d.provider) LIKE '%oracle%' THEN 'ORACLE'
                    WHEN LOWER(d.provider) LIKE '%itc%' THEN 'ITC'
                    WHEN LOWER(d.provider) LIKE '%interno%' OR LOWER(d.provider) LIKE '%ti interno%' THEN 'TI Interno'
                    WHEN LOWER(d.provider) LIKE '%coomeva%' THEN 'Coomeva'
                    WHEN LOWER(d.provider) LIKE '%softtek%' THEN 'Softtek'
                    WHEN LOWER(d.provider) LIKE '%accenture%' THEN 'Accenture'
                    WHEN LOWER(d.provider) LIKE '%microsoft%' THEN 'Microsoft'
                    WHEN LOWER(d.provider) LIKE '%ibm%' THEN 'IBM'
                    WHEN LOWER(d.provider) LIKE '%sap%' THEN 'SAP'
                    WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'
                    ELSE TRIM(d.provider)
                END = p_provider
            ))
    ),
    cumplimiento_propuesta AS (
        -- KPI de propuesta (fase 3)
        SELECT 
            COUNT(DISTINCT al.development_id)::BIGINT AS total_entregas,
            SUM(CASE 
                WHEN da.fecha_inicio_aprobacion IS NOT NULL 
                     AND al.end_date IS NOT NULL 
                     AND da.fecha_inicio_aprobacion <= al.end_date THEN 1 
                ELSE 0 
            END)::BIGINT AS entregas_a_tiempo,
            SUM(CASE 
                WHEN da.fecha_inicio_aprobacion IS NOT NULL 
                     AND al.end_date IS NOT NULL 
                     AND da.fecha_inicio_aprobacion > al.end_date THEN 1 
                WHEN (SELECT COUNT(*) FROM development_activity_log al2 
                      INNER JOIN development_stages ds2 ON al2.stage_id = ds2.id 
                      WHERE al2.development_id = al.development_id 
                        AND ds2.stage_code = '3' 
                        AND al2.status = 'completada') > 1 THEN 1
                ELSE 0 
            END)::BIGINT AS entregas_tardias
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        LEFT JOIN (
            SELECT 
                al3.development_id,
                MIN(al3.start_date) AS fecha_inicio_aprobacion
            FROM development_activity_log al3
            INNER JOIN development_stages ds3 ON al3.stage_id = ds3.id
            WHERE ds3.stage_code = '4' 
                AND al3.status = 'completada'
                AND al3.start_date IS NOT NULL
            GROUP BY al3.development_id
        ) da ON al.development_id = da.development_id
        WHERE ds.stage_code = '3' 
            AND al.status = 'completada'
            AND al.end_date IS NOT NULL
            AND (al.created_at::DATE >= v_current_period_start)
            AND (al.created_at::DATE <= v_current_period_end)
            AND (p_provider IS NULL OR (
                CASE 
                    WHEN LOWER(d.provider) LIKE '%ingesoft%' THEN 'Ingesoft'
                    WHEN LOWER(d.provider) LIKE '%oracle%' THEN 'ORACLE'
                    WHEN LOWER(d.provider) LIKE '%itc%' THEN 'ITC'
                    WHEN LOWER(d.provider) LIKE '%interno%' OR LOWER(d.provider) LIKE '%ti interno%' THEN 'TI Interno'
                    WHEN LOWER(d.provider) LIKE '%coomeva%' THEN 'Coomeva'
                    WHEN LOWER(d.provider) LIKE '%softtek%' THEN 'Softtek'
                    WHEN LOWER(d.provider) LIKE '%accenture%' THEN 'Accenture'
                    WHEN LOWER(d.provider) LIKE '%microsoft%' THEN 'Microsoft'
                    WHEN LOWER(d.provider) LIKE '%ibm%' THEN 'IBM'
                    WHEN LOWER(d.provider) LIKE '%sap%' THEN 'SAP'
                    WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'
                    ELSE TRIM(d.provider)
                END = p_provider
            ))
    ),
    cumplimiento_desarrollo AS (
        -- KPI de desarrollo (fase 5)
        SELECT 
            COUNT(DISTINCT al.development_id)::BIGINT AS total_entregas,
            SUM(CASE 
                WHEN dd.fecha_inicio_despliegue IS NOT NULL 
                     AND al.end_date IS NOT NULL 
                     AND dd.fecha_inicio_despliegue <= al.end_date THEN 1 
                ELSE 0 
            END)::BIGINT AS entregas_a_tiempo,
            SUM(CASE 
                WHEN dd.fecha_inicio_despliegue IS NOT NULL 
                     AND al.end_date IS NOT NULL 
                     AND dd.fecha_inicio_despliegue > al.end_date THEN 1 
                WHEN (SELECT COUNT(*) FROM development_activity_log al2 
                      INNER JOIN development_stages ds2 ON al2.stage_id = ds2.id 
                      WHERE al2.development_id = al.development_id 
                        AND ds2.stage_code = '5' 
                        AND al2.status = 'completada') > 1 THEN 1
                ELSE 0 
            END)::BIGINT AS entregas_tardias
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        LEFT JOIN (
            SELECT 
                al3.development_id,
                MIN(al3.start_date) AS fecha_inicio_despliegue
            FROM development_activity_log al3
            INNER JOIN development_stages ds3 ON al3.stage_id = ds3.id
            WHERE ds3.stage_code = '6' 
                AND al3.status = 'completada'
                AND al3.start_date IS NOT NULL
            GROUP BY al3.development_id
        ) dd ON al.development_id = dd.development_id
        WHERE ds.stage_code = '5' 
            AND al.status = 'completada'
            AND al.end_date IS NOT NULL
            AND (al.created_at::DATE >= v_current_period_start)
            AND (al.created_at::DATE <= v_current_period_end)
            AND (p_provider IS NULL OR (
                CASE 
                    WHEN LOWER(d.provider) LIKE '%ingesoft%' THEN 'Ingesoft'
                    WHEN LOWER(d.provider) LIKE '%oracle%' THEN 'ORACLE'
                    WHEN LOWER(d.provider) LIKE '%itc%' THEN 'ITC'
                    WHEN LOWER(d.provider) LIKE '%interno%' OR LOWER(d.provider) LIKE '%ti interno%' THEN 'TI Interno'
                    WHEN LOWER(d.provider) LIKE '%coomeva%' THEN 'Coomeva'
                    WHEN LOWER(d.provider) LIKE '%softtek%' THEN 'Softtek'
                    WHEN LOWER(d.provider) LIKE '%accenture%' THEN 'Accenture'
                    WHEN LOWER(d.provider) LIKE '%microsoft%' THEN 'Microsoft'
                    WHEN LOWER(d.provider) LIKE '%ibm%' THEN 'IBM'
                    WHEN LOWER(d.provider) LIKE '%sap%' THEN 'SAP'
                    WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'
                    ELSE TRIM(d.provider)
                END = p_provider
            ))
    ),
    consolidado_global AS (
        -- Consolidar todos los KPIs
        SELECT 
            (ca.total_entregas + cp.total_entregas + cd.total_entregas) AS total_entregas,
            (ca.entregas_a_tiempo + cp.entregas_a_tiempo + cd.entregas_a_tiempo) AS entregas_a_tiempo,
            (ca.entregas_tardias + cp.entregas_tardias + cd.entregas_tardias) AS entregas_tardias
        FROM cumplimiento_analisis ca
        CROSS JOIN cumplimiento_propuesta cp
        CROSS JOIN cumplimiento_desarrollo cd
    )
    SELECT 
        cg.total_entregas,
        cg.entregas_a_tiempo,
        cg.entregas_tardias,
        CASE
            WHEN cg.total_entregas > 0 THEN ROUND((cg.entregas_a_tiempo * 100.0 / cg.total_entregas), 2)
            ELSE 0.00
        END::NUMERIC(5,2),
        p_provider,
        v_current_period_start,
        v_current_period_end,
        NOW()
    INTO total_entregas, entregas_a_tiempo, entregas_tardias, porcentaje_cumplimiento, provider_filter, period_start, period_end, calculated_at
    FROM consolidado_global cg;

    RETURN QUERY SELECT total_entregas, entregas_a_tiempo, entregas_tardias, porcentaje_cumplimiento, p_provider, v_current_period_start, v_current_period_end, NOW();
END;
$$;
