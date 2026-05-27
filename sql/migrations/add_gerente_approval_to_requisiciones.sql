-- Migración: Agregar campos de aprobación de la Gerencia a requisiciones_personal
-- Fecha: 2026-05-27
-- Descripción: Almacena el nombre, correo, fecha y observación de la decisión de la Gerente Administrativa y Financiera.

ALTER TABLE requisiciones_personal
    ADD COLUMN IF NOT EXISTS gerente_nombre VARCHAR(255),
    ADD COLUMN IF NOT EXISTS gerente_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fecha_decision_gerente TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS observacion_gerente TEXT;

COMMENT ON COLUMN requisiciones_personal.gerente_nombre IS 'Nombre de la Gerente Administrativa y Financiera que aprobó/rechazó/devolvió.';
COMMENT ON COLUMN requisiciones_personal.gerente_email IS 'Correo electrónico de la Gerente.';
COMMENT ON COLUMN requisiciones_personal.fecha_decision_gerente IS 'Fecha y hora de la decisión de la Gerente.';
COMMENT ON COLUMN requisiciones_personal.observacion_gerente IS 'Comentarios u observaciones de la Gerente al tomar la decisión.';
