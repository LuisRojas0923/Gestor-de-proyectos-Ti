"""Sub-router de parámetros editables de cálculo de horas extras."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ....api.auth.profile_router import obtener_usuario_actual_db
from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras_parametros import (
    ParametrosCalculoRead,
    ParametrosCalculoUpdateRequest,
)
from ....services.auth.servicio import ServicioAuth
from ....services.novedades_nomina.horas_extras_parametros import (
    actualizar_parametros_calculo,
    listar_parametros_calculo,
)

router = APIRouter(
    prefix="/horas-extras",
    tags=["Nómina - Horas Extras"],
)

MODULO_HE = "nomina_horas_extras"


async def requiere_permiso_he(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_HE not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para Horas Extras")
    return usuario


@router.get("/parametros-calculo", response_model=ParametrosCalculoRead)
async def obtener_parametros_calculo(
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
):
    return await listar_parametros_calculo(db)


@router.put("/parametros-calculo", response_model=ParametrosCalculoRead)
async def guardar_parametros_calculo(
    payload: ParametrosCalculoUpdateRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        return await actualizar_parametros_calculo(db, payload, usuario_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
