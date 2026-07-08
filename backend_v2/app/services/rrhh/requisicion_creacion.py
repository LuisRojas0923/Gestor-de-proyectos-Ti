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
from .requisicion_equipos import sincronizar_equipos_oficina, sincronizar_equipos_tecnologicos
from .requisicion_core import generar_numero_rp, obtener_aprobador_de_area, registrar_historial


logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Generación del número RP (atómica / sin duplicados)
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
        if req.estado not in (EstadoRP.BORRADOR, EstadoRP.DEVUELTA_AJUSTE, EstadoRP.DEVUELTA_MODIFICACION_SALARIAL):
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

    estados_validos = (EstadoRP.BORRADOR, EstadoRP.DEVUELTA_AJUSTE, EstadoRP.DEVUELTA_MODIFICACION_SALARIAL)
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
    if estado_anterior == EstadoRP.DEVUELTA_MODIFICACION_SALARIAL:
        req.modificada_por_gh = True
        req.fecha_modificacion_gh = datetime.utcnow()
        req.estado = EstadoRP.PENDIENTE_APROBACION_GERENCIA # Va directo a gerencia
    else:
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