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
from app.models.auth.usuario import Usuario, PermisoRol
from app.services.erp import EmpleadosService


from fastapi.security import OAuth2PasswordBearer


class ServicioAuth:
    """Clase principal para logica de autenticacion (Async)"""

    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v2/auth/login")

    @staticmethod
    def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
        """Verifica si la contrasena plana coincide con el hash."""
        return bcrypt.checkpw(
            contrasena_plana.encode("utf-8"), contrasena_hasheada.encode("utf-8")
        )

    @staticmethod
    def obtener_hash_contrasena(contrasena: str) -> str:
        """Genera un hash bcrypt para la contrasena dada."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(contrasena.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def crear_token_acceso(datos: dict, tiempo_expiracion: Optional[timedelta] = None):
        a_codificar = datos.copy()
        if tiempo_expiracion:
            expira = datetime.now(timezone.utc) + tiempo_expiracion
        else:
            expira = datetime.now(timezone.utc) + timedelta(
                minutes=config.access_token_expire_minutes
            )

        a_codificar.update({"exp": expira})
        token_jwt = jwt.encode(
            a_codificar, config.secret_key, algorithm=config.algorithm
        )
        return token_jwt

    @staticmethod
    def obtener_cedula_desde_token(token: str) -> Optional[str]:
        """Decodifica el token y extrae la cedula (sub)."""
        try:
            payload = jwt.decode(
                token, config.secret_key, algorithms=[config.algorithm]
            )
            cedula: str = payload.get("sub")
            if cedula is None:
                return None
            return cedula
        except Exception:
            return None

    @staticmethod
    async def obtener_usuario_por_cedula(
        db: AsyncSession, cedula: str
    ) -> Optional[Usuario]:
        """Obtiene un usuario por cedula (Async)."""
        result = await db.execute(select(Usuario).where(Usuario.cedula == cedula))
        return result.scalars().first()

    @staticmethod
    async def crear_analista_desde_erp(
        db: AsyncSession, db_erp, cedula: str
    ) -> Usuario:
        """
        Consulta al ERP y crea un usuario analista si existe (Async).
        """
        # 1. Validar si ya existe
        usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if usuario_existente:
            raise ValueError("El usuario ya existe en el sistema")

        # 2. Consultar ERP (sincrono por ahora)
        datos_erp = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula)
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
            esta_activo=True,
            area=datos_erp.get("area"),
            cargo=datos_erp.get("cargo"),
            sede=datos_erp.get("ciudadcontratacion"),
            centrocosto=datos_erp.get("centrocosto"),
            viaticante=datos_erp.get("viaticante"),
            baseviaticos=datos_erp.get("baseviaticos"),
        )

        db.add(nuevo_usuario)
        await db.commit()
        await db.refresh(nuevo_usuario)
        return nuevo_usuario

    @staticmethod
    async def cambiar_contrasena(
        db: AsyncSession, usuario_id: str, nueva_contrasena: str
    ) -> Usuario:
        """Cambia la contrasena de un usuario (Async)."""
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalars().first()
        if not usuario:
            raise ValueError("Usuario no encontrado")

        usuario.hash_contrasena = ServicioAuth.obtener_hash_contrasena(nueva_contrasena)
        await db.commit()
        await db.refresh(usuario)
        return usuario

    @staticmethod
    async def sincronizar_perfil_desde_erp(
        db: AsyncSession, db_erp, usuario: Usuario
    ) -> Usuario:
        """Sincroniza los datos de perfil de un usuario existente con Solid ERP."""
        datos_erp = await EmpleadosService.obtener_empleado_por_cedula(
            db_erp, usuario.cedula
        )

        if datos_erp:
            usuario.area = (
                datos_erp.get("area").strip() if datos_erp.get("area") else None
            )
            usuario.cargo = (
                datos_erp.get("cargo").strip() if datos_erp.get("cargo") else None
            )
            usuario.sede = (
                datos_erp.get("ciudadcontratacion").strip()
                if datos_erp.get("ciudadcontratacion")
                else None
            )
            usuario.centrocosto = (
                datos_erp.get("centrocosto").strip()
                if datos_erp.get("centrocosto")
                else None
            )
            usuario.nombre = (
                datos_erp.get("nombre").strip()
                if datos_erp.get("nombre")
                else usuario.nombre
            )
            val_viaticante = datos_erp.get("viaticante")
            usuario.viaticante = (
                bool(val_viaticante) if val_viaticante is not None else False
            )
            usuario.baseviaticos = datos_erp.get("baseviaticos")
            await db.commit()
            await db.refresh(usuario)
        return usuario

    @staticmethod
    async def obtener_permisos_por_rol(db: AsyncSession, rol: str) -> list[str]:
        """Obtiene la lista de módulos permitidos para un rol (Insensible a mayúsculas)."""
        from sqlalchemy import func

        result = await db.execute(
            select(PermisoRol.modulo).where(
                func.lower(PermisoRol.rol) == rol.lower().strip(),
                PermisoRol.permitido,
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def crear_usuario_portal_desde_erp(
        db: AsyncSession, db_erp, cedula: str, contrasena: str
    ) -> Usuario:
        """
        Crea un usuario con rol 'usuario' validando contra Solid ERP (para segundo factor).
        """
        usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if usuario_existente:
            raise ValueError("El usuario ya tiene una contraseña configurada")

        datos_erp = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula)
        if not datos_erp:
            raise ValueError("No se encontro el empleado en Solid ERP")

        id_usuario = f"USR-P-{cedula}"
        hash_pwd = ServicioAuth.obtener_hash_contrasena(contrasena)

        nuevo_usuario = Usuario(
            id=id_usuario,
            cedula=cedula,
            nombre=datos_erp["nombre"],
            hash_contrasena=hash_pwd,
            rol="usuario",  # Rol estándar del portal
            esta_activo=True,
            area=datos_erp.get("area"),
            cargo=datos_erp.get("cargo"),
            sede=datos_erp.get("ciudadcontratacion"),
            centrocosto=datos_erp.get("centrocosto"),
            viaticante=bool(datos_erp.get("viaticante"))
            if datos_erp.get("viaticante") is not None
            else False,
            baseviaticos=datos_erp.get("baseviaticos"),
        )

        db.add(nuevo_usuario)
        await db.commit()
        await db.refresh(nuevo_usuario)
        return nuevo_usuario

    @staticmethod
    async def registrar_sesion(
        db: AsyncSession,
        usuario_id: str,
        token_jwt: str,
        nombre_usuario: Optional[str] = None,
        rol_usuario: Optional[str] = None,
        direccion_ip: Optional[str] = None,
        agente_usuario: Optional[str] = None,
    ) -> None:
        """Registra una nueva sesión en la base de datos."""
        from app.models.auth.usuario import Sesion
        from app.utils_date import get_bogota_now
        from app.database import AsyncSessionLocal

        try:
            async with AsyncSessionLocal() as session:
                ahora = get_bogota_now()
                expira = ahora + timedelta(minutes=config.access_token_expire_minutes)

                nueva_sesion = Sesion(
                    usuario_id=usuario_id,
                    token_sesion=token_jwt,
                    nombre_usuario=nombre_usuario,
                    rol_usuario=rol_usuario,
                    direccion_ip=direccion_ip,
                    agente_usuario=agente_usuario,
                    expira_en=expira,
                )
                session.add(nueva_sesion)
                await session.commit()
        except Exception as e:
            import logging

            logging.warning(f"No se pudo registrar sesion para {usuario_id}: {e}")

    @staticmethod
    async def marcar_fin_sesion(db: AsyncSession, token_jwt: str) -> bool:
        """Marca el fin de una sesión (logout)."""
        from app.models.auth.usuario import Sesion
        from app.utils_date import get_bogota_now

        try:
            stmt = select(Sesion).where(Sesion.token_sesion == token_jwt)
            result = await db.execute(stmt)
            sesion = result.scalars().first()
            if sesion:
                sesion.fin_sesion = get_bogota_now()
                await db.commit()
                return True
            return False
        except Exception as e:
            import logging

            logging.error(f"Error al cerrar sesion: {e}")
            await db.rollback()
            return False
