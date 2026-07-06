"""Script para ejecutar la migración de excepcion_aplicada_id"""
import sys
sys.path.insert(0, ".")
from app.config import config

sync_url = config.database_url.replace("postgresql+asyncpg://", "postgresql://")

from sqlalchemy import create_engine, text

engine = create_engine(sync_url)

SQL = """
ALTER TABLE nomina_registros_normalizados
ADD COLUMN IF NOT EXISTS excepcion_aplicada_id INTEGER DEFAULT NULL
REFERENCES nomina_excepciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nom_reg_norm_excepcion
ON nomina_registros_normalizados(excepcion_aplicada_id)
WHERE excepcion_aplicada_id IS NOT NULL;
"""

with engine.connect() as conn:
    conn.execute(text(SQL))  # [CONTROLADO]
    conn.commit()
    print("Migración ejecutada exitosamente: excepcion_aplicada_id agregada.")
