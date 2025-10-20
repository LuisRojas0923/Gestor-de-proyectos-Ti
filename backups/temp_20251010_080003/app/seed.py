import logging
from app.database import SessionLocal
from app.schemas import RequirementCreate, UserCreate
from app.crud import create_requirement, create_user, get_user_by_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_data():
    db = SessionLocal()
    try:
        logger.info("Seeding initial data...")

        # Create a sample user if they don't exist
        user_email = "test.user@example.com"
        db_user = get_user_by_email(db, email=user_email)
        if not db_user:
            user_in = UserCreate(name="Test User", email=user_email, role="Developer")
            db_user = create_user(db, user=user_in)
            logger.info(f"Created user: {db_user.name}")
        
        # Sample requirements
        requirements_to_create = [
            RequirementCreate(
                external_id="REQ-001",
                title="Implementar Dashboard de Métricas",
                description="Crear el dashboard principal con KPIs de rendimiento.",
                priority="high",
                type="Feature",
                category="Analytics",
                assigned_user_id=db_user.id
            ),
            RequirementCreate(
                external_id="REQ-002",
                title="Fix de Bug en Login",
                description="Los usuarios con nombres largos no pueden iniciar sesión.",
                priority="critical",
                type="Bug",
                category="Authentication"
            ),
            RequirementCreate(
                external_id="REQ-003",
                title="Optimizar Carga de Tabla de Requerimientos",
                description="La tabla tarda más de 5 segundos en cargar con más de 1000 registros.",
                priority="medium",
                type="Improvement",
                category="Performance",
                assigned_user_id=db_user.id
            ),
        ]

        logger.info("Creating sample requirements...")
        for req_in in requirements_to_create:
            create_requirement(db=db, requirement=req_in)
            logger.info(f"Created requirement: {req_in.title}")

        logger.info("Data seeding completed successfully.")
    except Exception as e:
        logger.error(f"An error occurred during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
