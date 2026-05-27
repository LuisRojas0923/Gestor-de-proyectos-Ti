-- Migración: Crear tablas de seguimiento de requisiciones por Gestión Humana
-- Fecha: 2026-05-27
-- Descripción: Agrega soporte para temporales, asignación de requisiciones a temporales y pipeline de candidatos.

-- 1. Tabla de Empresas Temporales
CREATE TABLE IF NOT EXISTS empresas_temporales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 2. Tabla Intermedia de Asignación de Requisiciones a Temporales
CREATE TABLE IF NOT EXISTS requisiciones_temporales (
    requisicion_id INT NOT NULL REFERENCES requisiciones_personal(id) ON DELETE CASCADE,
    temporal_id INT NOT NULL REFERENCES empresas_temporales(id) ON DELETE CASCADE,
    fecha_envio TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    fecha_envio_hv TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (requisicion_id, temporal_id)
);

-- 3. Tabla de Candidatos Evaluados para una Requisición
CREATE TABLE IF NOT EXISTS candidatos_requisicion (
    id SERIAL PRIMARY KEY,
    requisicion_id INT NOT NULL REFERENCES requisiciones_personal(id) ON DELETE CASCADE,
    temporal_id INT NOT NULL REFERENCES empresas_temporales(id) ON DELETE RESTRICT,
    nombre_candidato VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'POR_EVALUAR',
    causal_descarte VARCHAR(255),
    observaciones TEXT,
    creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_candidatos_req_id ON candidatos_requisicion(requisicion_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_estado ON candidatos_requisicion(estado);

-- 4. Semillado Inicial de Temporales
INSERT INTO empresas_temporales (nombre) VALUES ('SUMMAR TEMPORALES') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO empresas_temporales (nombre) VALUES ('MULTIEMPLEOS') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO empresas_temporales (nombre) VALUES ('DIRECTO') ON CONFLICT (nombre) DO NOTHING;
