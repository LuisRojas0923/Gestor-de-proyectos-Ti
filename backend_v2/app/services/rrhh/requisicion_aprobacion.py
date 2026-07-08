"""
Servicio principal de Requisición de Personal (RP)
Lógica de negocio: generación RP, transiciones de estado, historial, validaciones de rol.
"""
import logging
from typing import Optional, List
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlmodel import select as sqlmodel_select

from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.models.rrhh.catalogos import AprobadorAreaRP, AreaRP
from app.models.auth.usuario import Usuario, RelacionUsuario
from app.models.rrhh.historial import (
    HistorialRequisicion,
    RequisicionEquipoOficina,
    RequisicionEquipoTecnologico,
)
from .requisicion_core import (
    generar_numero_rp,
    obtener_aprobador_de_area,
    registrar_historial,
    _crear_vacantes_en_jerarquia,
    _limpiar_vacantes_en_jerarquia
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Generación del número RP (atómica / sin duplicados)
# ──────────────────────────────────────────────
async def aprobar_requisicion(
    db: AsyncSession,
    requisicion_id: int,
    aprobador_nombre: str,
    aprobador_email: str,
    observacion: Optional[str] = None,
) -> RequisicionPersonal:
    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")
    if req.estado != EstadoRP.PENDIENTE_APROBACION:
        raise PermissionError(f"Solo se puede aprobar desde PENDIENTE_APROBACION, estado actual: '{req.estado}'")

    estado_anterior = req.estado
    req.estado = EstadoRP.PENDIENTE_APROBACION_GERENCIA
    req.aprobador_nombre = aprobador_nombre
    req.aprobador_email = aprobador_email
    req.fecha_decision_aprobador = datetime.utcnow()
    req.observacion_aprobador = observacion
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.PENDIENTE_APROBACION_GERENCIA,
        aprobador_nombre, aprobador_email, observacion,
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} APROBADA POR DIRECTOR por {aprobador_email}, pasa a PENDIENTE_APROBACION_GERENCIA")
    return req


# ──────────────────────────────────────────────
# Aprobación Gerencial (Firma de Gerencia)
# ──────────────────────────────────────────────
async def aprobar_gerente(
    db: AsyncSession,
    requisicion_id: int,
    gerente_nombre: str,
    gerente_email: str,
    observacion: Optional[str] = None,
) -> RequisicionPersonal:
    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")
    if req.estado != EstadoRP.PENDIENTE_APROBACION_GERENCIA:
        raise PermissionError(f"Solo se puede aprobar por gerencia desde PENDIENTE_APROBACION_GERENCIA, estado actual: '{req.estado}'")

    estado_anterior = req.estado
    req.estado = EstadoRP.APROBADA
    req.gerente_nombre = gerente_nombre
    req.gerente_email = gerente_email
    req.fecha_decision_gerente = datetime.utcnow()
    req.observacion_gerente = observacion
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.APROBADA,
        gerente_nombre, gerente_email, observacion,
    )

    try:
        await _crear_vacantes_en_jerarquia(db, req)
    except Exception as e:
        logger.error(f"[Vacantes] Error al crear vacantes para {req.rp}: {str(e)}")

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} APROBADA POR GERENCIA por {gerente_email}")
    return req


async def rechazar_gerente(
    db: AsyncSession,
    requisicion_id: int,
    gerente_nombre: str,
    gerente_email: str,
    observacion: str,
) -> RequisicionPersonal:
    if not observacion or not observacion.strip():
        raise ValueError("La observación es obligatoria para rechazar una requisición")

    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")
    if req.estado != EstadoRP.PENDIENTE_APROBACION_GERENCIA:
        raise PermissionError(f"Solo se puede rechazar por gerencia desde PENDIENTE_APROBACION_GERENCIA")

    estado_anterior = req.estado
    req.estado = EstadoRP.RECHAZADA
    req.gerente_nombre = gerente_nombre
    req.gerente_email = gerente_email
    req.fecha_decision_gerente = datetime.utcnow()
    req.observacion_gerente = observacion
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.RECHAZADA,
        gerente_nombre, gerente_email, observacion,
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} RECHAZADA POR GERENCIA por {gerente_email}")
    return req


async def devolver_gerente(
    db: AsyncSession,
    requisicion_id: int,
    gerente_nombre: str,
    gerente_email: str,
    observacion: str,
) -> RequisicionPersonal:
    if not observacion or not observacion.strip():
        raise ValueError("La observación es obligatoria para devolver una requisición")

    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")
    if req.estado != EstadoRP.PENDIENTE_APROBACION_GERENCIA:
        raise PermissionError(f"Solo se puede devolver por gerencia desde PENDIENTE_APROBACION_GERENCIA")

    estado_anterior = req.estado
    req.estado = EstadoRP.DEVUELTA_AJUSTE
    req.gerente_nombre = gerente_nombre
    req.gerente_email = gerente_email
    req.fecha_decision_gerente = datetime.utcnow()
    req.observacion_gerente = observacion
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.DEVUELTA_AJUSTE,
        gerente_nombre, gerente_email, observacion,
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} DEVUELTA POR GERENCIA por {gerente_email}")
    return req


# ──────────────────────────────────────────────
# Rechazar
# ──────────────────────────────────────────────
async def rechazar_requisicion(
    db: AsyncSession,
    requisicion_id: int,
    aprobador_nombre: str,
    aprobador_email: str,
    observacion: str,  # OBLIGATORIO
) -> RequisicionPersonal:
    if not observacion or not observacion.strip():
        raise ValueError("La observación es obligatoria para rechazar una requisición")

    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")
    if req.estado != EstadoRP.PENDIENTE_APROBACION:
        raise PermissionError(f"Solo se puede rechazar desde PENDIENTE_APROBACION")

    estado_anterior = req.estado
    req.estado = EstadoRP.RECHAZADA
    req.aprobador_nombre = aprobador_nombre
    req.aprobador_email = aprobador_email
    req.fecha_decision_aprobador = datetime.utcnow()
    req.observacion_aprobador = observacion
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.RECHAZADA,
        aprobador_nombre, aprobador_email, observacion,
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} RECHAZADA por {aprobador_email}")
    return req


# ──────────────────────────────────────────────
# Devolver para ajuste
# ──────────────────────────────────────────────
async def devolver_requisicion(
    db: AsyncSession,
    requisicion_id: int,
    aprobador_nombre: str,
    aprobador_email: str,
    observacion: str,  # OBLIGATORIO
) -> RequisicionPersonal:
    if not observacion or not observacion.strip():
        raise ValueError("La observación es obligatoria para devolver una requisición")

    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")
    if req.estado != EstadoRP.PENDIENTE_APROBACION:
        raise PermissionError("Solo se puede devolver desde PENDIENTE_APROBACION")

    estado_anterior = req.estado
    req.estado = EstadoRP.DEVUELTA_AJUSTE
    req.observacion_aprobador = observacion
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.DEVUELTA_AJUSTE,
        aprobador_nombre, aprobador_email, observacion,
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} DEVUELTA por {aprobador_email}")
    return req


# ──────────────────────────────────────────────
# Actualizar estado por Gestión Humana
# ──────────────────────────────────────────────
async def actualizar_estado_gh(
    db: AsyncSession,
    requisicion_id: int,
    nuevo_estado: str,
    responsable_nombre: str,
    responsable_email: str,
    observacion: Optional[str] = None,
) -> RequisicionPersonal:
    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")

    transiciones_permitidas = EstadoRP.TRANSICIONES_GH.get(req.estado, []) if hasattr(EstadoRP, 'TRANSICIONES_GH') else []
    if nuevo_estado not in transiciones_permitidas:
        raise PermissionError(
            f"Transición '{req.estado}' → '{nuevo_estado}' no permitida para Gestión Humana"
        )

    estado_anterior = req.estado
    req.estado = nuevo_estado
    req.responsable_gh_nombre = responsable_nombre
    req.responsable_gh_email = responsable_email
    req.updated_at = datetime.utcnow()

    if nuevo_estado in (EstadoRP.CERRADA, EstadoRP.CANCELADA):
        req.fecha_cierre = datetime.utcnow()
        req.observacion_cierre = observacion
        try:
            await _limpiar_vacantes_en_jerarquia(db, req)
        except Exception as e:
            logger.error(f"[Vacantes] Error al limpiar vacantes para {req.rp}: {str(e)}")

    await registrar_historial(
        db, req.id, estado_anterior, nuevo_estado,
        responsable_nombre, responsable_email, observacion,
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} → {nuevo_estado} por GH {responsable_email}")
    return req


# ──────────────────────────────────────────────
# Cancelar por Gestión Humana (acción manual explícita)
# ──────────────────────────────────────────────
async def cancelar_requisicion_gh(
    db: AsyncSession,
    requisicion_id: int,
    responsable_nombre: str,
    responsable_email: str,
    observacion: str,
) -> RequisicionPersonal:
    """
    Cancela una requisición desde Gestión Humana.
    Solo válido desde APROBADA o EN_PROCESO_SELECCION.
    Requiere observación obligatoria con el motivo de cancelación.
    """
    if not observacion or not observacion.strip():
        raise ValueError("La observación es obligatoria para cancelar una requisición")

    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")

    if req.estado not in EstadoRP.CANCELABLES_GH:
        raise PermissionError(
            f"No se puede cancelar una requisición en estado '{req.estado}'. "
            f"Solo se puede cancelar desde: {', '.join(EstadoRP.CANCELABLES_GH)}"
        )

    estado_anterior = req.estado
    req.estado = EstadoRP.CANCELADA
    req.responsable_gh_nombre = responsable_nombre
    req.responsable_gh_email = responsable_email
    req.fecha_cierre = datetime.utcnow()
    req.observacion_cierre = observacion.strip()
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.CANCELADA,
        responsable_nombre, responsable_email, observacion.strip(),
    )

    try:
        await _limpiar_vacantes_en_jerarquia(db, req)
    except Exception as e:
        logger.error(f"[Vacantes] Error al limpiar vacantes para {req.rp}: {str(e)}")

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} CANCELADA por GH {responsable_email}: {observacion[:60]}")
    return req


# ──────────────────────────────────────────────
# Modificación Salarial (Devolución desde GH)
# ──────────────────────────────────────────────
async def devolver_modificacion_salarial(
    db: AsyncSession,
    requisicion_id: int,
    responsable_nombre: str,
    responsable_email: str,
    observacion: str,
) -> RequisicionPersonal:
    if not observacion or not observacion.strip():
        raise ValueError("La observación es obligatoria para devolver por ajuste salarial")

    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")

    if req.estado not in EstadoRP.CANCELABLES_GH:
        raise PermissionError(
            f"No se puede solicitar modificación salarial en estado '{req.estado}'"
        )

    estado_anterior = req.estado
    req.estado = EstadoRP.DEVUELTA_MODIFICACION_SALARIAL
    req.responsable_gh_nombre = responsable_nombre
    req.responsable_gh_email = responsable_email
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.DEVUELTA_MODIFICACION_SALARIAL,
        responsable_nombre, responsable_email, observacion.strip(),
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} DEVUELTA PARA MODIFICACION SALARIAL por GH {responsable_email}")
    return req


async def marcar_vista_gh(
    db: AsyncSession,
    requisicion_id: int,
) -> RequisicionPersonal:
    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")

    if not req.fecha_recibido_gh:
        req.fecha_recibido_gh = datetime.utcnow()
        await db.commit()
        await db.refresh(req)
        logger.info(f"[RP] {req.rp} marcada como vista/recibida por GH")
    
    return req

