-- ==========================================
-- Módulo Reserva de Salas
-- Ejecutar en la misma base de datos del proyecto (project_manager)
-- ==========================================

-- Extensión para UUID (si no está ya)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Salas
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    resources TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Series de reservas repetitivas (opcional, para uso futuro)
CREATE TABLE IF NOT EXISTS reservation_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(20) NOT NULL,
    pattern_interval INTEGER NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    created_by_name VARCHAR(255) NOT NULL,
    created_by_document VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservas
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    series_id UUID REFERENCES reservation_series(id) ON DELETE SET NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
    created_by_name VARCHAR(255) NOT NULL,
    created_by_document VARCHAR(100) NOT NULL,
    updated_by_name VARCHAR(255),
    updated_by_document VARCHAR(100),
    cancelled_by_name VARCHAR(255),
    cancelled_by_document VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_range CHECK (end_datetime > start_datetime)
);

CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(start_datetime, end_datetime);

-- Tabla de auditoría (opcional)
CREATE TABLE IF NOT EXISTS reservation_audit (
    id SERIAL PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    changed_by_name VARCHAR(255),
    changed_by_document VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar updated_at en rooms
CREATE OR REPLACE FUNCTION update_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rooms_updated_at ON rooms;
CREATE TRIGGER trigger_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE PROCEDURE update_rooms_updated_at();

-- Trigger para actualizar updated_at en reservations
CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reservations_updated_at ON reservations;
CREATE TRIGGER trigger_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE PROCEDURE update_reservations_updated_at();

-- Datos iniciales: una sala de ejemplo (opcional)
INSERT INTO rooms (id, name, capacity, resources, is_active, notes)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'Sala de reuniones 1',
    10,
    ARRAY['Proyector', 'Pizarra'],
    TRUE,
    'Sala principal'
) ON CONFLICT (id) DO NOTHING;
