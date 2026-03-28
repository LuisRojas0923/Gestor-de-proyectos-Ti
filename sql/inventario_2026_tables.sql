-- Creación de tablas para el módulo de Inventario 2026 (Versión Rondas de Conteo)

-- Tabla de Conteo Físico (Maestra + 4 Rondas)
CREATE TABLE IF NOT EXISTS ConteoInventario (
    id SERIAL PRIMARY KEY,
    b_siigo INTEGER,
    bodega VARCHAR(100),
    bloque VARCHAR(50),
    estante VARCHAR(50),
    nivel VARCHAR(50),
    codigo VARCHAR(100),
    descripcion TEXT,
    unidad VARCHAR(20),
    
    cantidad_sistema FLOAT DEFAULT 0, -- Cantidad teórica según ERP (Excel)
    invporlegalizar FLOAT DEFAULT 0,  -- Ajustes de inventario en tránsito
    cantidad_final FLOAT DEFAULT 0,   -- SIIGO + INV.LEG (Total Teórico)
    
    -- Ronda 1
    cant_c1 FLOAT DEFAULT 0,
    obs_c1 TEXT,
    user_c1 VARCHAR(50),
    
    -- Ronda 2
    cant_c2 FLOAT DEFAULT 0,
    obs_c2 TEXT,
    user_c2 VARCHAR(50),
    
    -- Ronda 3
    cant_c3 FLOAT DEFAULT 0,
    obs_c3 TEXT,
    user_c3 VARCHAR(50),
    
    -- Ronda 4
    cant_c4 FLOAT DEFAULT 0,
    obs_c4 TEXT,
    user_c4 VARCHAR(50),

    conteo VARCHAR(100), -- Identificador de la toma física (ej: "Inventario_Anual_2026")
    estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, CONCILIADO, DISCREPANTE, RECONTEO
    diferencia FLOAT DEFAULT 0, -- Diferencia local de la ubicación
    diferencia_total FLOAT DEFAULT 0, -- Diferencia Global del código (Balance Multi-ubicación)
    
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Asignación de Personal por Ubicación
CREATE TABLE IF NOT EXISTS AsignacionInventario (
    id SERIAL PRIMARY KEY,
    bodega VARCHAR(100),
    bloque VARCHAR(50),
    estante VARCHAR(50),
    nivel VARCHAR(50),
    cedula VARCHAR(50),
    nombre VARCHAR(255),
    cargo VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Configuración Global del Inventario
CREATE TABLE IF NOT EXISTS ConfiguracionInventario (
    id SERIAL PRIMARY KEY,
    ronda_activa INTEGER DEFAULT 1,
    conteo_nombre VARCHAR(100),
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Histórico / Snapshots
CREATE TABLE IF NOT EXISTS ConteoHistorico (
    id SERIAL PRIMARY KEY,
    original_id INTEGER,
    bodega VARCHAR(100),
    bloque VARCHAR(50),
    estante VARCHAR(50),
    nivel VARCHAR(50),
    codigo VARCHAR(100),
    descripcion TEXT,
    unidad VARCHAR(20),
    cantidad_sistema FLOAT,
    cant_c1 FLOAT,
    cant_c2 FLOAT,
    cant_c3 FLOAT,
    cant_c4 FLOAT,
    conteo VARCHAR(100),
    estado VARCHAR(20),
    invporlegalizar FLOAT,
    cantidad_final FLOAT,
    diferencia_total FLOAT,
    snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Tránsito de Mercancía (Modelo B)
CREATE TABLE IF NOT EXISTS TransitoInventario (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100),
    documento VARCHAR(100),
    cantidad FLOAT DEFAULT 0,
    fecha_proceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
