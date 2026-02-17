-- =============================================
-- MIGRACIÓN: Agregar campo sub_estado a tickets
-- Ejecutar ANTES de desplegar el nuevo código
-- =============================================

-- 1. Agregar la columna sub_estado
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sub_estado VARCHAR(50);

-- 2. Migrar datos existentes según el mapeo:
--    Abierto     → Pendiente / Asignado
--    Asignado    → Pendiente / Asignado
--    En Proceso  → Proceso   / Proceso
--    Pendiente Info → Proceso / Pendiente Información
--    Escalado    → Cerrado   / Escalado
--    Resuelto    → Cerrado   / Resuelto
--    Cerrado     → Cerrado   / Resuelto

UPDATE tickets SET sub_estado = 'Asignado',               estado = 'Pendiente' WHERE estado = 'Abierto';
UPDATE tickets SET sub_estado = 'Asignado',               estado = 'Pendiente' WHERE estado = 'Asignado';
UPDATE tickets SET sub_estado = 'Proceso',                estado = 'Proceso'   WHERE estado = 'En Proceso';
UPDATE tickets SET sub_estado = 'Pendiente Información',  estado = 'Proceso'   WHERE estado = 'Pendiente Info';
UPDATE tickets SET sub_estado = 'Escalado',               estado = 'Cerrado'   WHERE estado = 'Escalado';
UPDATE tickets SET sub_estado = 'Resuelto',               estado = 'Cerrado'   WHERE estado = 'Resuelto';
UPDATE tickets SET sub_estado = 'Resuelto',               estado = 'Cerrado'   WHERE estado = 'Cerrado';

-- 3. Poner default para futuros tickets
ALTER TABLE tickets ALTER COLUMN sub_estado SET DEFAULT 'Asignado';

-- 4. Verificar la migración
SELECT estado, sub_estado, COUNT(*) as total
FROM tickets
GROUP BY estado, sub_estado
ORDER BY estado, sub_estado;
