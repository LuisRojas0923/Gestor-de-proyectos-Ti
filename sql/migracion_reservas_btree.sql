-- Migración para habilitar btree_gist y añadir Exclusion Constraint a reservas de salas

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations 
    ADD CONSTRAINT exclude_overlapping_reservations 
    EXCLUDE USING gist (
        room_id WITH =, 
        tstzrange(start_datetime, end_datetime, '()') WITH &&
    )
    WHERE (status = 'ACTIVE');
