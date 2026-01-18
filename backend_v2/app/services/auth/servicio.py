"""
Servicio de Autenticacin - Backend V2
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import config
from app.models.auth import Usuario

# Configuracin de hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ServicioAuth:
    """Clase principal para lgica de autenticacin"""
    
    @staticmethod
    def verificar_contrasena(contrasena_plana, contrasena_hasheada):
        return pwd_context.verify(contrasena_plana, contrasena_hasheada)

    @staticmethod
    def obtener_hash_contrasena(contrasena):
        return pwd_context.hash(contrasena)

    @staticmethod
    def crear_token_acceso(datos: dict, tiempo_expiracion: Optional[timedelta] = None):
        a_codificar = datos.copy()
        if tiempo_expiracion:
            expira = datetime.utcnow() + tiempo_expiracion
        else:
            expira = datetime.utcnow() + timedelta(minutes=config.access_token_expire_minutes)
        
        a_codificar.update({"exp": expira})
        token_jwt = jwt.encode(a_codificar, config.secret_key, algorithm=config.algorithm)
        return token_jwt

    @staticmethod
    def obtener_usuario_por_cedula(db: Session, cedula: str):
        return db.query(Usuario).filter(Usuario.cedula == cedula).first()
