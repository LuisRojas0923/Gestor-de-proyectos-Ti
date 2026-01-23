"""
Servicio de Autenticacion - Backend V2 (Async + SQLModel)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.config import config
from app.models.auth.usuario import Usuario
from app.services.erp.servicio import ServicioErp


class ServicioAuth:
    """Clase principal para logica de autenticacion (Async)"""
    
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
            expira = datetime.now(timezone.utc) + tiempo_expiracion
        else:
            expira = datetime.now(timezone.utc) + timedelta(minutes=config.access_token_expire_minutes)
        
        a_codificar.update({"exp": expira})
        token_jwt = jwt.encode(a_codificar, config.secret_key, algorithm=config.algorithm)
        return token_jwt

    @staticmethod
    def obtener_cedula_desde_token(token: str) -> Optional[str]:
        """Decodifica el token y extrae la cedula (sub)."""
        try:
            payload = jwt.decode(token, config.secret_key, algorithms=[config.algorithm])
            cedula: str = payload.get("sub")
            if cedula is None:
                return None
            return cedula
        except Exception:
            return None

    @staticmethod
    async def obtener_usuario_por_cedula(db: AsyncSession, cedula: str) -> Optional[Usuario]:
        """Obtiene un usuario por cedula (Async)."""
        result = await db.execute(select(Usuario).where(Usuario.cedula == cedula))
        return result.scalars().first()

    @staticmethod
    async def crear_analista_desde_erp(db: AsyncSession, db_erp, cedula: str) -> Usuario:
        """
        Consulta al ERP y crea un usuario analista si existe (Async).
        """
        # 1. Validar si ya existe
        usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if usuario_existente:
            raise ValueError("El usuario ya existe en el sistema")

        # 2. Consultar ERP (sincrono por ahora)
        datos_erp = await ServicioErp.obtener_empleado_por_cedula(db_erp, cedula)
        if not datos_erp:
            raise ValueError("No se encontro el empleado en Solid ERP o esta inactivo")

        # 3. Crear usuario
        id_usuario = f"USR-{cedula}"
        hash_pwd = ServicioAuth.obtener_hash_contrasena(cedula)
        
        nuevo_usuario = Usuario(
            id=id_usuario,
            cedula=cedula,
            nombre=datos_erp["nombre"],
            correo=None,
            hash_contrasena=hash_pwd,
            rol="analyst",
            esta_activo=True
        )
        
        db.add(nuevo_usuario)
        await db.commit()
        await db.refresh(nuevo_usuario)
        return nuevo_usuario

    @staticmethod
    async def cambiar_contrasena(db: AsyncSession, usuario_id: str, nueva_contrasena: str) -> Usuario:
        """Cambia la contrasena de un usuario (Async)."""
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalars().first()
        if not usuario:
            raise ValueError("Usuario no encontrado")
            
        usuario.hash_contrasena = ServicioAuth.obtener_hash_contrasena(nueva_contrasena)
        await db.commit()
        await db.refresh(usuario)
        return usuario
