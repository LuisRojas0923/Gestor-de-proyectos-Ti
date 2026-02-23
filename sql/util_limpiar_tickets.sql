-- SCRIPT DE LIMPIEZA DE PRUEBAS - GESTOR DE PROYECTOS TI
-- Este script vacía todos los tickets y sus datos relacionados de forma segura.
-- NO afecta usuarios, categorías ni configuraciones maestras.

BEGIN;

-- 1. Eliminar datos dependientes (Hijos)
DELETE FROM comentarios_ticket;
DELETE FROM historial_ticket;
DELETE FROM adjuntos_ticket;
DELETE FROM solicitudes_desarrollo;
DELETE FROM control_cambios;
DELETE FROM solicitudes_activo;

-- 2. Eliminar tickets (Padre)
DELETE FROM tickets;

-- 3. Reiniciar el contador de tickets a 1
ALTER SEQUENCE ticket_id_seq RESTART WITH 1;

COMMIT;

-- Verificación de limpieza
SELECT 'Tickets restantes: ' || COUNT(*) FROM tickets;
SELECT 'Próximo ID (valor de secuencia): ' || last_value FROM ticket_id_seq;
