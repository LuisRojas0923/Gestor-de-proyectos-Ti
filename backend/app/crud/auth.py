from sqlalchemy.orm import Session
from ..models.auth import AuthUser
from ..schemas.auth import AuthUserCreate, AuthUserUpdate
from ..services.security import get_password_hash
import uuid

def get_user_by_email(db: Session, email: str):
    return db.query(AuthUser).filter(AuthUser.email == email).first()

def get_user_by_cedula(db: Session, cedula: str):
    return db.query(AuthUser).filter(AuthUser.cedula == cedula).first()

def get_user(db: Session, user_id: str):
    return db.query(AuthUser).filter(AuthUser.id == user_id).first()

def create_user(db: Session, user: AuthUserCreate):
    db_user = AuthUser(
        id=str(uuid.uuid4()),
        email=user.email,
        password_hash=get_password_hash(user.password),
        name=user.name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
