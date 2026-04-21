import sys
import os

# Añadir el directorio raíz al path para importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.config import config

def migrar():
    print(f"Iniciando migracion en: {config.database_url}")
    try:
        from app.database import engine
        with engine.connect() as conn:
            # Comando SQL para añadir la columna si no existe
            sql = text("""
                ALTER TABLE usuarios 
                ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN DEFAULT FALSE;
            """)
            
            print("Ejecutando SQL...")
            conn.execute(sql)
            conn.commit()
            print("OK: Columna 'correo_verificado' añadida exitosamente a la tabla 'usuarios'.")
            
            # Sincronizar usuarios existentes
            sql_update = text("UPDATE usuarios SET correo_verificado = FALSE WHERE correo_verificado IS NULL;")
            conn.execute(sql_update)
            conn.commit()
            print("OK: Registros existentes actualizados.")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    migrar()
