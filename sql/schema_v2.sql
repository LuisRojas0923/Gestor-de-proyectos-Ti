-- Script de Inicialización de Base de Datos - Gestor de Proyectos TI v2
-- Generado automáticamente basado en los modelos de SQLAlchemy

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
    usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_sesion VARCHAR(255) UNIQUE NOT NULL,
    direccion_ip VARCHAR(45),
    agente_usuario TEXT,
    expira_en TIMESTAMPTZ NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

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

-- Secuencia para IDs de tickets (TKT-0001, TKT-0002, ...). Requerida por backend_v2/app/services/ticket/servicio.py
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
    
    -- Datos del Solicitante (Snapshot al crear)
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
-- 4. Datos Semilla (Opcional - Básicos)
-- ==========================================

-- Categorías por defecto
INSERT INTO categorias_ticket (id, nombre, tipo_formulario, descripcion) VALUES
('soporte_hardware', 'Soporte de Hardware', 'support', 'Problemas físicos con equipos'),
('soporte_software', 'Soporte de Software', 'support', 'Instalación y errores de programas'),
('soporte_impresoras', 'Soporte de Impresoras', 'support', 'Mantenimiento y consumibles'),
('perifericos', 'Periféricos y Equipos', 'asset', 'Solicitud de nuevos equipos'),
('soporte_mejora', 'Soporte Mejoramiento', 'support', 'Ajustes a sistemas existentes'),
('nuevos_desarrollos_mejora', 'Nuevos Desarrollos', 'development', 'Nuevas funcionalidades o software'),
('compra_licencias', 'Compra de Licencias', 'asset', 'Software licenciado')
ON CONFLICT (id) DO NOTHING;
