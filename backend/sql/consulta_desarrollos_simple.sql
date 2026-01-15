-- Consulta simplificada para desarrollos con información básica
-- (Sin actividad porque no hay datos en activity_logs)

SELECT 
    d.id as desarrollo_id,
    d.name as nombre_desarrollo,
    d.general_status as estado_general,
    d.provider as proveedor,
    dp.phase_name as fase_actual,
    ds.stage_name as etapa_actual,
    ds.stage_code as codigo_etapa,
    d.created_at as fecha_creacion,
    d.updated_at as fecha_actualizacion,
    'Sin actividad registrada' as ultima_actividad,
    'N/A' as fecha_ultima_actividad,
    'N/A' as categoria_actividad,
    'N/A' as usuario_actividad
FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
ORDER BY d.id
LIMIT 10;

-- Insertar algunos datos de prueba en activity_logs
INSERT INTO activity_logs (development_id, date, description, category, user_id, created_at)
VALUES 
    ('INC000004787482', NOW(), 'Desarrollo iniciado', 'inicio', 'sistema', NOW()),
    ('INC000004787482', NOW() - INTERVAL '1 day', 'Revisión de requerimientos', 'revision', 'usuario1', NOW()),
    ('INC000004900455', NOW(), 'Análisis técnico completado', 'analisis', 'usuario2', NOW()),
    ('INC000004816080', NOW() - INTERVAL '2 days', 'Desarrollo finalizado', 'desarrollo', 'usuario3', NOW()),
    ('INC000004782806', NOW() - INTERVAL '1 hour', 'Pruebas en progreso', 'pruebas', 'usuario4', NOW());

-- Consulta con datos de prueba
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
ORDER BY d.id
LIMIT 10;
