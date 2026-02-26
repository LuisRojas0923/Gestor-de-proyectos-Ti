from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db
from app.models.auth.usuario import Usuario, UsuarioPublico, PasswordCambiar
from app.services.auth.servicio import ServicioAuth

router = APIRouter()


async def obtener_usuario_actual_db(
    token: str = Depends(ServicioAuth.oauth2_scheme),
    db: AsyncSession = Depends(obtener_db),
):
    """Dependencia para obtener el objeto usuario completo del token y sincronizar si es necesario"""
    try:
        cedula = ServicioAuth.obtener_cedula_desde_token(token)
        if not cedula:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if not usuario.area or not usuario.sede:
            from app.database import SessionErp

            try:
                with SessionErp() as db_erp:
                    usuario = await ServicioAuth.sincronizar_perfil_desde_erp(
                        db, db_erp, usuario
                    )
            except Exception as e:
                print(f"DEBUG: ERP no disponible o fallo en sincronizacion: {e}")

        return usuario
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al validar usuario: {str(e)}"
        )


@router.get("/yo")
async def obtener_usuario_actual(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Endpoint para obtener los datos del usuario actual con sus permisos"""
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    user_data = usuario.model_dump()
    user_data["permissions"] = permisos
    return user_data


@router.patch("/password", response_model=UsuarioPublico)
async def cambiar_contrasena(
    datos: PasswordCambiar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Cambia la contrasena del usuario actual"""
    try:
        if not ServicioAuth.verificar_contrasena(
            datos.contrasena_actual, usuario.hash_contrasena
        ):
            raise HTTPException(
                status_code=400, detail="La contrasena actual es incorrecta"
            )
        return await ServicioAuth.cambiar_contrasena(
            db, usuario.id, datos.nueva_contrasena
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al cambiar contrasena: {str(e)}"
        )
