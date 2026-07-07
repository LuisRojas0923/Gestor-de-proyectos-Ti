"""Sub-router de parámetros editables de cálculo de horas extras."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras_parametros import (
    ParametrosCalculoRead,
    ParametrosCalculoUpdateRequest,
)
from ....services.novedades_nomina.horas_extras_parametros import (
    actualizar_parametros_calculo,
    listar_parametros_calculo,
)
from .horas_extras_permisos import requiere_permiso_he_admin

router = APIRouter(
    tags=["Nómina - Horas Extras"],
)

@router.get("/parametros-calculo", response_model=ParametrosCalculoRead)
async def obtener_parametros_calculo(
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_admin),
):
    return await listar_parametros_calculo(db)


@router.put("/parametros-calculo", response_model=ParametrosCalculoRead)
async def guardar_parametros_calculo(
    payload: ParametrosCalculoUpdateRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_admin),
):
    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        return await actualizar_parametros_calculo(db, payload, usuario_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
