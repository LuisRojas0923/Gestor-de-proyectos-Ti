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
from app.models.rrhh.historial import (
    HistorialRequisicion,
    RequisicionEquipoOficina,
    RequisicionEquipoTecnologico,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Generación del número RP (atómica / sin duplicados)
# ──────────────────────────────────────────────
async def generar_numero_rp(db: AsyncSession) -> tuple[str, int]:
    """
    Genera un consecutivo global único bloqueando la tabla para evitar
    condiciones de carrera en inserciones concurrentes.
    Retorna (rp_formateado, consecutivo_entero).
    Ejemplo: ('RP-0042', 42)
    """
    await db.execute(text("LOCK TABLE requisiciones_personal IN EXCLUSIVE MODE"))
    result = await db.execute(
        text(
            "SELECT COALESCE(MAX(consecutivo), 0) + 1 AS siguiente "
            "FROM requisiciones_personal"
        )
    )
    row = result.fetchone()
    consecutivo = row.siguiente if row else 1
    rp = f"RP-{consecutivo:04d}"
    return rp, consecutivo


# ──────────────────────────────────────────────
# Obtener aprobador según área
# ──────────────────────────────────────────────
async def obtener_aprobador_de_area(db: AsyncSession, area_id: int) -> Optional[AprobadorAreaRP]:
    """Retorna el aprobador activo asignado al área. None si no hay configurado."""
    result = await db.execute(
        sqlmodel_select(AprobadorAreaRP).where(
            AprobadorAreaRP.area_id == area_id,
            AprobadorAreaRP.activo == True,
        )
    )
    return result.scalars().first()


# ──────────────────────────────────────────────
# Registrar evento en historial
# ──────────────────────────────────────────────
async def registrar_historial(
    db: AsyncSession,
    requisicion_id: int,
    estado_anterior: Optional[str],
    estado_nuevo: str,
    usuario_nombre: str,
    usuario_email: str,
    observacion: Optional[str] = None,
):
    evento = HistorialRequisicion(
        requisicion_id=requisicion_id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        usuario_nombre=usuario_nombre,
        usuario_email=usuario_email,
        observacion=observacion,
    )
    db.add(evento)


# ──────────────────────────────────────────────
# Guardar / Actualizar equipos
# ──────────────────────────────────────────────
async def sincronizar_equipos_oficina(db: AsyncSession, requisicion_id: int, equipos: List[str]):
    await db.execute(
        text("DELETE FROM requisicion_equipos_oficina WHERE requisicion_id = :rid"),
        {"rid": requisicion_id},
    )
    for equipo in equipos:
        db.add(RequisicionEquipoOficina(requisicion_id=requisicion_id, equipo=equipo))


async def sincronizar_equipos_tecnologicos(db: AsyncSession, requisicion_id: int, equipos: List[str]):
    await db.execute(
        text("DELETE FROM requisicion_equipos_tecnologicos WHERE requisicion_id = :rid"),
        {"rid": requisicion_id},
    )
    for equipo in equipos:
        db.add(RequisicionEquipoTecnologico(requisicion_id=requisicion_id, equipo=equipo))


# ──────────────────────────────────────────────
# Crear o actualizar borrador
# ──────────────────────────────────────────────
async def crear_o_actualizar_borrador(
    db: AsyncSession,
    payload: dict,
    usuario_nombre: str,
    usuario_email: str,
    requisicion_id: Optional[int] = None,
) -> RequisicionPersonal:
    """
    Crea una nueva requisición en estado BORRADOR o actualiza una existente
    que esté en BORRADOR o DEVUELTA_AJUSTE.
    """
    equipos_oficina = payload.pop("equipos_oficina", [])
    equipos_tecnologicos = payload.pop("equipos_tecnologicos", [])

    if requisicion_id:
        result = await db.execute(
            sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
        )
        req = result.scalar_one_or_none()
        if not req:
            raise ValueError(f"Requisición {requisicion_id} no encontrada")
        if req.estado not in (EstadoRP.BORRADOR, EstadoRP.DEVUELTA_AJUSTE):
            raise PermissionError(f"No se puede editar una requisición en estado '{req.estado}'")
        for k, v in payload.items():
            setattr(req, k, v)
        req.updated_at = datetime.utcnow()
    else:
        req = RequisicionPersonal(
            correo_solicitante=usuario_email,
            nombre_solicitante=usuario_nombre,
            estado=EstadoRP.BORRADOR,
            **payload,
        )
        db.add(req)

    await db.flush()  # Para obtener req.id antes del commit

    await sincronizar_equipos_oficina(db, req.id, equipos_oficina)
    await sincronizar_equipos_tecnologicos(db, req.id, equipos_tecnologicos)

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] Borrador guardado: id={req.id} por {usuario_email}")
    return req


# ──────────────────────────────────────────────
# Enviar a aprobación
# ──────────────────────────────────────────────
async def enviar_a_aprobacion(
    db: AsyncSession,
    requisicion_id: int,
    usuario_nombre: str,
    usuario_email: str,
) -> RequisicionPersonal:
    """
    Genera el número RP (si no existe), asigna aprobador y cambia estado.
    Solo válido desde BORRADOR o DEVUELTA_AJUSTE.
    """
    result = await db.execute(
        sqlmodel_select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError(f"Requisición {requisicion_id} no encontrada")

    estados_validos = (EstadoRP.BORRADOR, EstadoRP.DEVUELTA_AJUSTE)
    if req.estado not in estados_validos:
        raise PermissionError(f"No se puede enviar a aprobación desde estado '{req.estado}'")

    # Generar RP si aún no tiene
    if not req.rp:
        rp, consecutivo = await generar_numero_rp(db)
        req.rp = rp
        req.consecutivo = consecutivo

    # Asignar aprobador: usa el seleccionado por el usuario (aprobador_id)
    # y como fallback busca el primero activo del área
    aprobador = None
    if req.aprobador_id:
        result_ap = await db.execute(
            sqlmodel_select(AprobadorAreaRP).where(AprobadorAreaRP.id == req.aprobador_id)
        )
        aprobador = result_ap.scalar_one_or_none()

    if not aprobador and req.area_id:
        aprobador = await obtener_aprobador_de_area(db, req.area_id)

    if aprobador:
        req.aprobador_nombre = aprobador.nombre_aprobador
        req.aprobador_email = aprobador.email_aprobador
    else:
        logger.warning(f"[RP] No hay aprobador configurado para área_id={req.area_id}")

    estado_anterior = req.estado
    req.estado = EstadoRP.PENDIENTE_APROBACION
    req.fecha_radicacion = datetime.utcnow()
    req.updated_at = datetime.utcnow()

    await registrar_historial(
        db, req.id, estado_anterior, EstadoRP.PENDIENTE_APROBACION,
        usuario_nombre, usuario_email,
        "Requisición enviada a aprobación",
    )

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} enviado a aprobación por {usuario_email}")
    return req


# ──────────────────────────────────────────────
# Aprobar
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

    await db.commit()
    await db.refresh(req)
    logger.info(f"[RP] {req.rp} CANCELADA por GH {responsable_email}: {observacion[:60]}")
    return req

