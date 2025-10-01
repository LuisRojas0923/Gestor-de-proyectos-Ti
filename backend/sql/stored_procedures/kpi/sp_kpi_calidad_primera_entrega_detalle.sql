-- =====================================================
-- STORED PROCEDURE: fn_kpi_calidad_primera_entrega_detalle
-- =====================================================
-- Descripción: Obtiene el detalle de los cálculos del KPI de calidad en primera entrega
--              Incluye nombre del desarrollo, fechas, proveedor y estado de calidad
-- =====================================================

CREATE OR REPLACE FUNCTION fn_kpi_calidad_primera_entrega_detalle(
    p_provider VARCHAR(255) DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    development_id CHARACTER VARYING,
    development_name CHARACTER VARYING,
    provider_original CHARACTER VARYING,
    provider_homologado CHARACTER VARYING,
    fecha_entrega DATE,
    fecha_devolucion DATE,
    estado_calidad CHARACTER VARYING,
    actividad_entrega_id INTEGER,
    actividad_devolucion_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_period_start DATE := COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE);
    v_current_period_end DATE := COALESCE(p_period_end, NOW()::DATE);
BEGIN
    RETURN QUERY
    WITH entregas_base AS (
        -- Identificar todas las entregas (actividades de etapa 5 completadas)
        SELECT 
            al.development_id,
            d.name as development_name,
            d.provider as provider_original,
            CASE 
                -- Homologaciones específicas de proveedores
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
            al.id as actividad_entrega_id,
            al.created_at::DATE as fecha_entrega
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        INNER JOIN developments d ON al.development_id = d.id
        WHERE ds.stage_code = '5' 
            AND al.status = 'completada'
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
    devoluciones AS (
        -- Identificar desarrollos que tienen actividades de devolución (etapa 10)
        SELECT 
            al.development_id,
            al.id as actividad_devolucion_id,
            al.created_at::DATE as fecha_devolucion
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code = '10' -- Etapa "Devuelto"
            AND al.status = 'completada'
            AND al.created_at::DATE >= v_current_period_start
            AND al.created_at::DATE <= v_current_period_end
    ),
    entregas_detalladas AS (
        -- Clasificar entregas según si tienen devoluciones o no
        SELECT 
            eb.development_id,
            eb.development_name,
            eb.provider_original,
            eb.provider_homologado,
            eb.actividad_entrega_id,
            eb.fecha_entrega,
            d.actividad_devolucion_id,
            d.fecha_devolucion,
            CASE 
                WHEN d.development_id IS NOT NULL THEN 'CON DEVOLUCIONES'::CHARACTER VARYING
                ELSE 'SIN DEVOLUCIONES'::CHARACTER VARYING
            END as estado_calidad
        FROM entregas_base eb
        LEFT JOIN devoluciones d ON eb.development_id = d.development_id
            AND d.fecha_devolucion > eb.fecha_entrega
    )
    SELECT 
        ed.development_id,
        ed.development_name,
        ed.provider_original,
        ed.provider_homologado,
        ed.fecha_entrega,
        ed.fecha_devolucion,
        ed.estado_calidad,
        ed.actividad_entrega_id,
        ed.actividad_devolucion_id
    FROM entregas_detalladas ed
    ORDER BY ed.development_id, ed.fecha_entrega;
END;
$$;
