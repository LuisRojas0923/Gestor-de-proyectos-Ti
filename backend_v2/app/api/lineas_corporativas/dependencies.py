from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth


MODULO_LINEAS_CORPORATIVAS = "lineas_corporativas"


async def requiere_permiso_lineas_corporativas(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_LINEAS_CORPORATIVAS not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para líneas corporativas")
    return usuario


async def requiere_administrador_lineas_corporativas(
    usuario: Usuario = Depends(requiere_permiso_lineas_corporativas),
) -> Usuario:
    if usuario.rol != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo administradores pueden modificar líneas corporativas",
        )
    return usuario
