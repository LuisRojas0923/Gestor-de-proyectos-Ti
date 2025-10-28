-- Consulta mejorada con JOIN a development_stages
SELECT 
    d.id as desarrollo_id,
    d.name as nombre_desarrollo,
    d.provider as proveedor,
    dal.activity_type as tipo_actividad,
    dal.start_date as fecha_inicio_actividad,
    dal.end_date as fecha_fin_actividad,
    dal.status as estado_actividad,
    dal.actor_type as tipo_actor,
    dal.notes as notas_actividad,
    ds.stage_name as nombre_etapa
FROM developments d
LEFT JOIN (
    SELECT * FROM development_activity_log 
    WHERE id IN (
        SELECT MAX(id) 
        FROM development_activity_log 
        GROUP BY development_id
    )
) dal ON d.id = dal.development_id
LEFT JOIN development_stages ds ON dal.stage_id = ds.id
WHERE d.general_status IN ('En curso', 'Pendiente')
  AND d.responsible = 'Luis Enrique Rojas Villota'
ORDER BY d.id;
