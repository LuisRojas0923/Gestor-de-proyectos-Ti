-- Migración: Agregar columna excepcion_aplicada_id a nomina_registros_normalizados
-- Permite vincular una excepción transaccional a una línea específica de factura

ALTER TABLE nomina_registros_normalizados
ADD COLUMN IF NOT EXISTS excepcion_aplicada_id INTEGER DEFAULT NULL
REFERENCES nomina_excepciones(id) ON DELETE SET NULL;

-- Índice para consultas rápidas de registros exceptuados
CREATE INDEX IF NOT EXISTS idx_nom_reg_norm_excepcion
ON nomina_registros_normalizados(excepcion_aplicada_id)
WHERE excepcion_aplicada_id IS NOT NULL;
