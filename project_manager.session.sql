SELECT 
  al.id,
  al.development_id,
  d.provider,
  d.name ,
  al.stage_id,
  ds.stage_code,
  ds.stage_name,
  dp.phase_name,
  al.activity_type,
  al.status,
  al.actor_type,
  al.start_date,
  al.end_date,
  al.next_follow_up_at,
  al.notes,
  al.dynamic_payload,
  al.created_by,
  al.created_at
FROM development_activity_log al
LEFT JOIN development_stages ds ON al.stage_id = ds.id
LEFT JOIN development_phases dp ON ds.phase_id = dp.id
LEFT JOIN developments d ON al.development_id = d.id
ORDER BY al.created_at DESC;


--@block
select * from developments;
--@block
select fn_kpi_calidad_primera_entrega();

--@block
SELECT 
    ds.id,
    ds.stage_code,
    ds.stage_name,
    dp.phase_name,
    COUNT(al.id) as total_actividades
FROM development_stages ds
LEFT JOIN development_phases dp ON ds.phase_id = dp.id
LEFT JOIN development_activity_log al ON ds.id = al.stage_id
GROUP BY ds.id, ds.stage_code, ds.stage_name, dp.phase_name
ORDER BY ds.stage_code;

--@block 
select * from development_stages;


--@block
-- Verificar el cambio
SELECT 
    id,
    stage_code,
    stage_name,
    stage_description,
    responsible_party
FROM development_stages 
WHERE stage_code = 10;

--@block
-- Crear stored procedure principal
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

--@block
-- Crear stored procedure de detalle
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

--@block
-- Probar el stored procedure
SELECT * FROM fn_kpi_calidad_primera_entrega();

--@block
-- Probar el stored procedure de detalle
SELECT * FROM fn_kpi_calidad_primera_entrega_detalle();

--@block
-- Actualizar la etapa 10 como "Devuelto"
UPDATE development_stages 
SET 
    stage_name = 'Devuelto',
    stage_description = 'Desarrollo devuelto por correcciones requeridas',
    responsible_party = 'proveedor'
WHERE id = 10;

--@block
-- Verificar el cambio en la etapa 10
SELECT 
    id,
    stage_code,
    stage_name,
    stage_description,
    responsible_party
FROM development_stages 
WHERE id = 10;

--@block 
select * from development_stages;

--@block
-- Verificar si hay actividades de etapa 10 (Devuelto)
SELECT 
    al.id,
    al.development_id,
    al.stage_id,
    ds.stage_code,
    ds.stage_name,
    al.status,
    al.created_at,
    al.dynamic_payload
FROM development_activity_log al
INNER JOIN development_stages ds ON al.stage_id = ds.id
WHERE ds.stage_code = '10'
ORDER BY al.created_at DESC;

--@block
-- Verificar todas las actividades de etapa 5 (entregas)
SELECT 
    al.id,
    al.development_id,
    al.stage_id,
    ds.stage_code,
    ds.stage_name,
    al.status,
    al.created_at
FROM development_activity_log al
INNER JOIN development_stages ds ON al.stage_id = ds.id
WHERE ds.stage_code = '5' AND al.status = 'completada'
ORDER BY al.created_at DESC;

--@block
-- Probar el stored procedure de detalle
SELECT * FROM fn_kpi_calidad_primera_entrega_detalle();

--@block
-- Crear una actividad de devolución de prueba para un desarrollo existente
-- Primero, vamos a ver qué desarrollos tienen entregas (etapa 5)
SELECT DISTINCT 
    al.development_id,
    d.name as development_name,
    d.provider
FROM development_activity_log al
INNER JOIN development_stages ds ON al.stage_id = ds.id
INNER JOIN developments d ON al.development_id = d.id
WHERE ds.stage_code = '5' AND al.status = 'completada'
ORDER BY al.created_at DESC
LIMIT 3;

--@block
-- Crear una actividad de devolución de prueba
-- Reemplaza 'DESARROLLO_ID_AQUI' con un development_id real de la consulta anterior
INSERT INTO development_activity_log (
    development_id,
    stage_id,
    activity_type,
    start_date,
    end_date,
    status,
    actor_type,
    notes,
    dynamic_payload,
    created_by,
    created_at
) VALUES (
    'INC000004486849',  -- Reemplaza con un development_id real
    (SELECT id FROM development_stages WHERE stage_code = '10'),  -- Etapa "Devuelto"
    'nueva_actividad',
    CURRENT_DATE,
    CURRENT_DATE,
    'completada',
    'equipo_interno',
    'Actividad de devolución de prueba para validar el KPI',
    '{"installer_number": "INST-TEST-001", "failure_description": "Error de prueba para validar devoluciones"}',
    'sistema',
    NOW()
);

--@block
-- Verificar que se creó la actividad de devolución
SELECT 
    al.id,
    al.development_id,
    al.stage_id,
    ds.stage_code,
    ds.stage_name,
    al.status,
    al.created_at,
    al.dynamic_payload
FROM development_activity_log al
INNER JOIN development_stages ds ON al.stage_id = ds.id
WHERE ds.stage_code = '10' AND al.development_id = 'INC000004486849'
ORDER BY al.created_at DESC;

--@block
-- Probar nuevamente el stored procedure de detalle
SELECT * FROM fn_kpi_calidad_primera_entrega_detalle();

--@block
-- CORREGIR EL STORED PROCEDURE - El problema está en la comparación
-- CORRECCIÓN: Comparar por ID de la tabla, no por fecha (como especificó el usuario)

-- Crear la versión corregida del stored procedure de detalle
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
        -- CORRECCIÓN: Comparar por ID de la tabla (actividad_devolucion_id > actividad_entrega_id)
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
                WHEN d.development_id IS NOT NULL AND d.actividad_devolucion_id > eb.actividad_entrega_id THEN 'CON DEVOLUCIONES'::CHARACTER VARYING
                ELSE 'SIN DEVOLUCIONES'::CHARACTER VARYING
            END as estado_calidad
        FROM entregas_base eb
        LEFT JOIN devoluciones d ON eb.development_id = d.development_id
            AND d.actividad_devolucion_id > eb.actividad_entrega_id  -- CORRECCIÓN: Comparar por ID
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

--@block
-- CORREGIR TAMBIÉN EL STORED PROCEDURE PRINCIPAL
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
            al.created_at::DATE as fecha_entrega
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
            al.created_at::DATE as fecha_devolucion
        FROM development_activity_log al
        INNER JOIN development_stages ds ON al.stage_id = ds.id
        WHERE ds.stage_code = '10' -- Etapa "Devuelto"
            AND al.status = 'completada'
            AND al.created_at::DATE >= COALESCE(p_period_start, (NOW() - INTERVAL '90 days')::DATE)
            AND al.created_at::DATE <= COALESCE(p_period_end, NOW()::DATE)
    ),
    entregas_clasificadas AS (
        -- Clasificar entregas según si tienen devoluciones o no
        -- CORRECCIÓN: Comparar por ID de la tabla (actividad_devolucion_id > actividad_entrega_id)
        SELECT 
            eb.development_id,
            eb.development_name,
            eb.provider_homologado,
            eb.provider_original,
            eb.actividad_entrega_id,
            eb.fecha_entrega,
            CASE 
                WHEN d.development_id IS NOT NULL AND d.actividad_devolucion_id > eb.actividad_entrega_id THEN 'CON_DEVOLUCIONES'
                ELSE 'SIN_DEVOLUCIONES'
            END as tipo_entrega
        FROM entregas_base eb
        LEFT JOIN devoluciones d ON eb.development_id = d.development_id
            AND d.actividad_devolucion_id > eb.actividad_entrega_id  -- CORRECCIÓN: Comparar por ID
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

--@block
-- Probar ambos stored procedures corregidos
SELECT * FROM fn_kpi_calidad_primera_entrega();
SELECT * FROM fn_kpi_calidad_primera_entrega_detalle();