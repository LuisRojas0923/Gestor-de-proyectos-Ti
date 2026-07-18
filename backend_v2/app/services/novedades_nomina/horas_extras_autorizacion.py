"""Autorización posterior de cálculos de horas extras pendientes."""
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras import (
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCalculoWorkflowEvento,
)
from .bolsa_horas_resolver import resolver_bolsa_habilitada
from .horas_extras_confirmacion import _acreditar_bolsa


async def autorizar_calculo_pendiente(
    session: AsyncSession,
    calculo_id: int,
    usuario_id: str,
) -> dict:
    """Confirma un cálculo pendiente y acredita su bolsa una sola vez."""
    calculo = (
        await session.execute(
            select(NominaCalculoSemanal)
            .where(NominaCalculoSemanal.id == calculo_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if calculo is None:
        raise ValueError(f"Cálculo {calculo_id} no encontrado")
    if calculo.estado == "CONFIRMADO":
        return {
            "calculo_id": calculo.id,
            "estado_anterior": "CONFIRMADO",
            "estado_nuevo": "CONFIRMADO",
            "evento_id": None,
            "movimiento_bolsa_id": None,
            "horas_afectadas": 0.0,
            "ya_autorizado": True,
        }
    if calculo.estado != "PENDIENTE_AUTORIZACION":
        raise ValueError(
            f"El cálculo {calculo_id} no está pendiente de autorización"
        )

    detalles = (
        await session.execute(
            select(NominaCalculoSemanalDetalle).where(
                NominaCalculoSemanalDetalle.calculo_id == calculo.id
            )
        )
    ).scalars().all()
    bolsa_habilitada, _ = await resolver_bolsa_habilitada(session, calculo.ot_id)
    movimiento_ids: list[int] = []
    horas_acreditadas = 0.0
    if bolsa_habilitada:
        _, horas_acreditadas, movimiento_ids = await _acreditar_bolsa(
            session,
            cedula=calculo.cedula,
            calculo_id=calculo.id,
            detalles=detalles,
            usuario_id=usuario_id,
        )

    calculo.estado = "CONFIRMADO"
    calculo.confirmado_por = usuario_id
    calculo.confirmado_en = datetime.now()
    session.add(calculo)
    evento = NominaCalculoWorkflowEvento(
        calculo_id=calculo.id,
        estado_origen="PENDIENTE_AUTORIZACION",
        estado_destino="CONFIRMADO",
        justificacion="Autorización posterior de horas extras",
        usuario_id=usuario_id,
    )
    session.add(evento)
    await session.flush()
    return {
        "calculo_id": calculo.id,
        "estado_anterior": "PENDIENTE_AUTORIZACION",
        "estado_nuevo": "CONFIRMADO",
        "evento_id": evento.id,
        "movimiento_bolsa_id": movimiento_ids[0] if movimiento_ids else None,
        "horas_afectadas": horas_acreditadas,
        "ya_autorizado": False,
    }
