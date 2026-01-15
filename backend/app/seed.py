import logging
from app.database import SessionLocal
from app.schemas.auth import AuthUserCreate
from app.crud.auth import create_user as create_auth_user, get_user_by_email as get_auth_user_by_email
from app.schemas.development import DevelopmentCreateV2
from app.crud import create_development

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_data():
    db = SessionLocal()
    try:
        logger.info("Seeding initial data...")

        # Create Analyst
        analyst_email = "analista@gestor.com"
        db_analyst = get_auth_user_by_email(db, email=analyst_email)
        if not db_analyst:
            analyst_in = AuthUserCreate(name="Analista Senior", email=analyst_email, password="password123", role="analyst")
            db_analyst = create_auth_user(db, user=analyst_in)
            logger.info(f"Created analyst: {db_analyst.name}")
        
        # Create standard User
        user_email = "usuario@portal.com"
        db_user = get_auth_user_by_email(db, email=user_email)
        if not db_user:
            user_in = AuthUserCreate(name="Usuario Portal", email=user_email, password="password123", role="user")
            db_user = create_auth_user(db, user=user_in)
            logger.info(f"Created user: {db_user.name}")

        # Sample Development
        dev_id = "REM-12345"
        from sqlalchemy import text
        existing_dev = db.execute(text(f"SELECT id FROM developments WHERE id = '{dev_id}'")).fetchone()
        if not existing_dev:
            dev_in = DevelopmentCreateV2(
                id=dev_id,
                name="Migración de Base de Datos",
                description="Migración de datos legacy a PostgreSQL",
                module="Infraestructura",
                type="Backend",
                general_status="En curso",
                provider="Equipo Interno"
            )
            create_development(db=db, development=dev_in)
            logger.info(f"Created development: {dev_id}")

        logger.info("Data seeding completed successfully.")
    except Exception as e:
        logger.error(f"An error occurred during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
