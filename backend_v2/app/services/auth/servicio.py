"""
Servicio de Autenticacion - Backend V2
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session
from app.config import config
from app.models.auth.usuario import Usuario
from app.services.erp.servicio import ServicioErp


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
    def obtener_cedula_desde_token(token: str) -> Optional[str]:
        """Decodifica el token y extrae la cédula (sub)."""
        try:
            payload = jwt.decode(token, config.secret_key, algorithms=[config.algorithm])
            cedula: str = payload.get("sub")
            if cedula is None:
                return None
            return cedula
        except Exception:
            return None

    @staticmethod
    def obtener_usuario_por_cedula(db: Session, cedula: str):
        return db.query(Usuario).filter(Usuario.cedula == cedula).first()

    @staticmethod
    async def crear_analista_desde_erp(db: Session, db_erp: Session, cedula: str) -> Usuario:
        """
        Consulta al ERP y crea un usuario analista si existe.
        """
        # 1. Validar si ya existe
        usuario_existente = ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if usuario_existente:
            raise ValueError("El usuario ya existe en el sistema")

        # 2. Consultar ERP
        datos_erp = await ServicioErp.obtener_empleado_por_cedula(db_erp, cedula)
        if not datos_erp:
            raise ValueError("No se encontró el empleado en Solid ERP o está inactivo")

        # 3. Crear usuario
        # Generar ID único (usaremos la cédula como ID también para consistencia)
        id_usuario = f"USR-{cedula}"
        
        # Hash de contraseña inicial (la cédula)
        hash_pwd = ServicioAuth.obtener_hash_contrasena(cedula)
        
        nuevo_usuario = Usuario(
            id=id_usuario,
            cedula=cedula,
            nombre=datos_erp["nombre"],
            correo=None, # Solid no lo provee en la query actual, se asignará luego
            hash_contrasena=hash_pwd,
            rol="analyst",
            esta_activo=True
        )
        
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario

    @staticmethod
    def cambiar_contrasena(db: Session, usuario_id: str, nueva_contrasena: str):
        """Cambia la contraseña de un usuario."""
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("Usuario no encontrado")
            
        usuario.hash_contrasena = ServicioAuth.obtener_hash_contrasena(nueva_contrasena)
        db.commit()
        db.refresh(usuario)
        return usuario
