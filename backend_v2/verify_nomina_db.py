from app.database import engine
from sqlalchemy import inspect
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_tables():
    inspector = inspect(engine.sync_engine)
    tables = inspector.get_table_names()
    expected_tables = [
        "nomina_archivos", 
        "nomina_registros_crudos", 
        "nomina_registros_normalizados", 
        "nomina_conceptos"
    ]
    
    logger.info(f"Tables found: {tables}")
    
    missing = [t for t in expected_tables if t not in tables]
    if missing:
        logger.error(f"Missing tables: {missing}")
    else:
        logger.info("All Nomina tables are present.")

if __name__ == "__main__":
    verify_tables()
