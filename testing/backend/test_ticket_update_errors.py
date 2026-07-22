from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

import pytest
from fastapi import BackgroundTasks, HTTPException
from fastapi.routing import APIRoute
from sqlalchemy.exc import MissingGreenlet

from app.api.tickets.router import actualizar_ticket, router
from app.models.ticket.ticket import TicketActualizar
from app.services.ticket.servicio import ServicioTicket


@pytest.fixture(autouse=True)
def _permiso_ticket_management(monkeypatch):
    monkeypatch.setattr(
        "app.services.auth.servicio.ServicioAuth.obtener_permisos_por_rol",
        AsyncMock(return_value=["ticket-management"]),
    )


def _analista():
    return SimpleNamespace(
        id="USR-ANALISTA",
        cedula="9001",
        nombre="Analista",
        rol="analyst",
    )


def _usuario_personalizado():
    return SimpleNamespace(
        id="USR-PERSONALIZADO",
        cedula="9002",
        nombre="Gestor personalizado",
        rol="gestor_soporte",
    )


def test_actualizar_ticket_exige_usuario_autenticado():
    route = next(
        route for route in router.routes
        if isinstance(route, APIRoute)
        and route.path == "/{ticket_id}"
        and "PATCH" in route.methods
    )

    dependencias = {dep.call.__name__ for dep in route.dependant.dependencies}
    assert "obtener_usuario_actual_db" in dependencias


@pytest.mark.asyncio
async def test_actualizar_ticket_rechaza_usuario_estandar():
    db = AsyncMock()
    ticket = MagicMock(creador_id="USR-P-OTRA-CEDULA", asignado_a="Analista")
    result = MagicMock()
    result.scalars.return_value.first.return_value = ticket
    db.execute.return_value = result
    usuario = SimpleNamespace(
        id="USR-1",
        cedula="1001",
        nombre="Usuario",
        rol="usuario",
    )

    with patch(
        "app.services.auth.servicio.ServicioAuth.obtener_permisos_por_rol",
        new=AsyncMock(return_value=[]),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await ServicioTicket.actualizar_ticket(
                db,
                "TKT-0001",
                TicketActualizar(estado="Proceso"),
                BackgroundTasks(),
                usuario_actual=usuario,
            )

    assert exc_info.value.status_code == 403
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_actualizar_ticket_rechaza_analista_con_permiso_revocado():
    db = AsyncMock()

    with patch(
        "app.services.auth.servicio.ServicioAuth.obtener_permisos_por_rol",
        new=AsyncMock(return_value=[]),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await ServicioTicket.actualizar_ticket(
                db,
                "TKT-0001",
                TicketActualizar(estado="Proceso"),
                BackgroundTasks(),
                usuario_actual=_analista(),
            )

    assert exc_info.value.status_code == 403
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_actualizar_ticket_admite_rol_personalizado_con_permiso():
    db = AsyncMock()
    ticket = MagicMock(
        estado="Proceso",
        sub_estado="Asignado",
        causa_novedad=None,
        correo_creador=None,
        asignado_a="Gestor personalizado",
    )
    result = MagicMock()
    result.scalars.return_value.first.return_value = ticket
    db.execute.return_value = result

    with (
        patch(
            "app.services.auth.servicio.ServicioAuth.obtener_permisos_por_rol",
            new=AsyncMock(return_value=["ticket-management"]),
        ),
        patch.object(
            ServicioTicket,
            "obtener_ticket_por_id",
            new=AsyncMock(return_value=ticket),
        ),
        patch(
            "app.services.ticket.servicio.manager.broadcast_to_ticket",
            new=AsyncMock(),
        ),
    ):
        actualizado = await ServicioTicket.actualizar_ticket(
            db,
            "TKT-0001",
            TicketActualizar(),
            BackgroundTasks(),
            usuario_actual=_usuario_personalizado(),
        )

    assert actualizado is ticket
    db.commit.assert_awaited_once()


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
                _analista(),
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
                _analista(),
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
                usuario_actual=_analista(),
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
            usuario_actual=_analista(),
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
