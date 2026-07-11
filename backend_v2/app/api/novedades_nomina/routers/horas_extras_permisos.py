"""Dependencias RBAC granulares para Horas Extras."""
from typing import Sequence

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ....api.auth.profile_router import obtener_usuario_actual_db
from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....services.auth.servicio import ServicioAuth

PERMISO_HE_LEER = "nomina_horas_extras.leer"
PERMISO_HE_PLANIFICAR = "nomina_horas_extras.planificar"
PERMISO_HE_CONFIRMAR = "nomina_horas_extras.confirmar"
PERMISO_HE_COMPENSAR = "nomina_horas_extras.compensar"
PERMISO_HE_ADMIN = "nomina_horas_extras.admin"
PERMISO_PLANTILLAS_ADMIN = "nomina_horas_extras.plantillas_horario.administrar"
PERMISOS_HE_GRANULARES = (
    PERMISO_HE_LEER,
    PERMISO_HE_PLANIFICAR,
    PERMISO_HE_CONFIRMAR,
    PERMISO_HE_COMPENSAR,
    PERMISO_HE_ADMIN,
)


async def validar_permiso_he(
    db: AsyncSession,
    usuario: Usuario,
    permiso_requerido: str | Sequence[str],
) -> Usuario:
    permisos_usuario = set(await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol))
    requeridos = (
        {permiso_requerido}
        if isinstance(permiso_requerido, str)
        else set(permiso_requerido)
    )
    if permisos_usuario.isdisjoint(requeridos):
        raise HTTPException(status_code=403, detail="Sin permiso para Horas Extras")
    return usuario


async def requiere_permiso_he_leer(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    return await validar_permiso_he(db, usuario, PERMISO_HE_LEER)


async def requiere_permiso_he_planificar(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    return await validar_permiso_he(db, usuario, PERMISO_HE_PLANIFICAR)


async def requiere_permiso_he_confirmar(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    return await validar_permiso_he(db, usuario, PERMISO_HE_CONFIRMAR)


async def requiere_permiso_he_compensar(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    return await validar_permiso_he(db, usuario, PERMISO_HE_COMPENSAR)


async def requiere_permiso_he_admin(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    return await validar_permiso_he(db, usuario, PERMISO_HE_ADMIN)


async def requiere_permiso_plantillas_administrar(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    return await validar_permiso_he(db, usuario, PERMISO_PLANTILLAS_ADMIN)
