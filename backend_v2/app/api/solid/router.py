import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from typing import List
from ...models.solid.solid import ModuloSolid, ComponenteSolid
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db

from app.utils_cache import global_cache

router = APIRouter()


@router.get("/modulos", response_model=List[ModuloSolid])
async def listar_modulos(sesion: AsyncSession = Depends(obtener_db)):
    """Lista todos los modulos de SOLID con cache"""
    cache_key = "solid_modulos"
    cached_data = global_cache.get(cache_key)
    if cached_data:
        return cached_data

    try:
        st = select(ModuloSolid)
        resultado = (await sesion.execute(st)).scalars().all()
        global_cache.set(cache_key, resultado)
        return resultado
    except Exception as e:
        logging.error(f"Error en GET /solid/modulos: {e}")
        raise HTTPException(status_code=500, detail="Error al consultar módulos SOLID")


@router.get("/modulos/{modulo_id}/componentes", response_model=List[ComponenteSolid])
async def listar_componentes(
    modulo_id: int, sesion: AsyncSession = Depends(obtener_db)
):
    """Lista los componentes de un modulo especifico"""
    try:
        st = select(ComponenteSolid).where(ComponenteSolid.modulo_id == modulo_id)
        resultado = (await sesion.execute(st)).scalars().all()
        return resultado
    except Exception as e:
        logging.error(f"Error en GET /solid/modulos/{modulo_id}/componentes: {e}")
        raise HTTPException(status_code=500, detail="Error al consultar componentes")
