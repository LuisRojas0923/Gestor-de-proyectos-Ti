"""
Router de Configuración Global del Sistema - Backend V2
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select
from datetime import datetime
from typing import List

from app.database import obtener_db
from app.models.auth.usuario import (
    Usuario,
    ModuloSistema,
    ModuloPublico,
    ModuloToggleRequest,
)
from app.api.auth.profile_router import obtener_usuario_actual_db
from app.services.auth.servicio import ServicioAuth

router = APIRouter(prefix="/config", tags=["configuracion"])


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
        print(f"Error DB en listar_modulos_sistema: {e}")
        raise HTTPException(status_code=503, detail="Error al consultar lista de módulos")


@router.post("/verify-admin")
async def verificar_password_admin(
    payload: dict, usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """Verifica la contraseña del admin antes de entrar al panel maestro."""
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=403, detail="Solo administradores pueden acceder"
        )

    password = payload.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Contraseña requerida")

    es_valida = ServicioAuth.verificar_contrasena(
        password, usuario_actual.hash_contrasena
    )
    if not es_valida:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

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

    # 1. Verificar contraseña nuevamente para la acción crítica
    es_valida = ServicioAuth.verificar_contrasena(
        payload.password_verificacion, usuario_actual.hash_contrasena
    )
    if not es_valida:
        raise HTTPException(status_code=401, detail="Verificación de identidad fallida")

    try:
        # 2. Buscar módulo
        result = await db.execute(
            select(ModuloSistema).where(ModuloSistema.id == modulo_id)
        )
        modulo = result.scalars().first()
        if not modulo:
            raise HTTPException(status_code=404, detail="Módulo no encontrado")

        # 3. Validar si es crítico y se intenta desactivar
        if modulo.es_critico and not payload.esta_activo:
            # Podríamos permitirlo pero con una advertencia extra o simplemente prohibirlo si es vital
            pass

        # 4. Actualizar
        modulo.esta_activo = payload.esta_activo
        modulo.actualizado_en = datetime.now()

        await db.commit()
        await db.refresh(modulo)
        return modulo
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en toggle_modulo_global: {e}")
        raise HTTPException(status_code=503, detail="Error de base de datos al actualizar módulo")


@router.post("/modulos", response_model=ModuloPublico)
async def crear_modulo_sistema(
    payload: dict,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Registra manualmente un nuevo módulo en el sistema."""
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    modulo_id = payload.get("id")
    if not modulo_id:
        raise HTTPException(status_code=400, detail="ID de módulo requerido")

    # Verificar si ya existe
    existe = await db.get(ModuloSistema, modulo_id)
    if existe:
        raise HTTPException(
            status_code=400, detail="El ID del módulo ya está registrado"
        )

    nuevo_modulo = ModuloSistema(
        id=modulo_id,
        nombre=payload.get("nombre", modulo_id.title()),
        categoria=payload.get("categoria", "otros"),
        descripcion=payload.get("descripcion"),
        esta_activo=payload.get("esta_activo", True),
        es_critico=payload.get("es_critico", False),
    )

    db.add(nuevo_modulo)
    await db.commit()
    await db.refresh(nuevo_modulo)
    return nuevo_modulo


@router.post("/init-modulos")
async def inicializar_modulos_sistema(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Sincroniza dinámicamente el catálogo de módulos desde los permisos existentes."""
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede inicializar")

    from app.models.auth.usuario import PermisoRol

    # Discovery Dinámico (Limpio para Producción)
    result_modulos = await db.execute(select(PermisoRol.modulo).distinct())
    modulos_descubiertos = result_modulos.scalars().all()

    count: int = 0
    for mod_id in modulos_descubiertos:
        if not mod_id:
            continue
        # Si el módulo no existe en el maestro, registrarlo
    try:
        # Discovery Dinámico (Limpio para Producción)
        result_modulos = await db.execute(select(PermisoRol.modulo).distinct())
        modulos_descubiertos = result_modulos.scalars().all()

        count: int = 0
        for mod_id in modulos_descubiertos:
            if not mod_id:
                continue
            # Si el módulo no existe en el maestro, registrarlo
            exists = await db.get(ModuloSistema, mod_id)
            if not exists:
                nuevo_m = ModuloSistema(
                    id=mod_id,
                    nombre=mod_id.replace("_", " ").replace("-", " ").title(),
                    categoria="otros",
                    esta_activo=True,
                    es_critico=False,
                )
                db.add(nuevo_m)
                count = count + 1

        await db.commit()
        return {"message": f"Se sincronizaron {count} módulos nuevos descubiertos."}
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en inicializar_modulos_sistema: {e}")
        raise HTTPException(status_code=503, detail="Error de base de datos al inicializar módulos")


@router.get("/public/check-modules")
async def consultar_estado_modulos_publico(
    db: AsyncSession = Depends(obtener_db),
):
    """Retorna el estado de activación global de todos los módulos (Público)."""
    try:
        result = await db.execute(select(ModuloSistema))
        modulos = result.scalars().all()
        # Retornamos un diccionario simple para fácil consumo en el frontend
        return {m.id: m.esta_activo for m in modulos}
    except SQLAlchemyError as e:
        print(f"Error DB en consultar_estado_modulos_publico: {e}")
        raise HTTPException(status_code=503, detail="Servicio de módulos no disponible")


@router.patch("/modulos/{modulo_id}/metadata", response_model=ModuloPublico)
async def actualizar_metadatos_modulo(
    modulo_id: str,
    payload: dict,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Permite al administrador personalizar nombre, categoría y descripción de un módulo."""
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    modulo = await db.get(ModuloSistema, modulo_id)
    if not modulo:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")

    # Actualización selectiva de metadatos
    if "nombre" in payload:
        modulo.nombre = payload["nombre"]
    if "categoria" in payload:
        modulo.categoria = payload["categoria"]
    if "descripcion" in payload:
        modulo.descripcion = payload["descripcion"]
    if "es_critico" in payload:
        modulo.es_critico = payload["es_critico"]

    modulo.actualizado_en = datetime.now()

    await db.commit()
    await db.refresh(modulo)
    return modulo
