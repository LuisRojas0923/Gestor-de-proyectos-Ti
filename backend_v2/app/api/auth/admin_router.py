import json
import logging
import secrets
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db, obtener_erp_db
from app.models.auth.usuario import (
    Usuario,
    UsuarioPublico,
    PermisoRol,
    AnalistaCrear,
    AnalistaAdminActualizar,
    PermisoRolActualizar,
    RolSistema,
    RolCrear,
    RolPublico,
    ModuloSistema,
)
from app.services.auth.servicio import ServicioAuth
from app.services.notifications.email_service import EmailService
from app.core.rbac_capability import obtener_capacidad_rbac
from app.services.auth.protected_identity_service import (
    actualizar_estado_protegido,
    actualizar_hash_protegido,
    actualizar_rol_protegido,
)
from .profile_router import obtener_usuario_actual_db

router = APIRouter()
UsuarioId = Annotated[
    str, Path(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
]
RolId = Annotated[
    str, Path(min_length=1, max_length=50, pattern=r"^[a-z0-9_]+$")
]


@router.post("/analistas/crear", response_model=UsuarioPublico)
async def crear_analista(
    datos: AnalistaCrear,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db),
    admin: Usuario = Depends(obtener_usuario_actual_db),
):
    """Crea un analista validando contra Solid ERP"""
    if admin.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede crear analistas")
    try:
        return await ServicioAuth.crear_analista_desde_erp(
            db, db_erp, datos.cedula, admin.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logging.error("Error interno al crear analista")
        raise HTTPException(status_code=500, detail="Error interno al crear analista")


@router.get("/analistas", response_model=List[UsuarioPublico])
async def listar_analistas(
    solo_asignables: bool = False,
    db: AsyncSession = Depends(obtener_db),
    actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Retorna lista de analistas y administradores (Admin ve todo, Roles especializados ven su rama)"""
    if actual.rol not in ["admin", "admin_sistemas", "admin_mejoramiento"]:
        raise HTTPException(
            status_code=403, detail="No tiene permisos para ver esta lista"
        )

    try:
        # Consulta base
        stmt = select(Usuario)

        if solo_asignables:
            # Filtros estrictos para asignación de tickets
            stmt = stmt.where(
                Usuario.esta_activo,
                Usuario.viaticante.is_(False),
                Usuario.rol.in_(["analyst", "admin_sistemas", "admin", "director", "manager"])
            )
        # Si no es solo_asignables, se eliminó el filtro estático de roles para que sea dinámico
        # El administrador podrá ver todos los usuarios registrados independientemente de su rol


        result = await db.execute(stmt)
        usuarios = result.scalars().all()

        if actual.rol == "admin":
            return usuarios

        # Lógica de filtrado para admin_sistemas (por especialidad)
        try:
            mis_especialidades = set(json.loads(actual.especialidades or "[]"))
        except Exception:
            mis_especialidades = set()

        if not mis_especialidades:
            return [u for u in usuarios if u.id == actual.id]

        filtrados = []
        for u in usuarios:
            try:
                sus_especialidades = set(json.loads(u.especialidades or "[]"))
            except Exception:
                sus_especialidades = set()

            if mis_especialidades.intersection(sus_especialidades) or u.id == actual.id:
                filtrados.append(u)

        return filtrados
    except HTTPException:
        raise
    except Exception:
        logging.error("Error en GET /analistas")
        raise HTTPException(status_code=500, detail="Error al consultar analistas")


@router.patch("/analistas/{usuario_id}", response_model=UsuarioPublico)
async def actualizar_analista(
    usuario_id: UsuarioId,
    datos: AnalistaAdminActualizar,
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza metadatos de un analista (Solo Admin)"""
    if admin.rol != "admin":
        raise HTTPException(
            status_code=403, detail="No tiene permisos para modificar usuarios"
        )

    try:
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalars().first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        cambios = datos.model_dump(exclude_unset=True)
        nuevo_rol = cambios.get("rol")
        escalado_privilegios = False
        
        if nuevo_rol and nuevo_rol != usuario.rol:
            stmt_admin = (
                select(ModuloSistema.id)
                .join(PermisoRol, ModuloSistema.id == PermisoRol.modulo)
                .where(
                    PermisoRol.rol == nuevo_rol,
                    PermisoRol.permitido,
                    ModuloSistema.categoria.in_(["analistas", "panel"])
                )
            )
            res_admin = await db.execute(stmt_admin)
            tiene_acceso_admin = res_admin.scalars().first() is not None
            
            stmt_prev_admin = (
                select(ModuloSistema.id)
                .join(PermisoRol, ModuloSistema.id == PermisoRol.modulo)
                .where(
                    PermisoRol.rol == usuario.rol,
                    PermisoRol.permitido,
                    ModuloSistema.categoria.in_(["analistas", "panel"])
                )
            )
            res_prev = await db.execute(stmt_prev_admin)
            era_admin = res_prev.scalars().first() is not None
            if tiene_acceso_admin and not era_admin:
                escalado_privilegios = True
                logging.info("Escalado de privilegios detectado; se invalidarán sesiones")

        if nuevo_rol and nuevo_rol != usuario.rol:
            await actualizar_rol_protegido(db, admin.id, usuario.id, nuevo_rol)
        if "especialidades" in cambios:
            usuario.especialidades = json.dumps(cambios["especialidades"])
        if "areas_asignadas" in cambios:
            usuario.areas_asignadas = json.dumps(cambios["areas_asignadas"])
        if "esta_activo" in cambios:
            await actualizar_estado_protegido(
                db, admin.id, usuario.id, cambios["esta_activo"]
            )

        if (nuevo_rol and nuevo_rol != usuario.rol) or "esta_activo" in cambios:
            await ServicioAuth.invalidar_sesiones_usuario(db, usuario.id)

        await db.commit()
        await db.refresh(usuario)
        return usuario
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logging.error("Error en PATCH /analistas")
        raise HTTPException(status_code=500, detail="Error al actualizar analista")


@router.get("/permisos")
async def listar_permisos(
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db),
):
    """Lista todos los permisos configurados (Solo Admin)"""
    if admin.rol != "admin":
        raise HTTPException(
            status_code=403, detail="No tiene permisos para ver esta lista"
        )

    try:
        result = await db.execute(select(PermisoRol))
        return result.scalars().all()
    except Exception:
        logging.error("Error en GET /permisos")
        raise HTTPException(status_code=500, detail="Error al consultar permisos")


@router.post("/permisos")
async def actualizar_permisos(
    permisos: List[PermisoRolActualizar],
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza la matriz de permisos (Solo Admin)"""
    if admin.rol != "admin":
        raise HTTPException(
            status_code=403, detail="No tiene permisos para modificar permisos"
        )

    try:
        for p in permisos:
            await db.execute(text("""
                SELECT public.admin_configurar_permiso(
                    :capacidad, :actor, :rol, :modulo, :permitido
                )
            """), {
                "capacidad": obtener_capacidad_rbac(),
                "actor": admin.id,
                **p.model_dump(),
            })

        await db.commit()
        return {"mensaje": "Permisos actualizados correctamente"}
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logging.error("Error en POST /permisos")
        raise HTTPException(status_code=500, detail="Error al actualizar permisos")


# --- Endpoints de Gestión de Roles ---


@router.get("/roles", response_model=List[RolPublico])
async def listar_roles(
    db: AsyncSession = Depends(obtener_db),
    actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Retorna lista de todos los roles configurados"""
    if actual.rol not in ["admin", "admin_sistemas", "admin_mejoramiento"]:
        raise HTTPException(status_code=403, detail="No tiene permisos")

    try:
        result = await db.execute(select(RolSistema).order_by(RolSistema.id))
        roles_db = result.scalars().all()

        return roles_db
    except Exception:
        logging.error("Error en GET /roles")
        raise HTTPException(status_code=500, detail="Error al listar roles")


@router.post("/roles", response_model=RolPublico)
async def crear_rol(
    datos: RolCrear,
    db: AsyncSession = Depends(obtener_db),
    actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Crea un nuevo rol en el sistema"""
    if actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede crear roles")

    try:
        # Verificar si ya existe
        result = await db.execute(
            select(RolSistema).where(RolSistema.id == datos.id)
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="El ID del rol ya existe")

        await db.execute(text("""
            SELECT public.admin_crear_rol(
                :capacidad, :actor, :id, :nombre, :descripcion
            )
        """), {
            "capacidad": obtener_capacidad_rbac(),
            "actor": actual.id,
            "id": datos.id,
            "nombre": datos.nombre,
            "descripcion": datos.descripcion,
        })
        await db.commit()
        result = await db.execute(select(RolSistema).where(RolSistema.id == datos.id))
        return result.scalar_one()
    except HTTPException:
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="El ID del rol ya existe")
    except Exception:
        await db.rollback()
        logging.error("Error en POST /roles")
        raise HTTPException(status_code=500, detail="Error al crear rol")


@router.delete("/roles/{rol_id}")
async def eliminar_rol(
    rol_id: RolId,
    db: AsyncSession = Depends(obtener_db),
    actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Elimina un rol (No se pueden borrar roles de sistema)"""
    if actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Permiso denegado")

    try:
        result = await db.execute(select(RolSistema).where(RolSistema.id == rol_id))
        rol = result.scalars().first()

        if not rol:
            raise HTTPException(status_code=404, detail="Rol no encontrado")
        if rol.es_sistema:
            raise HTTPException(
                status_code=400, detail="No se pueden eliminar roles del sistema"
            )

        await db.execute(text("""
            SELECT public.admin_eliminar_rol(:capacidad, :actor, :id)
        """), {
            "capacidad": obtener_capacidad_rbac(),
            "actor": actual.id,
            "id": rol_id,
        })
        await db.commit()
        return {"mensaje": f"Rol {rol_id} eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logging.error("Error en DELETE /roles")
        raise HTTPException(status_code=500, detail="Error al eliminar rol")


@router.post("/analistas/{usuario_id}/desbloquear-rate-limit")
async def desbloquear_rate_limit(
    usuario_id: UsuarioId,
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db),
):
    """Limpia el rate limit del inicio de sesión (slowapi) para un usuario por su ID"""
    if admin.rol != "admin":
        raise HTTPException(
            status_code=403, detail="No tiene permisos para desbloquear usuarios"
        )

    try:
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalars().first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        from app.core.rate_limiter import _identificador_cedula, limiter
        storage = limiter.limiter.storage
        identificador = _identificador_cedula(usuario.cedula.strip().lower())
        eliminadas = 0

        # 1. Caso MemoryStorage (Desarrollo y Tests)
        if hasattr(storage, "storage") and hasattr(storage, "expirations"):
            keys_to_delete = [k for k in storage.storage.keys() if identificador in k.lower()]
            for k in keys_to_delete:
                storage.storage.pop(k, None)
                storage.expirations.pop(k, None)
                if hasattr(storage, "events") and k in storage.events:
                    storage.events.pop(k, None)
            eliminadas = len(keys_to_delete)

        # 2. Caso RedisStorage / RedisClusterStorage / RedisSentinelStorage (Producción con Redis)
        elif hasattr(storage, "storage") and hasattr(storage.storage, "keys") and hasattr(storage.storage, "delete"):
            patron_busqueda = f"*:{identificador}*"
            keys_to_delete = storage.storage.keys(patron_busqueda)
            if keys_to_delete:
                storage.storage.delete(*keys_to_delete)
            eliminadas = len(keys_to_delete)

        return {
            "mensaje": f"Se eliminaron {eliminadas} registros de bloqueo temporal para el usuario.",
            "usuario_id": usuario_id,
            "cedula": usuario.cedula,
            "desbloqueado": True,
        }
    except HTTPException:
        raise
    except Exception:
        logging.error("Error al desbloquear rate limit")
        raise HTTPException(status_code=500, detail="Error interno al procesar el desbloqueo")


@router.post("/analistas/{usuario_id}/reset-password")
async def resetear_contrasena_analista(
    usuario_id: UsuarioId,
    db: AsyncSession = Depends(obtener_db),
    admin: Usuario = Depends(obtener_usuario_actual_db),
):
    """Invalida la clave y envía recuperación segura (Solo Admin)."""
    if admin.rol != "admin":
        raise HTTPException(
            status_code=403, detail="No tiene permisos para resetear contraseñas"
        )

    try:
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalars().first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if not usuario.correo or not usuario.correo_verificado:
            raise HTTPException(
                status_code=400,
                detail="El usuario requiere un correo validado para recuperar su contraseña",
            )
        hash_bloqueo = ServicioAuth.obtener_hash_contrasena(secrets.token_urlsafe(48))
        await actualizar_hash_protegido(db, usuario.id, hash_bloqueo)
        await ServicioAuth.invalidar_sesiones_usuario(db, usuario.id)
        token = ServicioAuth.crear_token_recuperacion(usuario.id, hash_bloqueo)
        reset_url = f"{EmailService.get_frontend_url()}/reset-password?token={token}"
        await db.commit()
        import asyncio
        asyncio.create_task(EmailService.enviar_recuperacion_contrasena(
            usuario.correo, usuario.nombre, reset_url
        ))

        return {"mensaje": "Contraseña reseteada exitosamente"}
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logging.error("Error en reset administrativo de contraseña")
        raise HTTPException(status_code=500, detail="Error al resetear la contraseña")
