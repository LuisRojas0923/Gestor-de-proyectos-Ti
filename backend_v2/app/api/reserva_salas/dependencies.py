from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth


MODULO_RESERVA_SALAS = "reserva_salas"
MODULO_RESERVA_SALAS_ADMIN = "reserva_salas_admin"


async def requiere_permiso_reserva_salas(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_RESERVA_SALAS not in permisos:
        raise HTTPException(
            status_code=403, detail="Sin permiso para reserva de salas"
        )
    return usuario


async def requiere_administrador_reserva_salas(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_RESERVA_SALAS_ADMIN not in permisos:
        raise HTTPException(
            status_code=403,
            detail="Requiere permisos de administrador de salas",
        )
    return usuario
