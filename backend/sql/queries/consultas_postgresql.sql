-- =====================================================
-- CONSULTAS PARA LLAMAR LAS FUNCIONES DESDE POSTGRESQL
-- =====================================================

-- 1. LLAMAR LA FUNCIÓN PRINCIPAL DE PROVEEDORES
-- =====================================================
SELECT * FROM fn_get_providers_from_activities();

-- 2. LLAMAR CON LÍMITES Y FILTROS
-- =====================================================
SELECT * FROM fn_get_providers_from_activities() 
WHERE provider_homologado LIKE '%Ingesoft%';

SELECT * FROM fn_get_providers_from_activities() 
ORDER BY cantidad_desarrollos_con_actividades DESC;

-- 3. USAR LA FUNCIÓN DE HOMOLOGACIÓN
-- =====================================================
SELECT 
    provider as proveedor_original,
    fn_homologar_proveedor(provider) as proveedor_homologado
FROM developments 
WHERE provider IS NOT NULL
LIMIT 10;

-- 4. CONSULTAS COMBINADAS
-- =====================================================
-- Obtener todos los proveedores únicos con su homologación
SELECT DISTINCT 
    d.provider as original,
    fn_homologar_proveedor(d.provider) as homologado,
    COUNT(*) as cantidad_desarrollos
FROM developments d
WHERE d.provider IS NOT NULL
GROUP BY d.provider
ORDER BY cantidad_desarrollos DESC;

-- 5. VERIFICAR QUE EL JOIN FUNCIONA CORRECTAMENTE
-- =====================================================
SELECT 
    d.id as desarrollo_id,
    d.name as desarrollo_nombre,
    d.provider as proveedor_original,
    fn_homologar_proveedor(d.provider) as proveedor_homologado,
    COUNT(dal.id) as actividades_count
FROM developments d
INNER JOIN development_activity_log dal ON d.id = dal.development_id
GROUP BY d.id, d.name, d.provider
ORDER BY actividades_count DESC;

-- 6. COMPARAR CON LA FUNCIÓN (DEBE DAR EL MISMO RESULTADO)
-- =====================================================
SELECT * FROM fn_get_providers_from_activities();

-- 7. CONSULTAS DE DEBUG
-- =====================================================
-- Ver todos los proveedores en developments
SELECT DISTINCT provider FROM developments WHERE provider IS NOT NULL;

-- Ver todos los actor_type en development_activity_log
SELECT DISTINCT actor_type FROM development_activity_log WHERE actor_type IS NOT NULL;

-- 8. CONSULTAS ESPECÍFICAS POR PROVEEDOR
-- =====================================================
-- Actividades de Ingesoft
SELECT 
    dal.id,
    dal.activity_type,
    dal.notes,
    d.name as desarrollo
FROM development_activity_log dal
INNER JOIN developments d ON dal.development_id = d.id
WHERE fn_homologar_proveedor(d.provider) = 'Ingesoft';

-- Actividades de TI Interno
SELECT 
    dal.id,
    dal.activity_type,
    dal.notes,
    d.name as desarrollo
FROM development_activity_log dal
INNER JOIN developments d ON dal.development_id = d.id
WHERE fn_homologar_proveedor(d.provider) = 'TI Interno';
