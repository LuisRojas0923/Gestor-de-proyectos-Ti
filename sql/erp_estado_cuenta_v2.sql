/*
 * CONSULTA: Estado de Cuenta de Viáticos V2 (Detallado por Estados)
 * DESCRIPCIÓN: Desglosa los valores en 6 columnas según el estado (CONTABILIZADO, EN FIRME, PENDIENTE)
 * utilizando las tablas de detalle directamente para garantizar la captura de todos los estados.
 * BASE DE DATOS: solid
 */

-- Configuración de parámetros para ejecución manual
WITH params AS (
  SELECT
    '94041597'::text AS v_empleado,         -- Ejemplo: '94041597'-'1105613195'
    NULL::text AS v_nombreempleado,   -- Ejemplo: 'gladys'
    '2026-01-01'::date AS v_desde,    -- Fecha inicial
    '2026-12-31'::date AS v_hasta     -- Fecha final
),
-- Unificamos las fuentes de datos para asegurar que todos los estados sean visibles
movimientos AS (
    SELECT 
        codigo, 
        fechaaplicacion, 
        empleado, 
        nombreempleado, 
        codigoconsignacion AS radicado, 
        valor::numeric AS valor, 
        'CONSIGNACION' AS tipo, 
        UPPER(TRIM(estado)) AS estado_limpio, 
        observaciones 
    FROM consignacion
    
    UNION ALL
    
    SELECT 
        codigo, 
        fechaaplicacion, 
        empleado, 
        nombreempleado, 
        codigolegalizacion AS radicado, 
        valortotal::numeric AS valor, 
        'LEGALIZACION' AS tipo, 
        UPPER(TRIM(estado)) AS estado_limpio, 
        observaciones 
    FROM legalizacion
)
SELECT 
    m.codigo AS "CODIGO",
    m.fechaaplicacion::timestamp AS "FECHA APLICACION",
    m.empleado AS "CEDULA",
    m.nombreempleado AS "EMPLEADO",
    m.radicado AS "RADICADO",
    
    -- VALORES CONTABILIZADOS
    CASE WHEN m.tipo = 'CONSIGNACION' AND m.estado_limpio = 'CONTABILIZADO' THEN m.valor ELSE 0 END AS "VALOR CONSIGNACION CONTABILIZADO",
    CASE WHEN m.tipo = 'LEGALIZACION' AND m.estado_limpio = 'CONTABILIZADO' THEN m.valor ELSE 0 END AS "VALOR LEGALIZACION CONTABILIZADO",
    
    -- VALORES EN FIRME (FIRMADAS)
    CASE WHEN m.tipo = 'CONSIGNACION' AND m.estado_limpio = 'EN FIRME' THEN m.valor ELSE 0 END AS "VALOR CONSIGNACION FIRMADAS",
    CASE WHEN m.tipo = 'LEGALIZACION' AND m.estado_limpio = 'EN FIRME' THEN m.valor ELSE 0 END AS "VALOR LEGALIZACION FIRMADAS",
    
    -- VALORES PENDIENTES
    CASE WHEN m.tipo = 'CONSIGNACION' AND m.estado_limpio = 'PENDIENTE' THEN m.valor ELSE 0 END AS "VALOR CONSIGNACION PENDIENTES",
    CASE WHEN m.tipo = 'LEGALIZACION' AND m.estado_limpio = 'PENDIENTE' THEN m.valor ELSE 0 END AS "VALOR LEGALIZACION PENDIENTES",
    
    -- SALDO ACUMULADO (Suma todas las consignaciones (+) y resta todas las legalizaciones (-))
    SUM(
        CASE 
            WHEN m.tipo = 'CONSIGNACION' THEN m.valor
            WHEN m.tipo = 'LEGALIZACION' THEN -m.valor
            ELSE 0
        END
    ) OVER (
        PARTITION BY m.empleado
        ORDER BY m.fechaaplicacion::timestamp ASC, m.codigo ASC
    ) AS "SALDO",
    
    m.observaciones AS "OBSERVACIONES"
FROM movimientos m
CROSS JOIN params p
WHERE 1=1
  AND (p.v_empleado IS NULL OR m.empleado = p.v_empleado)
  AND (
        p.v_nombreempleado IS NULL
        OR m.nombreempleado ILIKE ('%' || p.v_nombreempleado || '%')
      )
  AND m.fechaaplicacion::timestamp >= COALESCE(p.v_desde::timestamp, '1900-01-01'::timestamp)
  AND m.fechaaplicacion::timestamp < (COALESCE(p.v_hasta::timestamp, '9999-12-31'::timestamp) + INTERVAL '1 day')
ORDER BY m.empleado, m.fechaaplicacion::timestamp ASC, m.codigo ASC;
