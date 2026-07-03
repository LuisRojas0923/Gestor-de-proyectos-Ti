import os
from sqlmodel import create_engine, SQLModel, Session

DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://postgres:postgres_default_password@localhost:5433/biometria_db"
)

# Configurar motor (engine)
engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
