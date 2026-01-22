"""
API de Autenticacin - Backend V2
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import obtener_db, obtener_erp_db
from app.schemas.auth.usuario import (
    Token, LoginRequest, Usuario, UsuarioCrear, 
    AnalistaCrear, PasswordCambiar
)
from app.services.auth.servicio import ServicioAuth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(obtener_db)):
    """Endpoint para inicio de sesion (OAuth2 compatible)"""
    try:
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
    except HTTPException:
        # Re-lanzar excepciones HTTP ya manejadas
        raise
    except Exception as e:
        # Capturar errores inesperados (BD, red, etc)
        print(f"ERROR CRITICO en Login API: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor durante la autenticacin"
        )


@router.post("/registro", response_model=Usuario)
async def registrar_usuario(usuario: UsuarioCrear, db: Session = Depends(obtener_db)):
    """Endpoint para registrar un nuevo usuario"""
    # Lgica de registro (se completar con el servicio)
    return usuario # Temporal


async def obtener_usuario_actual_db(token: str = Depends(oauth2_scheme), db: Session = Depends(obtener_db)):
    """Dependencia para obtener el objeto usuario completo del token"""
    cedula = ServicioAuth.obtener_cedula_desde_token(token)
    if not cedula:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    usuario = ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.get("/yo", response_model=Usuario)
async def obtener_usuario_actual(usuario: Usuario = Depends(obtener_usuario_actual_db)):
    """Endpoint para obtener los datos del usuario actual"""
    return usuario


@router.post("/analistas/crear", response_model=Usuario)
async def crear_analista(
    datos: AnalistaCrear, 
    db: Session = Depends(obtener_db),
    db_erp: Session = Depends(obtener_erp_db)
):
    """Crea un analista validando contra Solid ERP"""
    try:
        return await ServicioAuth.crear_analista_desde_erp(db, db_erp, datos.cedula)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.patch("/password", response_model=Usuario)
async def cambiar_contrasena(
    datos: PasswordCambiar,
    db: Session = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Cambia la contraseña del usuario actual"""
    # 1. Verificar contraseña actual
    if not ServicioAuth.verificar_contrasena(datos.contrasena_actual, usuario.hash_contrasena):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
        
    try:
        return ServicioAuth.cambiar_contrasena(db, usuario.id, datos.nueva_contrasena)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
