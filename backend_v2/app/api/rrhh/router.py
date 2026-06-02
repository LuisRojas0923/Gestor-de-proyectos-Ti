"""
Router principal del módulo RRHH — Requisición de Personal (RP).
Endpoints del solicitante + inclusión de sub-routers de aprobación, GH y catálogos.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db
from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.models.rrhh.historial import (
    HistorialRequisicion,
    ComentarioRequisicion,
    RequisicionEquipoOficina,
    RequisicionEquipoTecnologico,
)
from app.api.rrhh.schemas import (
    RequisicionCreate, RequisicionOut, RequisicionDetalle,
    HistorialOut, ComentarioOut, ComentarioCreate,
    EquipoOut,
)
import app.services.rrhh.requisicion_service as svc
import app.services.rrhh.email_rp_service as mail

# Sub-routers
from .catalogos_router import router as catalogos_router
from .aprobacion_router import router as aprobacion_router
from .gestion_humana_router import router as gh_router

router = APIRouter()

# Incluir sub-routers bajo el mismo prefijo raíz
router.include_router(catalogos_router)
router.include_router(aprobacion_router)
router.include_router(gh_router)


# ──────────────────────────────────────────────
# Dashboard — métricas resumidas
# ──────────────────────────────────────────────
@router.get("/requisiciones/dashboard")
async def dashboard_requisiciones(
    correo_solicitante: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db)
):
    """Retorna contadores por estado para el dashboard del módulo."""
    query = select(RequisicionPersonal)
    if correo_solicitante:
        query = query.where(RequisicionPersonal.correo_solicitante == correo_solicitante)
    result = await db.execute(query)  # [CONTROLADO]
    todas = result.scalars().all()
    conteo = {estado: 0 for estado in EstadoRP.LABELS}
    for r in todas:
        if r.estado in conteo:
            conteo[r.estado] += 1
    return {
        "total": len(todas),
        "por_estado": conteo,
        "labels": EstadoRP.LABELS,
    }


# ──────────────────────────────────────────────
# Mis requisiciones (solicitante)
# ──────────────────────────────────────────────
@router.get("/requisiciones/mis-requisiciones", response_model=List[RequisicionOut])
async def mis_requisiciones(
    correo_solicitante: str,
    db: AsyncSession = Depends(obtener_db),
):
    """Lista las requisiciones del solicitante autenticado."""
    result = await db.execute(  # [CONTROLADO]
        select(RequisicionPersonal)
        .where(RequisicionPersonal.correo_solicitante == correo_solicitante)
        .order_by(RequisicionPersonal.created_at.desc())
    )
    return result.scalars().all()


# ──────────────────────────────────────────────
# Guardar borrador
# ──────────────────────────────────────────────
@router.post("/requisiciones/borrador", response_model=RequisicionOut, status_code=status.HTTP_201_CREATED)
async def guardar_borrador(
    payload: RequisicionCreate,
    correo_solicitante: str,
    nombre_solicitante: str,
    requisicion_id: Optional[int] = None,
    db: AsyncSession = Depends(obtener_db),
):
    """Crea o actualiza una requisición en estado BORRADOR."""
    try:
        data = payload.model_dump()
        # Resolver nombres de área y cargo para desnormalización
        if payload.area_id:
            from app.models.rrhh.catalogos import AreaRP, CargoRP
            area = await db.get(AreaRP, payload.area_id)
            if area:
                data["area_nombre"] = area.nombre
        if payload.cargo_id:
            from app.models.rrhh.catalogos import CargoRP
            cargo = await db.get(CargoRP, payload.cargo_id)
            if cargo:
                data["cargo_nombre"] = cargo.nombre


        req = await svc.crear_o_actualizar_borrador(
            db, data, nombre_solicitante, correo_solicitante, requisicion_id
        )
        return req
    except (PermissionError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────
# Enviar a aprobación
# ──────────────────────────────────────────────
@router.post("/requisiciones/{requisicion_id}/enviar", response_model=RequisicionOut)
async def enviar_a_aprobacion(
    requisicion_id: int,
    correo_solicitante: str,
    nombre_solicitante: str,
    db: AsyncSession = Depends(obtener_db),
):
    """Genera el RP, asigna aprobador y cambia estado a PENDIENTE_APROBACION."""
    try:
        req = await svc.enviar_a_aprobacion(
            db, requisicion_id, nombre_solicitante, correo_solicitante
        )
        try:
            await mail.notificar_radicacion(req, nombre_solicitante)
            await mail.notificar_aprobador(req, req.perfil_requerido)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error: {e}")
        return req
    except (PermissionError, ValueError) as e:
        status_code = 403 if isinstance(e, PermissionError) else 400
        raise HTTPException(status_code=status_code, detail=str(e))


# ──────────────────────────────────────────────
# Detalle de una requisición
# ──────────────────────────────────────────────
@router.get("/requisiciones/{requisicion_id}", response_model=RequisicionDetalle)
async def detalle_requisicion(
    requisicion_id: int,
    db: AsyncSession = Depends(obtener_db),
):
    """Retorna la requisición completa con equipos, historial y comentarios."""
    result = await db.execute(  # [CONTROLADO]
        select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requisición no encontrada")

    # Cargar relaciones manualmente (evitar lazy loading)
    equipos_of = (await db.execute(  # [CONTROLADO]
        select(RequisicionEquipoOficina).where(RequisicionEquipoOficina.requisicion_id == requisicion_id)
    )).scalars().all()

    equipos_tec = (await db.execute(  # [CONTROLADO]
        select(RequisicionEquipoTecnologico).where(RequisicionEquipoTecnologico.requisicion_id == requisicion_id)
    )).scalars().all()

    historial = (await db.execute(  # [CONTROLADO]
        select(HistorialRequisicion)
        .where(HistorialRequisicion.requisicion_id == requisicion_id)
        .order_by(HistorialRequisicion.fecha_evento)
    )).scalars().all()

    comentarios = (await db.execute(  # [CONTROLADO]
        select(ComentarioRequisicion)
        .where(ComentarioRequisicion.requisicion_id == requisicion_id)
        .order_by(ComentarioRequisicion.fecha_comentario)
    )).scalars().all()

    return RequisicionDetalle(
        **req.model_dump(),
        equipos_oficina=equipos_of,
        equipos_tecnologicos=equipos_tec,
        historial=historial,
        comentarios=comentarios,
    )


# ──────────────────────────────────────────────
# Editar requisición (BORRADOR o DEVUELTA)
# ──────────────────────────────────────────────
@router.put("/requisiciones/{requisicion_id}", response_model=RequisicionOut)
async def editar_requisicion(
    requisicion_id: int,
    payload: RequisicionCreate,
    correo_solicitante: str,
    nombre_solicitante: str,
    db: AsyncSession = Depends(obtener_db),
):
    """Actualiza campos de una requisición en BORRADOR o DEVUELTA_AJUSTE."""
    try:
        data = payload.model_dump()
        req = await svc.crear_o_actualizar_borrador(
            db, data, nombre_solicitante, correo_solicitante, requisicion_id
        )
        return req
    except (PermissionError, ValueError) as e:
        status_code = 403 if isinstance(e, PermissionError) else 400
        raise HTTPException(status_code=status_code, detail=str(e))


# ──────────────────────────────────────────────
# Agregar comentario
# ──────────────────────────────────────────────
@router.post("/requisiciones/{requisicion_id}/comentarios", response_model=ComentarioOut,
             status_code=status.HTTP_201_CREATED)
async def agregar_comentario(
    requisicion_id: int,
    payload: ComentarioCreate,
    usuario_nombre: str,
    usuario_email: str,
    db: AsyncSession = Depends(obtener_db),
):
    comentario = ComentarioRequisicion(
        requisicion_id=requisicion_id,
        usuario_nombre=usuario_nombre,
        usuario_email=usuario_email,
        comentario=payload.comentario,
    )
    db.add(comentario)
    await db.commit()
    await db.refresh(comentario)
    return comentario


# ──────────────────────────────────────────────
# Cancelar requisición (baja lógica)
# ──────────────────────────────────────────────
@router.post("/requisiciones/{requisicion_id}/cancelar", response_model=RequisicionOut)
async def cancelar_requisicion(
    requisicion_id: int,
    correo_solicitante: str,
    nombre_solicitante: str,
    observacion: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db),
):
    """Solo cancela requisiciones en BORRADOR. GH cancela las demás."""
    result = await db.execute(  # [CONTROLADO]
        select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requisición no encontrada")
    if req.estado != EstadoRP.BORRADOR:
        raise HTTPException(
            status_code=403,
            detail="Solo se puede cancelar un borrador directamente. Use Gestión Humana para otras cancelaciones."
        )

    from datetime import datetime
    req.estado = EstadoRP.CANCELADA
    req.fecha_cierre = datetime.utcnow()
    req.observacion_cierre = observacion
    req.updated_at = datetime.utcnow()

    await svc.registrar_historial(
        db, req.id, EstadoRP.BORRADOR, EstadoRP.CANCELADA,
        nombre_solicitante, correo_solicitante, observacion or "Cancelado por el solicitante"
    )
    await db.commit()
    await db.refresh(req)
    return req
