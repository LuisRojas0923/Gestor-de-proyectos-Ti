-- =============================================
-- Script de Reparación de Secuencias (IDs)
-- =============================================
-- Este script sincroniza las secuencias de la base de datos con los valores máximos reales de las tablas.
-- Útil después de reinicios de Docker o migraciones donde las secuencias se desincronizan.

BEGIN;

-- 1. Sincronizar ticket_id_seq
-- Se extrae la parte numérica de 'TKT-XXXX' y se establece la secuencia al máximo + 1
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::INTEGER), 0) + 1
    INTO max_id
    FROM tickets
    WHERE id LIKE 'TKT-%';

    PERFORM setval('ticket_id_seq', max_id, false);
    RAISE NOTICE 'Secuencia ticket_id_seq actualizada a: %', max_id;
END $$;

-- 2. Sincronizar historial_ticket_id_seq
SELECT setval('historial_ticket_id_seq', COALESCE((SELECT MAX(id) FROM historial_ticket), 0) + 1, false);

-- 3. Sincronizar adjuntos_ticket_id_seq
SELECT setval('adjuntos_ticket_id_seq', COALESCE((SELECT MAX(id) FROM adjuntos_ticket), 0) + 1, false);

-- 4. Sincronizar comentarios_ticket_id_seq (por si acaso)
SELECT setval('comentarios_ticket_id_seq', COALESCE((SELECT MAX(id) FROM comentarios_ticket), 0) + 1, false);

COMMIT;

-- Verificación
SELECT nextval('ticket_id_seq') as next_ticket_id;
