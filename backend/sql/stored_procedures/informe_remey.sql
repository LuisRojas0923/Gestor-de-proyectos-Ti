-- Stored Procedure: informe_remey
-- Descripción: Obtiene desarrollos con su última actividad filtrados por estado y responsable
-- Autor: Sistema de Gestión de Proyectos TI
-- Fecha: 2025-10-20

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
    notas_actividad TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as desarrollo_id,
        d.name as nombre_desarrollo,
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
    WHERE d.general_status IN ('En curso', 'Pendiente')
      AND d.responsible = 'Luis Enrique Rojas Villota'
    ORDER BY d.id;
END;
$$;

-- Comentarios sobre el SP:
-- - Filtra desarrollos con estado 'En curso' o 'Pendiente'
-- - Filtra por responsable 'Luis Enrique Rojas Villota'
-- - Incluye la última actividad de cada desarrollo
-- - Retorna información estructurada para reportes

-- Ejemplo de uso:
-- SELECT * FROM informe_remey();
