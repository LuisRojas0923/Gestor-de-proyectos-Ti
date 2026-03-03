import json
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db, obtener_erp_db
from app.models.auth.usuario import (
    Usuario,
    UsuarioPublico,
    PermisoRol,
    AnalistaCrear,
    RolSistema,
    RolCrear,
    RolPublico,
)
from app.services.auth.servicio import ServicioAuth
from .profile_router import obtener_usuario_actual_db

router = APIRouter()


@router.post("/analistas/crear", response_model=UsuarioPublico)
async def crear_analista(
    datos: AnalistaCrear,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db),
):
    """Crea un analista validando contra Solid ERP"""
    try:
        return await ServicioAuth.crear_analista_desde_erp(db, db_erp, datos.cedula)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/analistas", response_model=List[UsuarioPublico])
async def listar_analistas(
    db: AsyncSession = Depends(obtener_db),
    actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Retorna lista de analistas y administradores (Admin ve todo, Admin Sistemas ve su rama)"""
    if actual.rol not in ["admin", "admin_sistemas"]:
        raise HTTPException(
            status_code=403, detail="No tiene permisos para ver esta lista"
        )

    try:
        # Consulta base para todos los roles
        stmt = select(Usuario).where(
            Usuario.rol.in_(
                [
                    "analyst",
                    "admin_sistemas",
                    "admin",
                    "director",
                    "manager",
                    "usuario",
                    "viaticante",
                    "user",
                ]
            )
        )

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
    except Exception as e:
        logging.error(f"Error en GET /analistas: {e}")
        raise HTTPException(status_code=500, detail="Error al consultar analistas")


@router.patch("/analistas/{usuario_id}", response_model=UsuarioPublico)
async def actualizar_analista(
    usuario_id: str,
    datos: dict,
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

        if "rol" in datos:
            usuario.rol = datos["rol"]
        if "especialidades" in datos:
            usuario.especialidades = json.dumps(datos["especialidades"])
        if "areas_asignadas" in datos:
            usuario.areas_asignadas = json.dumps(datos["areas_asignadas"])
        if "esta_activo" in datos:
            usuario.esta_activo = datos["esta_activo"]

        await db.commit()
        await db.refresh(usuario)
        return usuario
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"Error en PATCH /analistas/{usuario_id}: {e}")
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
    except Exception as e:
        logging.error(f"Error en GET /permisos: {e}")
        raise HTTPException(status_code=500, detail="Error al consultar permisos")


@router.post("/permisos")
async def actualizar_permisos(
    permisos: List[dict],
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
            result = await db.execute(
                select(PermisoRol).where(
                    PermisoRol.rol == p["rol"], PermisoRol.modulo == p["modulo"]
                )
            )
            permiso_db = result.scalars().first()

            if permiso_db:
                permiso_db.permitido = p["permitido"]
            else:
                db.add(
                    PermisoRol(
                        rol=p["rol"], modulo=p["modulo"], permitido=p["permitido"]
                    )
                )

        await db.commit()
        return {"mensaje": "Permisos actualizados correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"Error en POST /permisos: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar permisos")


# --- Endpoints de Gestión de Roles ---


@router.get("/roles", response_model=List[RolPublico])
async def listar_roles(
    db: AsyncSession = Depends(obtener_db),
    actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Retorna lista de todos los roles configurados"""
    if actual.rol not in ["admin", "admin_sistemas"]:
        raise HTTPException(status_code=403, detail="No tiene permisos")

    try:
        result = await db.execute(select(RolSistema).order_by(RolSistema.id))
        roles_db = result.scalars().all()

        # Si no hay roles, inicializamos con los básicos (Idempotente)
        if not roles_db:
            basicos = [
                RolSistema(id="admin", nombre="Administrador", es_sistema=True),
                RolSistema(id="admin_sistemas", nombre="Sistemas", es_sistema=True),
                RolSistema(id="manager", nombre="Gerente", es_sistema=True),
                RolSistema(id="analyst", nombre="Analista TI", es_sistema=True),
                RolSistema(id="director", nombre="Director Proyectos", es_sistema=True),
                RolSistema(id="viaticante", nombre="Viaticante", es_sistema=True),
                RolSistema(id="usuario", nombre="Usuario Estándar", es_sistema=True),
            ]
            for r in basicos:
                db.add(r)
            await db.commit()
            result = await db.execute(select(RolSistema).order_by(RolSistema.id))
            roles_db = result.scalars().all()

        return roles_db
    except Exception as e:
        logging.error(f"Error en GET /roles: {e}")
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
            select(RolSistema).where(RolSistema.id == datos.id.lower())
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="El ID del rol ya existe")

        nuevo_rol = RolSistema(
            id=datos.id.lower().replace(" ", "_"),
            nombre=datos.nombre,
            descripcion=datos.descripcion,
            es_sistema=False,
        )
        db.add(nuevo_rol)
        await db.commit()
        await db.refresh(nuevo_rol)
        return nuevo_rol
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"Error en POST /roles: {e}")
        raise HTTPException(status_code=500, detail="Error al crear rol")


@router.delete("/roles/{rol_id}")
async def eliminar_rol(
    rol_id: str,
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

        await db.delete(rol)
        await db.commit()
        return {"mensaje": f"Rol {rol_id} eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"Error en DELETE /roles/{rol_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar rol")
