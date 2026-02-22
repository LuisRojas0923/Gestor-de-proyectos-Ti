-- =========================================================================
-- SCRIPT DE ALINEACION EXACTA CON ERP SOLID (Versión 3.1 - Java Compatible)
-- Propósito: Igualar tipos y estructura de tablas de tránsito con las maestras del ERP.
--  ADVERTENCIA: Este script ELIMINA las tablas existentes y las recrea.
-- Marina Debug | 2026-02-09
-- =========================================================================

-- 1. ELIMINAR TABLAS EXISTENTES (en orden por FK)
DROP TABLE IF EXISTS transito_viaticos;
DROP TABLE IF EXISTS legalizaciones_transito;

-- 2. TABLA DE CABECERA (legalizaciones_transito)
-- Espejo exacto de: legalizacion
CREATE TABLE legalizaciones_transito (
    codigo BIGSERIAL PRIMARY KEY,
    codigolegalizacion text,                    -- Puede estar en blanco inicialmente
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    fechaaplicacion date NOT NULL,
    empleado text NOT NULL,
    nombreempleado text,
    area text,
    valortotal double precision,
    estado text,
    usuario integer,                            -- Cédula como ENTERO (Java/ERP)
    observaciones text,
    anexo integer,
    centrocosto text,
    cargo text,
    ciudad text,
    reporte_id text UNIQUE                      -- Campo propio de gestión web
);

-- 3. TABLA DE DETALLES (transito_viaticos)
-- Espejo de: linealegalizacion + campos web
CREATE TABLE transito_viaticos (
    codigo BIGSERIAL PRIMARY KEY,
    legalizacion bigint REFERENCES legalizaciones_transito(codigo),
    fecha date,
    fecharealgasto date,
    categoria text,
    ot text,
    centrocosto text,
    subcentrocosto text,
    valorconfactura double precision DEFAULT 0,
    valorsinfactura double precision DEFAULT 0,
    observaciones text,
    -- Campos Extra de Gestión Web
    reporte_id text,
    estado text,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    empleado_cedula text,
    empleado_nombre text,
    area text,
    cargo text,
    ciudad text,
    observaciones_gral text,
    usuario_id integer,                         -- Cédula como ENTERO (Java/ERP)
    adjuntos jsonb DEFAULT '[]'::jsonb
);

-- 4. INDICES DE OPTIMIZACION
CREATE INDEX idx_lt_empleado ON legalizaciones_transito(empleado);
CREATE INDEX idx_lt_reporte ON legalizaciones_transito(reporte_id);
CREATE INDEX idx_tv_reporte ON transito_viaticos(reporte_id);
CREATE INDEX idx_tv_legalizacion ON transito_viaticos(legalizacion);
