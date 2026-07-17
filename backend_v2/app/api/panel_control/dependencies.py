"""Dependencias de autorización del Panel Control."""
from fastapi import Depends, HTTPException

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario


async def requerir_admin_panel(
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    if usuario.rol not in ("admin", "admin_sistemas"):
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    return usuario
