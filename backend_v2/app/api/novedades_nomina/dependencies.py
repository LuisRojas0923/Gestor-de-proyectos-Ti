from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth


MODULO_NOMINA_NOVEDADES = "nomina_novedades"


async def requiere_permiso_nomina_novedades(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_NOMINA_NOVEDADES not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para novedades de nómina")
    return usuario
