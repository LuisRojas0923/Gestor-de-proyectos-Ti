from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel
from typing import List
from ...models.solid.solid import ModuloSolid, ComponenteSolid, OpcionSolid
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, async_engine

from app.utils_cache import global_cache

router = APIRouter()

@router.get("/modulos", response_model=List[ModuloSolid])
async def listar_modulos(sesion: AsyncSession = Depends(obtener_db)):
    """Lista todos los modulos de SOLID con cache"""
    cache_key = "solid_modulos"
    cached_data = global_cache.get(cache_key)
    if cached_data:
        return cached_data
        
    st = select(ModuloSolid)
    resultado = (await sesion.execute(st)).scalars().all()
    global_cache.set(cache_key, resultado)
    return resultado

@router.get("/modulos/{modulo_id}/componentes", response_model=List[ComponenteSolid])
async def listar_componentes(modulo_id: int, sesion: AsyncSession = Depends(obtener_db)):
    """Lista los componentes de un modulo especifico"""
    st = select(ComponenteSolid).where(ComponenteSolid.modulo_id == modulo_id)
    resultado = (await sesion.execute(st)).scalars().all()
    return resultado

@router.post("/seed")
async def seed_solid(sesion: AsyncSession = Depends(obtener_db)):
    """Sembrado inicial de modulos SOLID y creacion de tablas si no existen"""
    # 1. Asegurar que las tablas existan
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    # 2. Sembrar datos
    modulos_data = [
        {"nombre": "Viaticos", "descripcion": "Gestion de gastos y desplazamientos", "version_actual": "1.0.0"},
        {"nombre": "Establecimiento", "descripcion": "Gestion de puntos de venta y locales", "version_actual": "1.0.0"}
    ]
    
    mensajes = []
    for mod_data in modulos_data:
        st = select(ModuloSolid).where(ModuloSolid.nombre == mod_data["nombre"])
        res = await sesion.execute(st)
        existe = res.scalars().first()
        if not existe:
            nuevo_mod = ModuloSolid(**mod_data)
            sesion.add(nuevo_mod)
            mensajes.append(f"Modulo {mod_data['nombre']} creado")
        else:
            mensajes.append(f"Modulo {mod_data['nombre']} ya existe")
            
    await sesion.commit()
    return {"resultado": mensajes}
