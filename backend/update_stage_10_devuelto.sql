-- =====================================================
-- SCRIPT: Actualizar etapa 10 como "Devuelto"
-- =====================================================
-- Descripción: Renombrar la etapa 10 para que represente devoluciones
-- =====================================================

-- Actualizar la etapa 10 para que represente devoluciones
UPDATE development_stages 
SET 
    stage_name = 'Devuelto',
    stage_description = 'Desarrollo devuelto por correcciones requeridas',
    responsible_party = 'proveedor'
WHERE stage_code = 10;

-- Verificar el cambio
SELECT 
    id,
    stage_code,
    stage_name,
    stage_description,
    responsible_party
FROM development_stages 
WHERE stage_code = 10;
