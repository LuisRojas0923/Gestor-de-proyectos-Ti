"""Validaciones compartidas para WebSockets autenticados."""

from app.config import config
from app.core.config import obtener_configuracion


def origen_websocket_permitido(origen: str) -> bool:
    origen_normalizado = (origen or "").rstrip("/").lower()
    configuracion = obtener_configuracion()
    if configuracion.es_produccion and not origen_normalizado.startswith("https://"):
        return False
    origenes_cors = configuracion.cors_origenes_lista
    candidatos = [] if origenes_cors == ["*"] else origenes_cors
    permitidos = {
        valor.rstrip("/").lower()
        for valor in [*candidatos, config.frontend_url]
        if valor
    }
    return bool(origen_normalizado and origen_normalizado in permitidos)


def extraer_ticket_subprotocolo(
    valor: str,
    protocolo_requerido: str = "notificaciones.v1",
) -> tuple[str | None, str | None]:
    protocolos = [item.strip() for item in (valor or "").split(",")]
    if protocolo_requerido not in protocolos:
        return None, None
    ticket = next(
        (item.removeprefix("ticket.") for item in protocolos if item.startswith("ticket.")),
        None,
    )
    if not ticket or len(ticket) > 128:
        return None, None
    return protocolo_requerido, ticket
