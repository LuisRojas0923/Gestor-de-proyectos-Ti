from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db
from app.models.auth.usuario import LoginRequest
from app.services.auth.servicio import ServicioAuth

router = APIRouter()


@router.get("/viaticos/status/{cedula}")
async def obtener_estado_viaticos(cedula: str, db: AsyncSession = Depends(obtener_db)):
    """Verifica si un empleado ya existe en la tabla de usuarios"""
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    return {"registrado": usuario is not None}


@router.post("/viaticos/configurar")
async def configurar_password_viaticos(
    datos: LoginRequest,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db),
):
    """Permite a un empleado del portal configurar su contraseña por primera vez"""
    try:
        usuario = await ServicioAuth.crear_usuario_portal_desde_erp(
            db, db_erp, datos.cedula, datos.contrasena
        )
        return {
            "mensaje": "Contraseña configurada exitosamente",
            "usuario": usuario.nombre,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/viaticos/verificar")
async def verificar_password_viaticos(
    datos: LoginRequest, db: AsyncSession = Depends(obtener_db)
):
    """Valida la contraseña de viáticos sin iniciar una sesión administrativa"""
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, datos.cedula)

    if not usuario or not ServicioAuth.verificar_contrasena(
        datos.contrasena, usuario.hash_contrasena
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña incorrecta"
        )

    return {"mensaje": "Identidad verificada", "nombre": usuario.nombre}
