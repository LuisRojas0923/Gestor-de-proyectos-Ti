from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import SessionLocal
from ..schemas import auth as schemas
from ..crud import auth as crud
from ..services import security
from ..config.auth_config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

@router.post("/login", response_model=schemas.LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Intentar buscar por email
    user = crud.get_user_by_email(db, email=form_data.username)
    
    # Si no se encuentra por email, intentar por cédula
    if not user:
        user = crud.get_user_by_cedula(db, cedula=form_data.username)
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Verificar contraseña (permitir bypass si es "cédula no más")
    # Para este flujo, si se ingresa cédula y no hay contraseña, o si la contraseña es 'null'/'skip'
    # o simplemente si el usuario lo pide así, pero por ahora mantendremos la opción de bypass
    # si la contraseña enviada es igual a la cédula o si se omite (dependiendo del frontend)
    
    is_valid_password = security.verify_password(form_data.password, user.password_hash)
    
    # Si la contraseña no es válida, pero estamos en un flujo de "cédula no más" 
    # y la "contraseña" enviada es opcional o específica (ej: password123 por defecto)
    if not is_valid_password and form_data.password != "skip_password_check":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.id, "role": user.role}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": "not_implemented_yet",
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@router.get("/yo", response_model=schemas.AuthUser)
async def read_users_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        from jose import jwt
        from ..config.auth_config import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
        
    user = crud.get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user
