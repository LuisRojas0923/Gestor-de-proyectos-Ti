from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.router import obtener_usuario_actual_db
from app.database import obtener_db
from app.models.auth.usuario import (
    NodoJerarquia,
    RelacionUsuarioActualizar,
    RelacionUsuarioCrear,
    RelacionUsuarioLeer,
    Usuario,
    UsuarioJerarquiaPublico,
)
from app.services.jerarquia import JerarquiaService

router = APIRouter()


@router.get("/mi-equipo", response_model=List[NodoJerarquia])
async def obtener_mi_equipo(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Retorna el árbol jerárquico de subordinados del usuario autenticado."""
    try:
        return await JerarquiaService.obtener_equipo(db, usuario_actual.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener equipo: {str(e)}")


@router.get("/arbol", response_model=List[NodoJerarquia])
async def obtener_arbol_organizacional(db: AsyncSession = Depends(obtener_db)):
    """Retorna el árbol organizacional completo por raíces."""
    try:
        return await JerarquiaService.obtener_arbol_completo(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener árbol: {str(e)}")


@router.get("/usuarios-disponibles", response_model=List[UsuarioJerarquiaPublico])
async def listar_usuarios_disponibles(db: AsyncSession = Depends(obtener_db)):
    """Lista usuarios activos para construir relaciones jerárquicas."""
    try:
        return await JerarquiaService.listar_usuarios(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar usuarios: {str(e)}")


@router.get("/relaciones", response_model=List[RelacionUsuarioLeer])
async def listar_relaciones(solo_activas: bool = True, db: AsyncSession = Depends(obtener_db)):
    """Lista relaciones jerárquicas activas o históricas."""
    try:
        return await JerarquiaService.listar_relaciones(db, solo_activas=solo_activas)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar relaciones: {str(e)}")


@router.post("/relaciones", response_model=RelacionUsuarioLeer)
async def crear_relacion(
    payload: RelacionUsuarioCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Asigna o reemplaza el superior directo de un usuario."""
    try:
        relacion = await JerarquiaService.asignar_superior(
            db,
            payload.usuario_id,
            payload.superior_id,
            payload.tipo_relacion,
            realizado_por_id=usuario_actual.id,
            observacion=payload.observacion,
        )
        relaciones = await JerarquiaService.listar_relaciones(db)
        return next(item for item in relaciones if item.id == relacion.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear relación: {str(e)}")


@router.patch("/relaciones/{relacion_id}", response_model=RelacionUsuarioLeer)
async def actualizar_relacion(
    relacion_id: int,
    payload: RelacionUsuarioActualizar,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Cambia el superior directo de la relación seleccionada."""
    try:
        relaciones = await JerarquiaService.listar_relaciones(db)
        actual = next((item for item in relaciones if item.id == relacion_id), None)
        if not actual:
            raise HTTPException(status_code=404, detail="Relación no encontrada")

        relacion = await JerarquiaService.asignar_superior(
            db,
            actual.usuario_id,
            payload.superior_id,
            payload.tipo_relacion,
            realizado_por_id=usuario_actual.id,
            observacion=payload.observacion,
        )
        relaciones_actualizadas = await JerarquiaService.listar_relaciones(db)
        return next(item for item in relaciones_actualizadas if item.id == relacion.id)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar relación: {str(e)}")


@router.delete("/relaciones/{relacion_id}", response_model=RelacionUsuarioLeer)
async def desactivar_relacion(
    relacion_id: int,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Desactiva una relación jerárquica activa."""
    try:
        relacion = await JerarquiaService.desactivar_relacion(
            db,
            relacion_id,
            realizado_por_id=usuario_actual.id,
            observacion="Desactivada desde Jerarquía Organizacional",
        )
        return RelacionUsuarioLeer(
            id=relacion.id,
            usuario_id=relacion.usuario_id,
            superior_id=relacion.superior_id,
            tipo_relacion=relacion.tipo_relacion,
            esta_activa=relacion.esta_activa,
            creado_en=relacion.creado_en,
            actualizado_en=relacion.actualizado_en,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al desactivar relación: {str(e)}")
