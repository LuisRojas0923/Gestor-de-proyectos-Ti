"""
API de Autenticacin - Backend V2
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import obtener_db
from app.schemas.auth import Token, LoginRequest, Usuario, UsuarioCrear
from app.services.auth.servicio import ServicioAuth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(obtener_db)):
    """Endpoint para inicio de sesion (OAuth2 compatible)"""
    # 1. Buscar usuario
    # Nota: Usamos 'cedula' como username principal para admins segun el seed
    usuario = ServicioAuth.obtener_usuario_por_cedula(db, form_data.username)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 2. Verificar contrasea
    if not ServicioAuth.verificar_contrasena(form_data.password, usuario.hash_contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Generar token
    token_acceso = ServicioAuth.crear_token_acceso(
        datos={"sub": usuario.cedula, "rol": usuario.rol}
    )
    
    return {
        "access_token": token_acceso, 
        "token_type": "bearer",
        "user": {
            "id": usuario.id,
            "cedula": usuario.cedula,
            "name": usuario.nombre,
            "role": usuario.rol,
            "email": usuario.correo
        }
    }


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
