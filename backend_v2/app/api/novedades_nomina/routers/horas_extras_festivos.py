"""
S5' — Router de festivos nacionales (Calendarific + Ley Emiliani fallback).

Mantiene su propio router con el mismo prefijo '/horas-extras' para poder
incluirse desde `horas_extras.py` sin reescribir la lógica de permisos.

Endpoints:
  GET  /horas-extras/festivos/{anio}             Lista festivos del año
  POST /horas-extras/festivos/{anio}/sincronizar Sincroniza desde Calendarific
                                                 (fallback Ley Emiliani)
"""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....api.auth.profile_router import obtener_usuario_actual_db
from ....models.auth.usuario import Usuario
from ....services.auth.servicio import ServicioAuth
from ....models.novedades_nomina.schemas_horas_extras import (
    FestivoRead,
    FestivoSincronizarResult,
)
from ....services.novedades_nomina.festivos_service import (
    listar_festivos,
    sincronizar_festivos,
)

logger = logging.getLogger(__name__)

MODULO_HE = "nomina_horas_extras"

router = APIRouter()


async def requiere_permiso_he(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_HE not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para Horas Extras")
    return usuario


@router.get("/festivos/{anio}", response_model=List[FestivoRead],
            dependencies=[Depends(requiere_permiso_he)])
async def listar_festivos_endpoint(
    anio: int = Path(..., ge=2000, le=2100),
    fuente: str = Query("auto", pattern="^(auto|calendarific|emiliani)$"),
    db: AsyncSession = Depends(obtener_db),
):
    """
    Lista los festivos nacionales de Colombia para el año.

    fuente=auto: lee de DB si hay; si no, calcula con Ley Emiliani.
    fuente=emiliani: siempre calcula con Ley Emiliani.
    fuente=calendarific: solo de DB (si no hay, retorna []).
    """
    return await listar_festivos(db, anio, fuente=fuente)


@router.post("/festivos/{anio}/sincronizar", response_model=FestivoSincronizarResult,
             dependencies=[Depends(requiere_permiso_he)])
async def sincronizar_festivos_endpoint(
    anio: int = Path(..., ge=2000, le=2100),
    db: AsyncSession = Depends(obtener_db),
):
    """
    Sincroniza los festivos del año. Intenta Calendarific primero;
    si la key no está o falla, persiste el resultado de Ley Emiliani.
    """
    return await sincronizar_festivos(db, anio)
