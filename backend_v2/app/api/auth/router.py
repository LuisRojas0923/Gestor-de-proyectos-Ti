"""
API de Autenticacin - Backend V2
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import obtener_db
from app.schemas.auth import Token, LoginRequest, Usuario, UsuarioCrear

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


@router.post("/login", response_model=Token)
async def login(solicitud: LoginRequest, db: Session = Depends(obtener_db)):
    """Endpoint para inicio de sesin"""
    # Lgica de autenticacin (se completar con el servicio)
    return {"access_token": "token-ejemplo", "token_type": "bearer"}


@router.post("/registro", response_model=Usuario)
async def registrar_usuario(usuario: UsuarioCrear, db: Session = Depends(obtener_db)):
    """Endpoint para registrar un nuevo usuario"""
    # Lgica de registro (se completar con el servicio)
    return usuario # Temporal


@router.get("/yo", response_model=Usuario)
async def obtener_usuario_actual(token: str = Depends(oauth2_scheme)):
    """Endpoint para obtener los datos del usuario actual"""
    # Lgica para obtener usuario desde token
    return {
        "id": "1",
        "cedula": "123",
        "nombre": "Usuario Ejemplo",
        "rol": "admin",
        "esta_activo": True,
        "creado_en": "2024-01-01T00:00:00"
    }
