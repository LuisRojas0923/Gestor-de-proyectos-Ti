from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db, obtener_erp_db_opcional
from app.models.auth.usuario import Usuario, UsuarioPublico, PasswordCambiar, EmailActualizar
from app.services.auth.servicio import ServicioAuth
from app.services.erp import EmpleadosService
from app.services.notifications.email_service import EmailService

router = APIRouter()


async def obtener_usuario_actual_db(
    token: str = Depends(ServicioAuth.oauth2_scheme),
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
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
            # Usuario estándar: existe en ERP pero no persiste localmente (Rol usuario)
            if not db_erp:
                raise HTTPException(
                    status_code=503,
                    detail="Servicio ERP no disponible para validar perfil de usuario",
                )
            from app.services.erp.empleados_service import EmpleadosService

            empleado = await EmpleadosService.obtener_empleado_por_cedula(
                db_erp, cedula
            )
            if not empleado:
                raise HTTPException(
                    status_code=404,
                    detail="Usuario no encontrado en la base local ni en el ERP",
                )

            # Instanciar modelo en memoria para responder al Auth profile
            usuario = Usuario(
                id=f"USR-P-{cedula}",
                cedula=cedula,
                nombre=empleado.get("nombre", "Usuario Portal"),
                hash_contrasena="N/A",
                rol="usuario",  # Asumimos rol usuario para portal estándar
                esta_activo=True,
                area=empleado.get("area"),
                cargo=empleado.get("cargo"),
                sede=empleado.get("ciudadcontratacion"),
                centrocosto=empleado.get("centrocosto"),
                viaticante=bool(empleado.get("viaticante")),
                baseviaticos=empleado.get("baseviaticos"),
            )
            return usuario

        # Si el usuario es local y no tiene area/sede pero hay ERP disponible, sincronizar:
        if db_erp and (not usuario.area or not usuario.sede):
            try:
                usuario = await ServicioAuth.sincronizar_perfil_desde_erp(
                    db, db_erp, usuario
                )
            except Exception as e:
                print(f"DEBUG: ERP no disponible o fallo en sincronizacion local: {e}")

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

    # Fallback para el rol 'usuario' (estándar del portal) si no hay permisos configurados implícitamente
    if not permisos and (usuario.rol == "usuario" or usuario.rol == "user"):
        permisos = ["service-portal"]

    user_data = usuario.model_dump()
    user_data["permissions"] = permisos
    user_data["email_needs_update"] = not usuario.correo_actualizado
    user_data["password_set"] = ServicioAuth.es_password_configurado(usuario.hash_contrasena, usuario.cedula)
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


@router.patch("/update-email", response_model=UsuarioPublico)
async def actualizar_correo(
    datos: EmailActualizar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza el correo corporativo en el sistema y en el ERP"""
    # 1. Validar formato de correo (básico)
    if "@" not in datos.correo or "." not in datos.correo:
        raise HTTPException(status_code=400, detail="Formato de correo inválido")

    # 2. Actualizar en ERP (Solid) - Requiere conexión ERP
    exito_erp = False
    try:
        from app.database import SessionErp
        with SessionErp() as db_erp:
            exito_erp = await EmpleadosService.actualizar_correo_erp(
                db_erp, usuario.cedula, datos.correo
            )
    except Exception as e:
        print(f"DEBUG: Error conectando a ERP para actualizar correo: {e}")
        # No bloqueamos si el ERP falla, pero notificamos el error
        raise HTTPException(status_code=503, detail="No se pudo conectar con el ERP para actualizar el correo")

    if not exito_erp:
        raise HTTPException(status_code=500, detail="Error al actualizar el correo en el ERP")

    # 3. Actualizar localmente
    try:
        usuario.correo = datos.correo
        usuario.correo_actualizado = True
        usuario.correo_verificado = False  # Resetear verificacion al cambiar correo
        db.add(usuario)
        await db.commit()
        await db.refresh(usuario)
        
        # 4. Enviar correo de verificación (Trigger confirmación)
        try:
            from app.config import config
            token = ServicioAuth.crear_token_verificacion(usuario.id)
            verify_url = f"{EmailService.get_frontend_url()}/verify-email?token={token}"
            
            sent = await EmailService.enviar_confirmacion_registro(usuario.correo, usuario.nombre, verify_url)
            if not sent:
                # No bloqueamos la actualización porque ya se hizo en el ERP, pero informamos el fallo de entrega
                raise HTTPException(
                    status_code=400,
                    detail="Correo actualizado en ERP, pero el servidor rechazó el envío de verificación. Por favor verifica tu dirección."
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"WARNING: No se pudo enviar correo de verificacion: {e}")

        return usuario
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar registro local: {str(e)}")


@router.get("/verify-email")
async def confirmar_correo(
    token: str,
    db: AsyncSession = Depends(obtener_db)
):
    """Verifica el token de correo y marca el usuario como verificado"""
    try:
        usuario_id = ServicioAuth.validar_token_verificacion(token)
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Token de verificación inválido o expirado"
            )
        
        from sqlmodel import select
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalars().first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        if usuario.correo_verificado:
            return {"message": "El correo ya estaba verificado"}
            
        usuario.correo_verificado = True
        db.add(usuario)
        await db.commit()
        
        # Enviar notificación de éxito
        try:
            await EmailService.enviar_exito_verificacion(usuario.correo, usuario.nombre)
        except Exception as e:
            print(f"WARNING: No se pudo enviar confirmación de éxito: {e}")
        
        return {"message": "Correo verificado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error inesperado durante la verificación: {str(e)}"
        )


@router.post("/resend-verification")
async def reenviar_verificacion(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Reenvía el correo de verificación al usuario actual"""
    if not usuario.correo or not usuario.correo_actualizado:
        raise HTTPException(status_code=400, detail="No hay un correo corporativo configurado")
    
    if usuario.correo_verificado:
        raise HTTPException(status_code=400, detail="El correo ya se encuentra verificado")
        
    try:
        from app.config import config
        token = ServicioAuth.crear_token_verificacion(usuario.id)
        base_url = (config.hostveremail or config.frontend_url).rstrip("/")
        verify_url = f"{base_url}/verify-email?token={token}"
        
        sent = await EmailService.enviar_confirmacion_registro(usuario.correo, usuario.nombre, verify_url)
        if not sent:
            raise HTTPException(
                status_code=400, 
                detail="El servidor de correo rechazó la entrega. Verifica que la dirección sea correcta o intenta más tarde."
            )
        return {"message": "Correo de verificación reenviado"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al enviar el correo: {str(e)}")
