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
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Asignación de Personal por Ubicación
CREATE TABLE IF NOT EXISTS AsignacionInventario (
    id SERIAL PRIMARY KEY,
    bodega VARCHAR(100),
    bloque VARCHAR(50),
    estante VARCHAR(50),
    nivel VARCHAR(50), -- Opcional: si es NULL, asigna todo el estante
    cedula VARCHAR(50),
    nombre VARCHAR(255),
    cargo VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
