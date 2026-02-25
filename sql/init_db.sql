-- Script de Inicialización de Base de Datos Maestro - Gestor de Proyectos TI v2
-- Contiene: Core, Tickets, Reservas de Salas y Datos Iniciales

-- ==========================================
-- Extensiones
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. Módulo de Autenticación
-- ==========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(50) PRIMARY KEY,
    cedula VARCHAR(50) UNIQUE,
    correo VARCHAR(255) UNIQUE,
    hash_contrasena VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'usuario',
    esta_activo BOOLEAN DEFAULT TRUE,
    url_avatar VARCHAR(500),
    zona_horaria VARCHAR(50) DEFAULT 'America/Bogota',
    ultimo_login TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    hash_token VARCHAR(255) NOT NULL,
    tipo_token VARCHAR(50) NOT NULL,
    nombre VARCHAR(255),
    expira_en TIMESTAMPTZ NOT NULL,
    ultimo_uso_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(50) NOT NULL,
    token_sesion VARCHAR(255) UNIQUE NOT NULL,
    direccion_ip VARCHAR(45),
    agente_usuario TEXT,
    expira_en TIMESTAMP NOT NULL,
    creado_en TIMESTAMP DEFAULT NOW(),
    ultima_actividad_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones(usuario_id);

-- ==========================================
-- 2. Módulo de Desarrollo (Core)
-- ==========================================

CREATE TABLE IF NOT EXISTS fases_desarrollo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    orden INTEGER NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#3498db',
    esta_activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etapas_desarrollo (
    id SERIAL PRIMARY KEY,
    fase_id INTEGER NOT NULL REFERENCES fases_desarrollo(id),
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    orden INTEGER NOT NULL,
    descripcion TEXT,
    duracion_estimada_dias INTEGER,
    porcentaje_inicio DECIMAL(5, 2) DEFAULT 0,
    porcentaje_fin DECIMAL(5, 2) DEFAULT 100,
    esta_activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS desarrollos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    modulo VARCHAR(100),
    tipo VARCHAR(50),
    ambiente VARCHAR(100),
    enlace_portal TEXT,
    proveedor VARCHAR(100),
    responsable VARCHAR(255),
    estado_general VARCHAR(50) DEFAULT 'Pendiente',
    fase_actual_id INTEGER REFERENCES fases_desarrollo(id),
    etapa_actual_id INTEGER REFERENCES etapas_desarrollo(id),
    porcentaje_progreso DECIMAL(5, 2) DEFAULT 0,
    fecha_inicio DATE,
    fecha_estimada_fin DATE,
    fecha_real_fin DATE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. Módulo de Soporte y Tickets
-- ==========================================

-- Secuencia para IDs de tickets (TKT-0001, TKT-0002, ...)
CREATE SEQUENCE IF NOT EXISTS ticket_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS categorias_ticket (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    tipo_formulario VARCHAR(50) NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(50) PRIMARY KEY,
    categoria_id VARCHAR(50) NOT NULL REFERENCES categorias_ticket(id),
    
    -- Datos del Solicitante
    creador_id VARCHAR(50) NOT NULL,
    nombre_creador VARCHAR(255),
    correo_creador VARCHAR(255),
    area_creador VARCHAR(100),
    cargo_creador VARCHAR(100),
    sede_creador VARCHAR(100),
    
    -- Detalles del Ticket
    asunto VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'Media',
    estado VARCHAR(50) DEFAULT 'Nuevo',
    sub_estado VARCHAR(50) DEFAULT 'Asignado', -- Agregado de add_sub_estado.sql
    
    -- Gestión
    asignado_a VARCHAR(255),
    diagnostico TEXT,
    resolucion TEXT,
    notas TEXT,
    horas_tiempo_empleado DECIMAL(8, 2),
    
    -- Relaciones Opcionales
    desarrollo_id VARCHAR(50) REFERENCES desarrollos(id),
    datos_extra JSONB,
    
    -- Tiempos
    fecha_entrega_ideal TIMESTAMPTZ,
    resuelto_en TIMESTAMPTZ,
    fecha_cierre TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_desarrollo (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    
    que_necesita TEXT,
    porque TEXT,
    paraque TEXT,
    justificacion_ia TEXT,
    
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comentarios_ticket (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    usuario_id VARCHAR(50),
    nombre_usuario VARCHAR(255),
    comentario TEXT NOT NULL,
    es_interno BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. Monitoreo y Observabilidad
-- ==========================================

CREATE TABLE IF NOT EXISTS metricas_sistema (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    usuarios_online INTEGER DEFAULT 0,
    usuarios_activos_24h INTEGER DEFAULT 0,
    cpu_uso_porcentaje DECIMAL(5, 2) DEFAULT 0.0,
    ram_uso_mb DECIMAL(12, 2) DEFAULT 0.0,
    ram_total_mb DECIMAL(12, 2) DEFAULT 0.0,
    tickets_pendientes INTEGER DEFAULT 0,
    latencia_db_ms DECIMAL(10, 2) DEFAULT 0.0,
    estado_servidor VARCHAR(50) DEFAULT 'ok'
);

CREATE INDEX IF NOT EXISTS idx_metricas_timestamp ON metricas_sistema(timestamp);

-- ==========================================
-- 5. Módulo Reserva de Salas (Integrado)
-- ==========================================

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


-- ==========================================
-- 5. Datos Semilla / Inserts Iniciales
-- ==========================================

-- Categorías por defecto (Sincronizadas con Producción)
INSERT INTO categorias_ticket (id, nombre, descripcion, icono, tipo_formulario) VALUES
('soporte_hardware', 'Soporte de Hardware', 'Problemas físicos con equipos (PCs, Monitores)', 'Cpu', 'support'),
('soporte_software', 'Soporte de Software', 'Instalación y errores de programas', 'AppWindow', 'support'),
('soporte_impresoras', 'Soporte de Impresoras', 'Mantenimiento y consumibles', 'Printer', 'support'),
('perifericos', 'Periféricos y Equipos', 'Solicitud de nuevos equipos', 'Mouse', 'asset'),
('compra_licencias', 'Compra de Licencias', 'Software licenciado', 'ShieldCheck', 'asset'),
('soporte_mejora', 'Soporte Mejoramiento', 'Ajustes a sistemas existentes', 'Wrench', 'improvement_support'),
('nuevos_desarrollos_solid', 'Nuevos desarrollos SOLID', NULL, 'Code', 'development'),
('nuevos_desarrollos_mejora', 'Nuevas Herramientas', 'Nuevas funcionalidades o software', 'Wrench', 'support')
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    icono = EXCLUDED.icono,
    tipo_formulario = EXCLUDED.tipo_formulario;

-- Sala de Ejemplo
INSERT INTO rooms (id, name, capacity, resources, is_active, notes)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'Sala de reuniones 1',
    10,
    ARRAY['Proyector', 'Pizarra'],
    TRUE,
    'Sala principal'
) ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- 6. Permisos por Rol Integrados
-- ==========================================
-- Forzar recreación de la tabla para asegurar estructura correcta
DROP TABLE IF EXISTS permisos_rol CASCADE;

CREATE TABLE permisos_rol (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(50) NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    permitido BOOLEAN DEFAULT TRUE,
    UNIQUE(rol, modulo)
);

-- Insertar permisos iniciales y consolidados
INSERT INTO permisos_rol (rol, modulo, permitido) VALUES
-- Core Dashboards y Ajustes
('admin', 'dashboard', true),
('analyst', 'dashboard', true),
('director', 'dashboard', true),
('viaticante', 'dashboard', true),
('admin', 'settings', true),
('analyst', 'settings', true),
('director', 'settings', true),

-- Desarrollos e Indicadores
('admin', 'developments', true),
('analyst', 'developments', true),
('director', 'developments', true),
('admin', 'indicators', true),
('analyst', 'indicators', true),
('director', 'indicators', true),

-- Gestión de Tickets y Reportes
('admin', 'ticket-management', true),
('analyst', 'ticket-management', true),
('director', 'ticket-management', true),
('admin', 'reports', true),
('analyst', 'reports', true),
('director', 'reports', true),

-- Service Portal (Público general)
('admin', 'service-portal', true),
('analyst', 'service-portal', true),
('director', 'service-portal', true),
('usuario', 'service-portal', true),
('user', 'service-portal', true),
('viaticante', 'service-portal', true),

-- Otros (Chat, Users, Catalog)
('admin', 'chat', true),
('analyst', 'chat', true),
('director', 'chat', true),
('admin', 'user-admin', true),
('admin', 'design-catalog', true),

-- Módulo: Gestión de Viáticos
('viaticante', 'viaticos_gestion', true),
('admin', 'viaticos_gestion', true),
('director', 'viaticos_gestion', true),
('analyst', 'viaticos_gestion', true),
('user', 'viaticos_gestion', false),

-- Módulo: Mis Solicitudes
('viaticante', 'mis_solicitudes', true),
('admin', 'mis_solicitudes', true),
('director', 'mis_solicitudes', true),
('analyst', 'mis_solicitudes', true),
('user', 'mis_solicitudes', true),

-- Módulo: Soporte Sistemas
('viaticante', 'sistemas', true),
('admin', 'sistemas', true),
('director', 'sistemas', true),
('analyst', 'sistemas', true),
('user', 'sistemas', true),

-- Módulo: Desarrollo Software
('viaticante', 'desarrollo', false),
('admin', 'desarrollo', true),
('director', 'desarrollo', true),
('analyst', 'desarrollo', true),
('user', 'desarrollo', true),

-- Módulo: Mejoramiento
('viaticante', 'mejoramiento', false),
('admin', 'mejoramiento', true),
('director', 'mejoramiento', true),
('analyst', 'mejoramiento', true),
('user', 'mejoramiento', true),

-- Módulo: Admin Sistemas (Nuevo Rol Consolidado)
('admin_sistemas', 'dashboard', true),
('admin_sistemas', 'settings', true),
('admin_sistemas', 'developments', true),
('admin_sistemas', 'indicators', true),
('admin_sistemas', 'ticket-management', true),
('admin_sistemas', 'reports', true),
('admin_sistemas', 'service-portal', true),
('admin_sistemas', 'chat', true),
('admin_sistemas', 'user-admin', true),
('admin_sistemas', 'design-catalog', true),
('admin_sistemas', 'viaticos_gestion', true),
('admin_sistemas', 'mis_solicitudes', true),
('admin_sistemas', 'sistemas', true),
('admin_sistemas', 'desarrollo', true),
('admin_sistemas', 'mejoramiento', true),
('admin', 'control-tower', true),
('admin_sistemas', 'control-tower', true)

ON CONFLICT (rol, modulo) DO NOTHING;
