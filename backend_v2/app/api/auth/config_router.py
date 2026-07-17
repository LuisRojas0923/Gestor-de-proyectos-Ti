"""
Router de Configuración Global del Sistema - Backend V2
"""
import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from app.database import obtener_db
from app.models.auth.usuario import (
    Usuario,
    ModuloSistema,
    ModuloPublico,
    ModuloToggleRequest,
)
from app.api.auth.profile_router import obtener_usuario_actual_db
from app.services.auth.servicio import ServicioAuth
from app.services.auth.protected_rbac_service import actualizar_modulo_protegido
from app.core.config import obtener_configuracion
from app.core.rate_limiter import limiter

_settings = obtener_configuracion()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["configuracion"])


class VerificarAccesoRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class ActualizarMetadatosModuloRequest(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=100)
    categoria: Optional[str] = Field(default=None, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    es_critico: Optional[bool] = None


@router.get("/modulos", response_model=List[ModuloPublico])
async def listar_modulos_sistema(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Lista todos los módulos y su estado global."""
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=403, detail="No tiene permisos para ver esta configuración"
        )

    try:
        result = await db.execute(select(ModuloSistema).order_by(ModuloSistema.categoria))
        return result.scalars().all()
    except SQLAlchemyError as e:
        logger.error("Error DB en listar_modulos_sistema: %s", e)
        raise HTTPException(status_code=503, detail="Error al consultar lista de módulos")


@router.post("/verify-admin")
@limiter.limit(_settings.verify_admin_rate_limit)
async def verificar_password_admin(
    request: Request,
    payload: VerificarAccesoRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """
    Verifica la contraseña del usuario antes de entrar al panel maestro.

    Reglas:
    - Acceso por RBAC dinámico (PermisoRol JOIN ModuloSistema WHERE categoria = 'panel').
      NO se usa whitelist hardcodeada de roles.
    - bcrypt se ejecuta en threadpool para no bloquear el event loop.
    - Toda intento (éxito/fallo) se registra en auditoria_eventos.
    - Rate limit: 5 intentos/5min por (usuario_id:ip) — ver middleware slowapi.
    """
    if not usuario_actual.esta_activo:
        await ServicioAuth.registrar_verificacion_panel(
            db,
            usuario_id=usuario_actual.id,
            rol=usuario_actual.rol,
            exitosa=False,
            motivo="usuario_inactivo",
            direccion_ip=request.client.host if request.client else None,
            agente_usuario=request.headers.get("user-agent"),
        )
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    if not await ServicioAuth.tiene_acceso_panel_admin(db, usuario_actual):
        logger.info(
            "verify-admin DENEGADO por rol: usuario=%s rol=%s",
            usuario_actual.id,
            usuario_actual.rol,
        )
        await ServicioAuth.registrar_verificacion_panel(
            db,
            usuario_id=usuario_actual.id,
            rol=usuario_actual.rol,
            exitosa=False,
            motivo="fallo_sin_permiso",
            direccion_ip=request.client.host if request.client else None,
            agente_usuario=request.headers.get("user-agent"),
        )
        raise HTTPException(
            status_code=403,
            detail="No tiene permisos para acceder al panel maestro",
        )

    try:
        es_valida = await asyncio.to_thread(
            ServicioAuth.verificar_contrasena,
            payload.password,
            usuario_actual.hash_contrasena,
        )
    except Exception as e:
        logger.exception("Error en verificación bcrypt: %s", e)
        raise HTTPException(status_code=500, detail="Error interno de verificación")

    direccion_ip = request.client.host if request.client else None
    agente_usuario = request.headers.get("user-agent")

    if not es_valida:
        logger.warning(
            "verify-admin FAIL: usuario=%s ip=%s",
            usuario_actual.id,
            direccion_ip,
        )
        await ServicioAuth.registrar_verificacion_panel(
            db,
            usuario_id=usuario_actual.id,
            rol=usuario_actual.rol,
            exitosa=False,
            motivo="fallo_contrasena",
            direccion_ip=direccion_ip,
            agente_usuario=agente_usuario,
        )
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    logger.info(
        "verify-admin OK: usuario=%s ip=%s",
        usuario_actual.id,
        direccion_ip,
    )
    await ServicioAuth.registrar_verificacion_panel(
        db,
        usuario_id=usuario_actual.id,
        rol=usuario_actual.rol,
        exitosa=True,
        motivo="exito",
        direccion_ip=direccion_ip,
        agente_usuario=agente_usuario,
    )
    return {"success": True, "message": "Acceso concedido"}


@router.patch("/modulos/{modulo_id}", response_model=ModuloPublico)
async def toggle_modulo_global(
    modulo_id: str,
    payload: ModuloToggleRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Activa o desactiva un módulo de forma global."""
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    try:
        es_valida = await asyncio.to_thread(
            ServicioAuth.verificar_contrasena,
            payload.password_verificacion,
            usuario_actual.hash_contrasena,
        )
    except Exception as e:
        logger.exception("Error bcrypt en toggle_modulo_global: %s", e)
        raise HTTPException(status_code=503, detail="Error al verificar identidad")

    if not es_valida:
        raise HTTPException(status_code=401, detail="Verificación de identidad fallida")

    try:
        result = await db.execute(
            select(ModuloSistema).where(ModuloSistema.id == modulo_id)
        )
        modulo = result.scalars().first()
        if not modulo:
            raise HTTPException(status_code=404, detail="Módulo no encontrado")

        if modulo.es_critico and not payload.esta_activo:
            raise HTTPException(
                status_code=400,
                detail=f"El módulo '{modulo.nombre}' es crítico y no puede desactivarse"
            )

        await actualizar_modulo_protegido(
            db, usuario_actual.id, modulo_id, esta_activo=payload.esta_activo
        )
        await db.commit()
        await db.refresh(modulo)
        return modulo
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error("Error DB en toggle_modulo_global: %s", e)
        raise HTTPException(status_code=503, detail="Error de base de datos al actualizar módulo")


@router.get("/public/check-modules")
async def consultar_estado_modulos_publico(
    db: AsyncSession = Depends(obtener_db),
):
    """Retorna el estado de activación global de todos los módulos (Público)."""
    try:
        result = await db.execute(select(ModuloSistema))
        modulos = result.scalars().all()
        return {m.id: m.esta_activo for m in modulos}
    except SQLAlchemyError as e:
        logger.error("Error DB en consultar_estado_modulos_publico: %s", e)
        raise HTTPException(status_code=503, detail="Servicio de módulos no disponible")


@router.patch("/modulos/{modulo_id}/metadata", response_model=ModuloPublico)
async def actualizar_metadatos_modulo(
    modulo_id: str,
    payload: ActualizarMetadatosModuloRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Permite al administrador personalizar nombre, categoría y descripción de un módulo."""
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    modulo = await db.get(ModuloSistema, modulo_id)
    if not modulo:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")

    await actualizar_modulo_protegido(
        db,
        usuario_actual.id,
        modulo_id,
        nombre=payload.nombre,
        categoria=payload.categoria,
        descripcion=payload.descripcion,
        es_critico=payload.es_critico,
    )
    await db.commit()
    await db.refresh(modulo)
    return modulo
