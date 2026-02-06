from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

env_path = r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\.env"
print(f"Cargando .env desde: {env_path}")
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

def migrate():
    print(f"Conectando a {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Verificando columna centrocosto...")
        res = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'usuarios' AND column_name = 'centrocosto'
        """))
        if not res.fetchone():
            print("Agregando columna centrocosto...")
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN centrocosto VARCHAR(255)"))
            conn.commit()
            print("Columna agregada exitosamente.")
        else:
            print("La columna ya existe.")

if __name__ == "__main__":
    migrate()
