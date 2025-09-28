-- =====================================================
-- STORED PROCEDURE: fn_kpi_cumplimiento_fechas_propuesta
-- =====================================================
-- Descripción: Calcula el KPI de cumplimiento de fechas de propuesta
--              Entregas de propuesta a tiempo ÷ Entregas de propuesta programadas × 100%
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_cumplimiento_fechas_propuesta(
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
    WITH entregas_propuesta AS (
        -- Identificar la primera actividad de fase 3 completada para cada desarrollo
        SELECT
            al.development_id,
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
            END AS provider_homologado,
            al.end_date AS fecha_propuesta_comprometida,
            al.start_date AS fecha_inicio_propuesta,
            al.created_at AS fecha_actividad_propuesta,
            ROW_NUMBER() OVER (PARTITION BY al.development_id ORDER BY al.created_at) as rn
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
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
    aprobaciones AS (
        -- Identificar la primera actividad de fase 4 para cada desarrollo
        SELECT
            al.development_id,
            al.start_date AS fecha_inicio_aprobacion,
            al.created_at AS fecha_actividad_aprobacion,
            ROW_NUMBER() OVER (PARTITION BY al.development_id ORDER BY al.created_at) as rn
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code = '4'
            AND al.status = 'completada'
            AND al.start_date IS NOT NULL
    ),
    cumplimiento_calculado AS (
        SELECT
            ep.development_id,
            ep.provider_homologado,
            ep.fecha_propuesta_comprometida,
            ep.fecha_inicio_propuesta,
            a.fecha_inicio_aprobacion,
            CASE
                WHEN a.fecha_inicio_aprobacion IS NOT NULL AND a.fecha_inicio_aprobacion <= ep.fecha_propuesta_comprometida THEN 1
                ELSE 0
            END AS cumplio_flag,
            -- Contar si hay más de una actividad de fase 3 completada para el mismo desarrollo
            (SELECT COUNT(*) FROM entregas_propuesta ep2 WHERE ep2.development_id = ep.development_id) AS total_entregas_propuesta
        FROM entregas_propuesta ep
        LEFT JOIN aprobaciones a ON ep.development_id = a.development_id
            AND a.rn = 1 -- Considerar solo la primera aprobación
        WHERE ep.rn = 1 -- Considerar solo la primera propuesta original
    )
    SELECT
        COUNT(DISTINCT cc.development_id)::BIGINT AS total_entregas,
        SUM(CASE WHEN cc.cumplio_flag = 1 AND cc.total_entregas_propuesta = 1 THEN 1 ELSE 0 END)::BIGINT AS entregas_a_tiempo,
        SUM(CASE WHEN cc.cumplio_flag = 0 OR cc.total_entregas_propuesta > 1 THEN 1 ELSE 0 END)::BIGINT AS entregas_tardias,
        CASE
            WHEN COUNT(DISTINCT cc.development_id) > 0 THEN ROUND((SUM(CASE WHEN cc.cumplio_flag = 1 AND cc.total_entregas_propuesta = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT cc.development_id)), 2)
            ELSE 0.00
        END::NUMERIC(5,2),
        p_provider,
        v_current_period_start,
        v_current_period_end,
        NOW()
    INTO total_entregas, entregas_a_tiempo, entregas_tardias, porcentaje_cumplimiento, provider_filter, period_start, period_end, calculated_at
    FROM cumplimiento_calculado cc;

    RETURN QUERY SELECT total_entregas, entregas_a_tiempo, entregas_tardias, porcentaje_cumplimiento, p_provider, v_current_period_start, v_current_period_end, NOW();
END;
$$;
