CREATE TABLE transito_viaticos (
    id SERIAL PRIMARY KEY,
    reporte_id UUID NOT NULL, -- Identifica todas las líneas de un mismo envío
    estado VARCHAR(50) DEFAULT 'INICIAL',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos del Empleado (Metadata unificada)
    empleado_cedula VARCHAR(50) NOT NULL,
    empleado_nombre VARCHAR(255),
    area VARCHAR(255),
    cargo VARCHAR(255),
    ciudad VARCHAR(100),
    
    -- Datos de la Línea de Gasto
    categoria VARCHAR(100),
    fecha_gasto DATE,
    ot VARCHAR(50), 
    cc VARCHAR(50), 
    scc VARCHAR(50), 
    valor_con_factura NUMERIC(15,2) DEFAULT 0,
    valor_sin_factura NUMERIC(15,2) DEFAULT 0,
    observaciones_linea TEXT,
    
    -- Metadata del Reporte
    observaciones_gral TEXT,
    usuario_id VARCHAR(50),
    adjuntos JSONB DEFAULT '[]'::jsonb
);