from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

import pytest
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.exc import MissingGreenlet

from app.api.tickets.router import actualizar_ticket
from app.models.ticket.ticket import TicketActualizar
from app.services.ticket.servicio import ServicioTicket


@pytest.mark.asyncio
async def test_actualizar_ticket_preserva_error_http_del_servicio():
    db = AsyncMock()
    error = HTTPException(status_code=400, detail="Causa requerida")

    with patch.object(
        ServicioTicket,
        "actualizar_ticket",
        new=AsyncMock(side_effect=error),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await actualizar_ticket(
                "TKT-0001",
                TicketActualizar(sub_estado="Resuelto"),
                BackgroundTasks(),
                db,
            )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Causa requerida"


@pytest.mark.asyncio
async def test_actualizar_ticket_sanea_error_inesperado_y_revierte():
    db = AsyncMock()

    with patch.object(
        ServicioTicket,
        "actualizar_ticket",
        new=AsyncMock(side_effect=RuntimeError("detalle SQL sensible")),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await actualizar_ticket(
                "TKT-0001",
                TicketActualizar(estado="Proceso"),
                BackgroundTasks(),
                db,
            )

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "No se pudo actualizar el ticket"
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_actualizar_ticket_revierte_si_falla_validacion():
    db = AsyncMock()
    ticket = MagicMock()
    ticket.sub_estado = "Proceso"
    ticket.causa_novedad = None

    result = MagicMock()
    result.scalars.return_value.first.return_value = ticket
    db.execute.return_value = result

    with patch.object(ServicioTicket, "registrar_historial", new=AsyncMock()):
        with pytest.raises(HTTPException) as exc_info:
            await ServicioTicket.actualizar_ticket(
                db,
                "TKT-0001",
                TicketActualizar(sub_estado="Resuelto"),
                BackgroundTasks(),
            )

    assert exc_info.value.status_code == 400
    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_actualizar_ticket_notifica_websocket_si_falla_notificacion_nativa():
    db = AsyncMock()
    ticket = MagicMock()
    ticket.estado = "Proceso"
    ticket.sub_estado = "Proceso"
    ticket.causa_novedad = None
    ticket.correo_creador = None
    ticket.fecha_cierre = None
    ticket.resuelto_en = None
    ticket.atendido_en = None
    ticket.asignado_a = "Analista"
    ticket.creador_id = "USR-1"
    ticket.asunto = "Prueba"

    result = MagicMock()
    result.scalars.return_value.first.return_value = ticket
    db.execute.return_value = result

    async def expirar_ticket():
        type(ticket).estado = PropertyMock(
            side_effect=MissingGreenlet("La instancia fue expirada por rollback"),
        )

    db.rollback.side_effect = expirar_ticket

    with (
        patch.object(ServicioTicket, "registrar_historial", new=AsyncMock()),
        patch.object(ServicioTicket, "obtener_ticket_por_id", new=AsyncMock(return_value=ticket)),
        patch(
            "app.services.notificacion.servicio.ServicioNotificacion.crear_notificacion",
            new=AsyncMock(side_effect=RuntimeError("fallo de notificacion")),
        ),
        patch("app.services.ticket.servicio.manager.broadcast_to_ticket", new=AsyncMock()) as broadcast,
    ):
        actualizado = await ServicioTicket.actualizar_ticket(
            db,
            "TKT-0001",
            TicketActualizar(
                estado="Cerrado",
                sub_estado="Resuelto",
                causa_novedad="Falla de Software (Bug)",
            ),
            BackgroundTasks(),
        )

    assert actualizado is ticket
    db.rollback.assert_awaited_once()
    broadcast.assert_awaited_once_with(
        "TKT-0001",
        {
            "type": "ticket_updated",
            "data": {
                "id": "TKT-0001",
                "estado": "Cerrado",
                "sub_estado": "Resuelto",
                "asignado_a": "Analista",
            },
        },
    )
