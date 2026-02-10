-- =========================================================================
-- SCRIPT DE CREACION: legalizaciones_transito
-- Proposito: Almacenar la cabecera de los reportes de viaticos en transito.
-- Vinculo a transito_viaticos: reporte_id (VARCHAR)
-- =========================================================================

CREATE TABLE IF NOT EXISTS legalizaciones_transito (
    codigo SERIAL PRIMARY KEY,
    codigolegalizacion VARCHAR(50) UNIQUE, -- Consecutivo tipo [REP-LXXXX]
    fecha DATE DEFAULT CURRENT_DATE,
    hora TIME DEFAULT CURRENT_TIME,
    fechaaplicacion DATE DEFAULT CURRENT_DATE,
    empleado VARCHAR(50) NOT NULL, -- Cedula del solicitante
    nombreempleado VARCHAR(255),
    area VARCHAR(255),
    valortotal NUMERIC(15,2) DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'INICIAL',
    usuario VARCHAR(50), -- Usuario que creo el registro
    observaciones TEXT,
    anexo INTEGER DEFAULT 0, -- 1 si tiene archivos, 0 si no
    centrocosto VARCHAR(100), -- CC del empleado
    cargo VARCHAR(255),
    ciudad VARCHAR(100),
    reporte_id VARCHAR(50) UNIQUE -- Identificador amigable para vinculo con detalles
);

-- Indices para optimizar busquedas
CREATE INDEX IF NOT EXISTS idx_legalizaciones_empleado ON legalizaciones_transito(empleado);
CREATE INDEX IF NOT EXISTS idx_legalizaciones_reporte_id ON legalizaciones_transito(reporte_id);
