-- Actualizar el stored procedure informe_remey con el JOIN a development_stages
CREATE OR REPLACE FUNCTION informe_remey()
RETURNS TABLE (
    desarrollo_id VARCHAR(50),
    nombre_desarrollo VARCHAR(255),
    proveedor VARCHAR(100),
    tipo_actividad VARCHAR(100),
    fecha_inicio_actividad DATE,
    fecha_fin_actividad DATE,
    estado_actividad VARCHAR(50),
    tipo_actor VARCHAR(50),
    notas_actividad TEXT,
    nombre_etapa VARCHAR(255)
) 
LANGUAGE plpgsql
AS $func$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as desarrollo_id,
        d.name as nombre_desarrollo,
        ds.stage_name as nombre_etapa,
        d.provider as proveedor,
        dal.activity_type as tipo_actividad,
        dal.start_date as fecha_inicio_actividad,
        dal.end_date as fecha_fin_actividad,
        dal.status as estado_actividad,
        dal.actor_type as tipo_actor,
        dal.notes as notas_actividad
        
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
END;
$func$;
