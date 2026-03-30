-- ==========================================================
-- MODULO: INVENTARIO 2026 (VERSIÓN RONDAS DE CONTEO CIEGO)
-- OPTIMIZADO PARA PRODUCCIÓN (POSTGRESQL)
-- ==========================================================

-- Tabla Maestra de Conteo Físico
-- Soporta 4 Rondas, Diferencias Locales y Totales por SKU
CREATE TABLE IF NOT EXISTS ConteoInventario (
    id SERIAL PRIMARY KEY,
    b_siigo INTEGER, -- ID de registro en SIIGO
    bodega VARCHAR(100) NOT NULL,
    bloque VARCHAR(50),
    estante VARCHAR(50),
    nivel VARCHAR(50),
    codigo VARCHAR(100), -- SKU (Opcional, solo bodega es mandatoria)
    descripcion TEXT,
    unidad VARCHAR(20),
    
    -- Información Teórica (Sistema)
    cantidad_sistema FLOAT DEFAULT 0,  -- Teórico ERP puro
    invporlegalizar FLOAT DEFAULT 0,   -- Tránsito / Legalizar
    cantidad_final FLOAT DEFAULT 0,    -- Teórico Final (SIIGO + Tránsito)
    
    -- Ronda 1 (Conteo Inicial)
    cant_c1 FLOAT DEFAULT 0,
    obs_c1 TEXT,
    user_c1 VARCHAR(50),
    
    -- Ronda 2 (Doble Conteo Ciego)
    cant_c2 FLOAT DEFAULT 0,
    obs_c2 TEXT,
    user_c2 VARCHAR(50),
    
    -- Ronda 3 (Conciliación Discrepancias)
    cant_c3 FLOAT DEFAULT 0,
    obs_c3 TEXT,
    user_c3 VARCHAR(50),
    
    -- Ronda 4 (Ajuste Final / Auditoría)
    cant_c4 FLOAT DEFAULT 0,
    obs_c4 TEXT,
    user_c4 VARCHAR(50),

    conteo VARCHAR(100), -- Nombre del evento (Opcional)
    estado VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, CONCILIADO, DISCREPANTE, RECONTEO, UBICACIÓN ERRÓNEA
    diferencia FLOAT DEFAULT 0, -- Diferencia en esta ubicación específica
    diferencia_total FLOAT DEFAULT 0, -- Diferencia Global del SKU (Multi-bodega)
    
    -- Gestión de Ubicación: Solo la bodega es obligatoria. Bloque, estante y nivel son "libres" (opcionales).
    -- RESTRICTIVO: No se permite repetir SKU en la misma ubicación (Garantiza integridad).
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices Críticos para Rendimiento en Dashboard y Virtualización
CREATE INDEX IF NOT EXISTS idx_conteo_sku ON ConteoInventario (codigo, conteo);
CREATE INDEX IF NOT EXISTS idx_conteo_geografico ON ConteoInventario (bodega, bloque, estante, nivel);
CREATE INDEX IF NOT EXISTS idx_conteo_estado ON ConteoInventario (estado);
CREATE INDEX IF NOT EXISTS idx_conteo_user_c1 ON ConteoInventario (user_c1) WHERE user_c1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conteo_user_c2 ON ConteoInventario (user_c2) WHERE user_c2 IS NOT NULL;

-- Índice para búsquedas rápidas por identidad completa (permite repeticiones)
-- Índice único para prevenir duplicados teóricos (Postgres 15+ maneja NULLS NOT DISTINCT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conteo_identidad_full ON ConteoInventario (codigo, bodega, bloque, estante, nivel, conteo) NULLS NOT DISTINCT;

-- Tabla de Asignación de Personal
-- Crucial para el algoritmo de división de carga (parejas)
CREATE TABLE IF NOT EXISTS AsignacionInventario (
    id SERIAL PRIMARY KEY,
    bodega VARCHAR(100) NOT NULL,
    bloque VARCHAR(50),
    estante VARCHAR(255),
    nivel VARCHAR(50),
    cedula VARCHAR(50) NOT NULL,
    nombre VARCHAR(255),
    cedula_companero VARCHAR(50),
    nombre_companero VARCHAR(255),
    numero_pareja INTEGER NOT NULL,
    -- Campos de ubicación libres (opcionales), solo bodega es requerida
    ronda_vista INTEGER DEFAULT 1, 
    cargo VARCHAR(100),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asig_cedula ON AsignacionInventario (cedula);
CREATE INDEX IF NOT EXISTS idx_asig_pareja_bodega ON AsignacionInventario (bodega, numero_pareja);

-- Tabla de Configuración Global
CREATE TABLE IF NOT EXISTS ConfiguracionInventario (
    id SERIAL PRIMARY KEY,
    ronda_activa INTEGER DEFAULT 1,
    conteo_nombre VARCHAR(100) NOT NULL,
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Histórico / Auditoría de Cambios
CREATE TABLE IF NOT EXISTS ConteoHistorico (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    b_siigo INTEGER,
    bodega VARCHAR(100),
    bloque VARCHAR(50),
    estante VARCHAR(50),
    nivel VARCHAR(50),
    codigo VARCHAR(100),
    descripcion TEXT,
    unidad VARCHAR(20),
    cantidad_sistema FLOAT,
    invporlegalizar FLOAT,
    cantidad_final FLOAT,
    
    cant_c1 FLOAT, user_c1 VARCHAR(50),
    cant_c2 FLOAT, user_c2 VARCHAR(50),
    cant_c3 FLOAT, user_c3 VARCHAR(50),
    cant_c4 FLOAT, user_c4 VARCHAR(50),

    conteo VARCHAR(100),
    estado VARCHAR(30),
    diferencia FLOAT,
    diferencia_total FLOAT,
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Tránsito (Auxiliar para precarga de invporlegalizar)
CREATE TABLE IF NOT EXISTS TransitoInventario (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    documento VARCHAR(100),
    cantidad FLOAT DEFAULT 0,
    fecha_proceso TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transito_sku ON TransitoInventario (sku);






-- LIMPIEZA TOTAL DE TABLAS DE INVENTARIO 2026
-- ADVERTENCIA: Esto borrará todos los datos de las tablas mencionadas.

TRUNCATE TABLE 
    conteoinventario, 
    asignacioninventario, 
    transitoinventario, 
    configuracioninventario, 
    conteohistorico 
RESTART IDENTITY CASCADE;


