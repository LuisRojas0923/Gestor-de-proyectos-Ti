"""
API de Actividades (WBS) - Backend V2
"""

from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.models.desarrollo.desarrollo import Desarrollo
from app.api.auth.profile_router import obtener_usuario_actual_db
from app.services.jerarquia.service import JerarquiaService
from app.models.desarrollo.actividad import (
    Actividad,
    ActividadCrear,
    ActividadActualizar,
    ActividadLeer,
    ActividadArbol,
)
from app.services.jerarquia import AsignacionJerarquicaService
from app.services.desarrollos.porcentaje_service import recalcular_porcentaje_jerarquico, recalcular_progreso_desarrollo
from app.services.desarrollos.estado_service import propagar_estado_en_progreso, actualizar_estado_general_desarrollo
from app.services.desarrollos.actividad_delete_service import (
    obtener_hijos_preview,
    eliminar_actividad_cascade,
)
from app.services.desarrollos.actividad_access_service import (
    actividad_a_arbol,
    bloquear_ancestros_y_obtener_actividad,
    usuario_puede_acceder_actividad,
    usuario_puede_acceder_desarrollo,
)
from app.services.auditoria.snapshots import (
    asignar_actualizacion_segura,
    asignar_creacion_segura,
    asignar_eliminacion_segura,
    modelo_a_dict_auditoria,
)

router = APIRouter()


@router.post("/", response_model=ActividadLeer)
async def crear_actividad(
    request: Request,
    actividad_in: ActividadCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Crea una nueva actividad (puede ser raíz o subactividad si recibe parent_id)"""
    try:
        nueva_act_data = actividad_in.model_dump()
        nueva_act_data["delegado_por_id"] = usuario.id
        result_dev = await db.execute(select(Desarrollo).where(Desarrollo.id == actividad_in.desarrollo_id).with_for_update())
        desarrollo = result_dev.scalar_one_or_none()
        if not desarrollo: raise HTTPException(status_code=404, detail="Desarrollo no encontrado")
        if desarrollo.estado_general == "Anulado":
            raise HTTPException(status_code=409, detail="El desarrollo está anulado y no permite crear tareas WBS")

        if nueva_act_data.get("parent_id") is not None:
            parent = await bloquear_ancestros_y_obtener_actividad(db, nueva_act_data["parent_id"])
            if not parent:
                raise HTTPException(status_code=404, detail="Actividad padre no encontrada")
            if parent.desarrollo_id != actividad_in.desarrollo_id:
                raise HTTPException(status_code=400, detail="La actividad padre no pertenece al desarrollo")
            if parent.anulada:
                raise HTTPException(status_code=409, detail="No se pueden crear subactividades en una actividad anulada")
            if not await usuario_puede_acceder_actividad(db, usuario, parent):
                raise HTTPException(status_code=403, detail="No tiene permisos para crear subactividades en esta actividad")
        elif not await usuario_puede_acceder_desarrollo(db, usuario, actividad_in.desarrollo_id):
            raise HTTPException(status_code=403, detail="No tiene permisos para crear actividades en este desarrollo")
        
        if nueva_act_data.get("estado") in ("Completada", "Completado"):
            nueva_act_data["porcentaje_avance"] = Decimal("100")
        elif nueva_act_data.get("estado") in ("En Progreso", "En Proceso"):
            nueva_act_data["porcentaje_avance"] = Decimal("50")
        elif nueva_act_data.get("porcentaje_avance") is None:
            nueva_act_data["porcentaje_avance"] = Decimal("0")
            
        nueva_act = Actividad(**nueva_act_data)
        db.add(nueva_act)
        await db.flush()
        await AsignacionJerarquicaService.aplicar_validacion_actividad(
            db,
            nueva_act,
            nueva_act.delegado_por_id,
            nueva_act.asignado_a_id,
        )
        
        await recalcular_porcentaje_jerarquico(db, nueva_act)
        await db.flush()

        await recalcular_progreso_desarrollo(db, nueva_act.desarrollo_id)
        await db.commit()
        await db.refresh(nueva_act)

        # Notificar al usuario asignado
        if nueva_act.asignado_a_id:
            try:
                from app.services.notificacion.servicio import ServicioNotificacion
                from app.models.alerta.notificacion import NotificacionUsuarioCrear
                await ServicioNotificacion.crear_notificacion(
                    db,
                    NotificacionUsuarioCrear(
                        usuario_id=nueva_act.asignado_a_id,
                        titulo="Nueva actividad asignada",
                        mensaje=f"Se te ha asignado la actividad '{nueva_act.titulo}' en el desarrollo {nueva_act.desarrollo_id}.",
                        tipo_evento="actividad_asignada",
                        referencia_id=nueva_act.desarrollo_id
                    )
                )
            except Exception as e_notif:
                import logging
                logging.getLogger(__name__).warning(f"Error creando notificación de actividad: {e_notif}")

        request.state.auditoria_entidad_tipo = "actividad"
        request.state.auditoria_entidad_id = str(nueva_act.id)
        asignar_creacion_segura(request, nueva_act)

        return nueva_act
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al crear actividad: {str(e)}"
        )


@router.get("/desarrollo/{desarrollo_id}/arbol", response_model=List[ActividadArbol])
async def obtener_arbol_actividades(
    desarrollo_id: str,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """
    Obtiene el árbol de actividades para un desarrollo específico, filtrando según
    las políticas de jerarquía organizacional (Regla 1) y colaboración externa (Regla 2).
    """
    try:
        # 1. Obtener todas las actividades del desarrollo
        stmt = select(Actividad).where(Actividad.desarrollo_id == desarrollo_id).order_by(Actividad.id)
        result = await db.execute(stmt)
        actividades = result.scalars().all()

        # 2. Obtener subordinados jerárquicos del usuario (IDs y nombres)
        uid = usuario.id
        subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, uid)
        todos_los_ids = [uid] + subordinados["ids"]
        todos_los_nombres = [usuario.nombre] + subordinados["nombres"]

        # 3. Determinar si el usuario tiene acceso completo al desarrollo (creador, responsable, supervisor, etc.)
        stmt_dev = select(Desarrollo).where(
            Desarrollo.id == desarrollo_id,
            or_(
                Desarrollo.creado_por_id.in_(todos_los_ids),
                Desarrollo.responsable_id.in_(todos_los_ids),
                Desarrollo.analista.in_(todos_los_nombres),
                Desarrollo.supervisor.in_(todos_los_nombres),
                Desarrollo.autoridad.in_(todos_los_nombres),
                Desarrollo.responsable.in_(todos_los_nombres),
            )
        )
        res_dev = await db.execute(stmt_dev)
        desarrollo_acceso_total = res_dev.scalar_one_or_none() is not None

        # Si es admin, director o tiene acceso total por jerarquía al desarrollo, ve todo
        if desarrollo_acceso_total or usuario.rol in ("admin", "director"):
            actividades_filtradas = actividades
        else:
            # Regla 2: Colaboración externa (acceso limitado)
            # Encontrar actividades donde participa directamente o sus subordinados
            permitidos_ids = set()
            actividades_dict = {a.id: a for a in actividades}
            
            for act in actividades:
                if (act.asignado_a_id in todos_los_ids or 
                    act.responsable_id in todos_los_ids or 
                    act.delegado_por_id in todos_los_ids):
                    # Agregar el nodo y todos sus ancestros recursivamente hacia arriba
                    curr = act
                    while curr:
                        permitidos_ids.add(curr.id)
                        curr = actividades_dict.get(curr.parent_id) if curr.parent_id else None

            # Si no participa en ninguna actividad, no tiene permitido ver el desarrollo
            if not permitidos_ids:
                raise HTTPException(
                    status_code=403,
                    detail="No tiene permisos para acceder a las actividades de este desarrollo"
                )
                
            actividades_filtradas = [a for a in actividades if a.id in permitidos_ids]

        # 4. Construir DTOs y armar el árbol
        actividades_dict_arbol = {a.id: actividad_a_arbol(a) for a in actividades_filtradas}
        arbol = []
        
        for a in actividades_filtradas:
            a_dto = actividades_dict_arbol[a.id]
            # Si es raíz o su padre no fue incluido en los permitidos (pasa a ser raíz visual)
            if a.parent_id is None or a.parent_id not in actividades_dict_arbol:
                arbol.append(a_dto)
            else:
                padre = actividades_dict_arbol.get(a.parent_id)
                if padre:
                    padre.subactividades.append(a_dto)

        return arbol
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener árbol de actividades: {str(e)}")


@router.get("/{actividad_id}", response_model=ActividadLeer)
async def obtener_actividad(
    actividad_id: int,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Obtiene una actividad por su ID"""
    try:
        stmt = select(Actividad).where(Actividad.id == actividad_id)
        result = await db.execute(stmt)
        act_db = result.scalar_one_or_none()

        if not act_db:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        if not await usuario_puede_acceder_actividad(db, usuario, act_db):
            raise HTTPException(
                status_code=403,
                detail="No tiene permisos para ver esta actividad",
            )

        return act_db
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener actividad: {str(e)}"
        )


@router.patch("/{actividad_id}", response_model=ActividadLeer)
async def actualizar_actividad(
    request: Request,
    actividad_id: int,
    actividad_in: ActividadActualizar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza una actividad existente (avance, estado, responsable, etc)"""
    try:
        act_db = await bloquear_ancestros_y_obtener_actividad(db, actividad_id)

        if not act_db:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        if act_db.anulada:
            raise HTTPException(status_code=409, detail="La actividad está anulada y no puede modificarse")

        snapshot_antes = modelo_a_dict_auditoria(act_db)

        # Validar permisos de edición (PATCH) — sin bypass de roles
        subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, usuario.id)
        todos_los_ids = [usuario.id] + subordinados["ids"]
        todos_los_nombres = [usuario.nombre] + subordinados["nombres"]

        tiene_acceso = False
        if (act_db.responsable_id in todos_los_ids or 
            act_db.asignado_a_id in todos_los_ids or 
            act_db.delegado_por_id in todos_los_ids):
            tiene_acceso = True
        
        if not tiene_acceso:
            stmt_dev = select(Desarrollo).where(
                Desarrollo.id == act_db.desarrollo_id,
                or_(
                    Desarrollo.creado_por_id.in_(todos_los_ids),
                    Desarrollo.responsable_id.in_(todos_los_ids),
                    Desarrollo.analista.in_(todos_los_nombres),
                    Desarrollo.supervisor.in_(todos_los_nombres),
                    Desarrollo.autoridad.in_(todos_los_nombres),
                    Desarrollo.responsable.in_(todos_los_nombres),
                )
            )
            res_dev = await db.execute(stmt_dev)
            if res_dev.scalar_one_or_none() is not None:
                tiene_acceso = True
        
        if not tiene_acceso:
            raise HTTPException(
                status_code=403,
                detail="No tiene permisos para modificar esta actividad"
            )

        act_data = actividad_in.model_dump(exclude_unset=True)
        
        # Verificar si cambia el estado para recalcular porcentaje
        nuevo_estado = act_data.get("estado")
        
        for key, value in act_data.items():
            setattr(act_db, key, value)

        if "asignado_a_id" in act_data or "delegado_por_id" in act_data:
            await AsignacionJerarquicaService.aplicar_validacion_actividad(
                db,
                act_db,
                act_db.delegado_por_id,
                act_db.asignado_a_id,
            )

        # Recalcular porcentaje jerárquico si cambió el estado
        if nuevo_estado is not None:
            await db.flush()
            await recalcular_porcentaje_jerarquico(db, act_db)
            await db.flush()
            if nuevo_estado == "En Proceso":
                await propagar_estado_en_progreso(db, act_db.parent_id)
                await db.flush()
                await actualizar_estado_general_desarrollo(db, act_db.desarrollo_id)
                await db.flush()

        await recalcular_progreso_desarrollo(db, act_db.desarrollo_id)
        await db.commit()
        if nuevo_estado is not None:
            await db.refresh(act_db)
        await db.refresh(act_db)

        # Notificar al nuevo usuario asignado si cambió
        if "asignado_a_id" in act_data and act_db.asignado_a_id:
            try:
                from app.services.notificacion.servicio import ServicioNotificacion
                from app.models.alerta.notificacion import NotificacionUsuarioCrear
                await ServicioNotificacion.crear_notificacion(
                    db,
                    NotificacionUsuarioCrear(
                        usuario_id=act_db.asignado_a_id,
                        titulo="Actividad asignada",
                        mensaje=f"Se te ha asignado la actividad '{act_db.titulo}' en el desarrollo {act_db.desarrollo_id}.",
                        tipo_evento="actividad_asignada",
                        referencia_id=act_db.desarrollo_id
                    )
                )
            except Exception as e_notif:
                import logging
                logging.getLogger(__name__).warning(f"Error creando notificación de reasignación de actividad: {e_notif}")

        request.state.auditoria_entidad_tipo = "actividad"
        request.state.auditoria_entidad_id = str(act_db.id)
        asignar_actualizacion_segura(request, snapshot_antes, act_db)

        return act_db
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar actividad: {str(e)}"
        )


from pydantic import BaseModel


class EliminarPreviewResponse(BaseModel):
    actividad: dict
    hijos: list[dict]
    total_eliminaciones: int


@router.get("/{actividad_id}/preview", response_model=EliminarPreviewResponse)
async def eliminar_actividad_preview(
    actividad_id: int,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """
    Previsualiza qué actividades se eliminarán (actividad + hijos recursivos).
    """
    try:
        stmt = select(Actividad).where(Actividad.id == actividad_id)
        result = await db.execute(stmt)
        act_db = result.scalar_one_or_none()

        if not act_db:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        if act_db.delegado_por_id != usuario.id:
            raise HTTPException(
                status_code=403,
                detail="Solo el delegador original de la actividad puede previsualizar su anulación"
            )

        actividad, hijos = await obtener_hijos_preview(db, actividad_id)

        return EliminarPreviewResponse(
            actividad={
                "id": actividad.id,
                "titulo": actividad.titulo,
                "estado": actividad.estado,
            },
            hijos=hijos,
            total_eliminaciones=len(hijos) + 1,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al previsualizar eliminación: {str(e)}"
        )


class EliminarConfirmResponse(BaseModel):
    eliminadas: int


@router.delete("/{actividad_id}", response_model=EliminarConfirmResponse)
async def eliminar_actividad(
    request: Request,
    actividad_id: int,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Anula una actividad y todos sus descendientes recursivamente."""
    try:
        stmt = select(Actividad).where(Actividad.id == actividad_id)
        result = await db.execute(stmt)
        act_db = result.scalar_one_or_none()

        if not act_db:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        if act_db.delegado_por_id != usuario.id:
            raise HTTPException(
                status_code=403,
                detail="Solo el delegador original de la actividad puede eliminarla"
            )

        parent_id_original = act_db.parent_id
        desarrollo_id = act_db.desarrollo_id
        snapshot_antes = modelo_a_dict_auditoria(act_db)
        count = await eliminar_actividad_cascade(db, actividad_id, usuario.id)

        if parent_id_original is not None:
            stmt_padre = select(Actividad).where(Actividad.id == parent_id_original)
            result_padre = await db.execute(stmt_padre)
            padre = result_padre.scalar_one_or_none()
            if padre:
                await db.flush()
                await recalcular_porcentaje_jerarquico(db, padre)
                await db.flush()

        await recalcular_progreso_desarrollo(db, desarrollo_id)
        await db.commit()

        request.state.auditoria_entidad_tipo = "actividad"
        request.state.auditoria_entidad_id = str(actividad_id)
        asignar_eliminacion_segura(request, snapshot_antes)

        return EliminarConfirmResponse(eliminadas=count)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar actividad: {str(e)}"
        )
