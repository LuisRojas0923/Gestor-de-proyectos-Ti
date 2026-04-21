from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db
from app.models.auth.usuario import LoginRequest
from app.services.auth.servicio import ServicioAuth

router = APIRouter()


@router.get("/viaticos/status/{cedula}")
async def obtener_estado_viaticos(cedula: str, db: AsyncSession = Depends(obtener_db)):
    """Verifica si un empleado ya tiene su contraseña configurada"""
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if not usuario:
        return {"registrado": False}
    
    # Verificamos si la contraseña NO es la temporal de auto-provisionamiento
    esta_configurado = ServicioAuth.es_password_configurado(usuario.hash_contrasena)
    return {"registrado": esta_configurado}


@router.post("/viaticos/configurar")
async def configurar_password_viaticos(
    datos: LoginRequest,
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db),
):
    """Permite a un empleado del portal configurar su contraseña por primera vez o actualizar la temporal"""
    try:
        # Primero intentamos obtener el usuario existente
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, datos.cedula)
        
        if usuario:
            # Si el usuario ya tiene una contraseña real, no permitimos "re-configurar" por aquí
            if ServicioAuth.es_password_configurado(usuario.hash_contrasena):
                raise HTTPException(status_code=400, detail="El usuario ya tiene una contraseña configurada")
            
            # Si tiene la contraseña temporal, la actualizamos
            usuario_actualizado = await ServicioAuth.cambiar_contrasena(
                db, usuario.id, datos.contrasena
            )
            return {
                "mensaje": "Contraseña configurada exitosamente",
                "usuario": usuario_actualizado.nombre,
            }
        else:
            # Si por alguna razón no existe (no debería pasar con auto-provision), lo creamos
            usuario_nuevo = await ServicioAuth.crear_usuario_portal_desde_erp(
                db, db_erp, datos.cedula, datos.contrasena
            )
            return {
                "mensaje": "Usuario y contraseña creados exitosamente",
                "usuario": usuario_nuevo.nombre,
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
