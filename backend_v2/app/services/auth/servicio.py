"""
Servicio de Autenticacion - Backend V2
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session
from app.config import config
from app.models.auth import Usuario


class ServicioAuth:
    """Clase principal para logica de autenticacion"""
    
    @staticmethod
    def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
        """Verifica si la contrasena plana coincide con el hash."""
        return bcrypt.checkpw(
            contrasena_plana.encode('utf-8'), 
            contrasena_hasheada.encode('utf-8')
        )

    @staticmethod
    def obtener_hash_contrasena(contrasena: str) -> str:
        """Genera un hash bcrypt para la contrasena dada."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(contrasena.encode('utf-8'), salt).decode('utf-8')

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
