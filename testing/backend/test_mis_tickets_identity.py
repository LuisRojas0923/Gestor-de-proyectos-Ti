"""Regresión: mis-tickets debe resolver variantes de creador_id."""
from types import SimpleNamespace

from app.services.auth.servicio import (
    extraer_cedula_desde_identificador,
    id_creador_ticket_canonico,
    ids_creador_ticket_equivalentes,
)


def test_extraer_cedula_desde_identificador():
    assert extraer_cedula_desde_identificador("1107068093") == "1107068093"
    assert extraer_cedula_desde_identificador("USR-1107068093") == "1107068093"
    assert extraer_cedula_desde_identificador("USR-P-1107068093") == "1107068093"


def test_ids_creador_ticket_equivalentes_sin_usuario():
    ids = ids_creador_ticket_equivalentes("1107068093")
    assert "1107068093" in ids
    assert "USR-1107068093" in ids
    assert "USR-P-1107068093" in ids


def test_ids_creador_ticket_equivalentes_con_usuario_legacy():
    usuario = SimpleNamespace(id="USR-1107068093", cedula="1107068093")
    ids = ids_creador_ticket_equivalentes("1107068093", usuario)
    assert "USR-P-1107068093" in ids
    assert "USR-1107068093" in ids


def test_id_creador_ticket_canonico():
    usuario = SimpleNamespace(cedula="1107068093")
    assert id_creador_ticket_canonico(usuario) == "USR-P-1107068093"
