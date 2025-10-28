-- Consulta para obtener desarrollos con su última actividad
-- Combina la tabla de desarrollos con la última actividad de la bitácora

SELECT 
    d.id as desarrollo_id,
    d.name as nombre_desarrollo,
    d.general_status as estado_general,
    d.provider as proveedor,
    dp.phase_name as fase_actual,
    ds.stage_name as etapa_actual,
    ds.stage_code as codigo_etapa,
    -- Última actividad de development_activity_log
    dal.activity_type as tipo_actividad,
    dal.start_date as fecha_inicio_actividad,
    dal.end_date as fecha_fin_actividad,
    dal.status as estado_actividad,
    dal.actor_type as tipo_actor,
    dal.notes as notas_actividad,
    dal.created_at as fecha_creacion_actividad,
    -- Última actividad de activity_logs (bitácora general)
    al.description as descripcion_bitacora,
    al.date as fecha_bitacora,
    al.category as categoria_bitacora,
    al.user_id as usuario_bitacora,
    al.created_at as fecha_creacion_bitacora
FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
-- Última actividad de development_activity_log
LEFT JOIN LATERAL (
    SELECT 
        dal.activity_type,
        dal.start_date,
        dal.end_date,
        dal.status,
        dal.actor_type,
        dal.notes,
        dal.created_at
    FROM development_activity_log dal
    WHERE dal.development_id = d.id
    ORDER BY dal.created_at DESC
    LIMIT 1
) dal ON true
-- Última actividad de activity_logs (bitácora general)
LEFT JOIN LATERAL (
    SELECT 
        al.description,
        al.date,
        al.category,
        al.user_id,
        al.created_at
    FROM activity_logs al
    WHERE al.development_id = d.id
    ORDER BY al.created_at DESC
    LIMIT 1
) al ON true
ORDER BY d.id;

-- Consulta alternativa más simple (solo con activity_logs)
SELECT 
    d.id as desarrollo_id,
    d.name as nombre_desarrollo,
    d.general_status as estado_general,
    d.provider as proveedor,
    dp.phase_name as fase_actual,
    ds.stage_name as etapa_actual,
    al.description as ultima_actividad,
    al.date as fecha_ultima_actividad,
    al.category as categoria_actividad,
    al.user_id as usuario_actividad
FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
LEFT JOIN activity_logs al ON d.id = al.development_id
WHERE al.id IN (
    SELECT MAX(id) 
    FROM activity_logs 
    WHERE development_id = d.id
)
ORDER BY d.id;

-- Consulta con ambas actividades (la más completa)
SELECT 
    d.id as desarrollo_id,
    d.name as nombre_desarrollo,
    d.general_status as estado_general,
    d.provider as proveedor,
    dp.phase_name as fase_actual,
    ds.stage_name as etapa_actual,
    -- Última actividad de development_activity_log
    COALESCE(dal.activity_type, 'Sin actividad específica') as tipo_actividad_especifica,
    COALESCE(dal.start_date::text, 'N/A') as fecha_inicio_actividad,
    COALESCE(dal.status, 'N/A') as estado_actividad_especifica,
    COALESCE(dal.notes, 'Sin notas') as notas_actividad_especifica,
    -- Última actividad de activity_logs
    COALESCE(al.description, 'Sin actividad en bitácora') as ultima_actividad_bitacora,
    COALESCE(al.date::text, 'N/A') as fecha_ultima_actividad_bitacora,
    COALESCE(al.category, 'N/A') as categoria_actividad_bitacora,
    COALESCE(al.user_id, 'N/A') as usuario_ultima_actividad
FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
-- Última actividad específica
LEFT JOIN LATERAL (
    SELECT 
        dal.activity_type,
        dal.start_date,
        dal.status,
        dal.notes
    FROM development_activity_log dal
    WHERE dal.development_id = d.id
    ORDER BY dal.created_at DESC
    LIMIT 1
) dal ON true
-- Última actividad de bitácora
LEFT JOIN LATERAL (
    SELECT 
        al.description,
        al.date,
        al.category,
        al.user_id
    FROM activity_logs al
    WHERE al.development_id = d.id
    ORDER BY al.created_at DESC
    LIMIT 1
) al ON true
ORDER BY d.id;
