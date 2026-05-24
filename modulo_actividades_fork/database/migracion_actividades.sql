-- ===========================================================================
-- Script de Migración PostgreSQL para el Módulo de Actividades (Fork)
-- ===========================================================================

-- 1. Tabla de Plantillas de Actividades (Estructuras de tareas predefinidas)
CREATE TABLE IF NOT EXISTS plantillas_actividades (
    id SERIAL PRIMARY KEY,
    nombre_plantilla VARCHAR(255),
    parent_id INTEGER REFERENCES plantillas_actividades(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    horas_estimadas NUMERIC(10, 2) DEFAULT 0.0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plantillas_actividades_nombre ON plantillas_actividades(nombre_plantilla);
CREATE INDEX IF NOT EXISTS idx_plantillas_actividades_parent ON plantillas_actividades(parent_id);

-- 2. Tabla de Actividades (Árbol WBS de Tareas del proyecto)
-- NOTA: Se asume que en el nuevo proyecto la entidad de proyectos se llama 'desarrollos' o 'proyectos'.
-- Si no hay clave foránea directa, desvincular o ajustar el CONSTRAINT REFERENCES de desarrollo_id.
CREATE TABLE IF NOT EXISTS actividades (
    id SERIAL PRIMARY KEY,
    desarrollo_id VARCHAR(50) NOT NULL, -- ID del desarrollo/proyecto
    parent_id INTEGER REFERENCES actividades(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'Pendiente', -- Pendiente, En Progreso, Bloqueado, Completado
    responsable_id VARCHAR(100), -- ID del recurso responsable
    asignado_a_id VARCHAR(50),
    delegado_por_id VARCHAR(50),
    estado_validacion VARCHAR(50) DEFAULT 'aprobada',
    validacion_id INTEGER,
    fecha_inicio_estimada DATE,
    fecha_fin_estimada DATE,
    fecha_inicio_real DATE,
    fecha_fin_real DATE,
    horas_estimadas NUMERIC(10, 2) DEFAULT 0.0,
    horas_reales NUMERIC(10, 2) DEFAULT 0.0,
    porcentaje_avance NUMERIC(5, 2) DEFAULT 0.0,
    seguimiento TEXT,
    compromiso TEXT,
    archivo_url VARCHAR(500),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_actividades_desarrollo ON actividades(desarrollo_id);
CREATE INDEX IF NOT EXISTS idx_actividades_parent ON actividades(parent_id);

-- 3. Tabla de Registro/Log de Actividades (Bitácora de seguimiento)
CREATE TABLE IF NOT EXISTS registro_actividades (
    id SERIAL PRIMARY KEY,
    desarrollo_id VARCHAR(50),
    etapa_id INTEGER,
    tipo_actividad VARCHAR(100) NOT NULL,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    proximo_seguimiento_en TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'pendiente',
    tipo_actor VARCHAR(50),
    datos_dinamicos TEXT, -- Guardará el string JSON
    creado_por VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registro_actividades_desarrollo ON registro_actividades(desarrollo_id);

-- 4. Tabla de Validaciones de Asignación (Aprobaciones jerárquicas directas)
CREATE TABLE IF NOT EXISTS validaciones_asignacion (
    id SERIAL PRIMARY KEY,
    desarrollo_id VARCHAR(50),
    actividad_id INTEGER REFERENCES actividades(id) ON DELETE CASCADE,
    solicitado_por_id VARCHAR(50) NOT NULL,
    validador_id VARCHAR(50) NOT NULL,
    asignado_a_id VARCHAR(50) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    motivo TEXT,
    observacion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validado_en TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_validaciones_asignacion_desarrollo ON validaciones_asignacion(desarrollo_id);
CREATE INDEX IF NOT EXISTS idx_validaciones_asignacion_actividad ON validaciones_asignacion(actividad_id);
