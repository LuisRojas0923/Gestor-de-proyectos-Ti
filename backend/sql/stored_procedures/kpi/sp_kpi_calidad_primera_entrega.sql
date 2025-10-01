-- =====================================================
-- STORED PROCEDURE: fn_kpi_calidad_primera_entrega
-- =====================================================
-- Descripción: Calcula el KPI de calidad en primera entrega
--              Entregas aprobadas sin devoluciones ÷ entregas totales × 100%
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_calidad_primera_entrega(
    p_provider VARCHAR(255) DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    total_entregas BIGINT,
    entregas_sin_devoluciones BIGINT,
    entregas_con_devoluciones BIGINT,
    porcentaje_calidad NUMERIC(5,2),
    provider_filter VARCHAR(255),
    period_start DATE,
    period_end DATE,
    calculated_at TIMESTAMP
)
LANGUAGE SQL
AS $$
    WITH entregas_base AS (
        -- Identificar todas las entregas (actividades de etapa 5 completadas)
        SELECT 
            al.development_id,
            d.name as development_name,
            CASE 
                -- Homologaciones específicas de proveedores
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
            d.provider as provider_original,
            al.id as actividad_entrega_id,
            al.created_at as fecha_entrega
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        WHERE ds.stage_code = '5' 
            AND al.status = 'completada'
            AND al.created_at::DATE >= COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE)
            AND al.created_at::DATE <= COALESCE(p_period_end, NOW()::DATE)
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
    devoluciones AS (
        -- Identificar desarrollos que tienen actividades de devolución (etapa 10)
        SELECT DISTINCT
            al.development_id,
            al.id as actividad_devolucion_id,
            al.created_at as fecha_devolucion
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code = '10' -- Etapa "Devuelto"
            AND al.status = 'completada'
            AND al.created_at::DATE >= COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE)
            AND al.created_at::DATE <= COALESCE(p_period_end, NOW()::DATE)
    ),
    entregas_clasificadas AS (
        -- Clasificar entregas según si tienen devoluciones o no
        SELECT 
            eb.development_id,
            eb.development_name,
            eb.provider_homologado,
            eb.provider_original,
            eb.actividad_entrega_id,
            eb.fecha_entrega,
            CASE 
                WHEN d.development_id IS NOT NULL THEN 'CON_DEVOLUCIONES'
                ELSE 'SIN_DEVOLUCIONES'
            END as tipo_entrega
        FROM entregas_base eb
        LEFT JOIN devoluciones d ON eb.development_id = d.development_id
            AND d.fecha_devolucion > eb.fecha_entrega
    ),
    metricas_calculadas AS (
        -- Calcular las métricas finales
        SELECT 
            COUNT(*) as total_entregas,
            COUNT(CASE WHEN tipo_entrega = 'SIN_DEVOLUCIONES' THEN 1 END) as entregas_sin_devoluciones,
            COUNT(CASE WHEN tipo_entrega = 'CON_DEVOLUCIONES' THEN 1 END) as entregas_con_devoluciones,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND(
                        (COUNT(CASE WHEN tipo_entrega = 'SIN_DEVOLUCIONES' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                        2
                    )
                ELSE 0
            END as porcentaje_calidad
        FROM entregas_clasificadas
    )
    SELECT 
        mc.total_entregas,
        mc.entregas_sin_devoluciones,
        mc.entregas_con_devoluciones,
        mc.porcentaje_calidad,
        p_provider as provider_filter,
        COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE) as period_start,
        COALESCE(p_period_end, NOW()::DATE) as period_end,
        NOW() as calculated_at
    FROM metricas_calculadas mc;
$$;
