-- Migración: Agregar columna aprobador_id a requisiciones_personal
-- Fecha: 2026-05-27
-- Descripción: Permite al solicitante escoger el director específico que aprobará
--              la Requisición de Personal, en lugar de tomar el primero del área.

ALTER TABLE requisiciones_personal
    ADD COLUMN IF NOT EXISTS aprobador_id INTEGER
        REFERENCES aprobadores_area_rp(id)
        ON DELETE SET NULL;

COMMENT ON COLUMN requisiciones_personal.aprobador_id
    IS 'Director seleccionado por el solicitante para aprobar la RP. FK a aprobadores_area_rp.';
