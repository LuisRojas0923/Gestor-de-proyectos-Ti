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

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Generación del número RP (atómica / sin duplicados)
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