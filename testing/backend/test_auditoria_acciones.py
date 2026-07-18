"""Tests unitarios del módulo de auditoría de acciones de usuario."""
import asyncio

from app.models.auditoria.accion_usuario import AccionAuditoria, AuditoriaAccionUsuario
from app.services.auditoria.servicio import (
    ServicioAuditoria,
    _enmascarar_datos,
    inferir_accion_desde_metodo,
    inferir_modulo_desde_ruta,
    inferir_resultado_desde_codigo,
)


def test_enmascarar_datos_oculta_secretos():
    datos = {
        "nombre": "Juan",
        "password": "secreto123",
        "contrasena_actual": "vieja",
        "access_token": "jwt-token",
        "anidado": {"clave": "valor", "nombre": "hijo"},
    }
    resultado = _enmascarar_datos(datos)
    assert resultado["nombre"] == "Juan"
    assert resultado["password"] == "[REDACTED]"
    assert resultado["contrasena_actual"] == "[REDACTED]"
    assert resultado["access_token"] == "[REDACTED]"
    assert resultado["anidado"]["clave"] == "[REDACTED]"
    assert resultado["anidado"]["nombre"] == "hijo"


def test_enmascarar_datos_oculta_numero_de_linea_solo_en_modulo_corporativo():
    datos = {"linea": "3001234567", "estado": "ACTIVA"}

    corporativo = _enmascarar_datos(datos, modulo="lineas_corporativas")
    otro_modulo = _enmascarar_datos(datos, modulo="tickets")

    assert corporativo == {"linea": "[REDACTED]", "estado": "ACTIVA"}
    assert otro_modulo == datos


def test_inferir_modulo_desde_ruta():
    assert inferir_modulo_desde_ruta("/api/v2/tickets/123") == "tickets"
    assert inferir_modulo_desde_ruta("/api/v2/desarrollos") == "desarrollos"
    assert (
        inferir_modulo_desde_ruta("/api/v2/novedades-nomina/comisiones/procesar-manual")
        == "comisiones"
    )


def test_comisiones_datos_es_consulta_auditable():
    from unittest.mock import MagicMock

    from app.core.middleware.auditoria_middleware import _debe_auditar
    from app.core.middleware.auditoria_rutas import es_ruta_consulta_comisiones_auditable

    ruta = "/api/v2/novedades-nomina/comisiones/datos"
    assert es_ruta_consulta_comisiones_auditable(ruta) is True
    request = MagicMock()
    request.method = "GET"
    request.url.path = ruta
    assert _debe_auditar(request) is True


def test_heartbeat_torre_control_no_se_audita():
    from unittest.mock import MagicMock

    from app.core.middleware.auditoria_middleware import _debe_auditar

    request = MagicMock()
    request.method = "POST"
    request.url.path = "/api/v2/panel-control/torre-control/heartbeat"
    assert _debe_auditar(request) is False

    request.url.path = "/api/v2/panel-control/torre-control/estado"
    request.method = "GET"
    assert _debe_auditar(request) is False


def test_descargas_get_si_se_auditan():
    from unittest.mock import MagicMock

    from app.core.middleware.auditoria_middleware import _debe_auditar
    from app.core.middleware.auditoria_rutas import (
        es_ruta_descarga_auditable,
        inferir_entidad_descarga,
    )
    from app.models.auditoria.accion_usuario import AccionAuditoria

    rutas_descarga = [
        "/api/v2/novedades-nomina/archivos/12/descargar",
        "/api/v2/soporte/adjuntos/7/archivo",
        "/api/v2/impuestos/template",
        "/api/v2/impuestos/certificado-220/2024",
        "/api/v2/inventario/plantilla-maestra",
        "/api/v2/inventario/plantilla-transito",
        "/api/v2/viaticos/estado-cuenta/xlsx",
    ]
    for ruta in rutas_descarga:
        assert es_ruta_descarga_auditable(ruta) is True
        request = MagicMock()
        request.method = "GET"
        request.url.path = ruta
        assert _debe_auditar(request) is True

    assert inferir_entidad_descarga("/api/v2/soporte/adjuntos/7/archivo") == (
        "adjunto_ticket",
        "7",
    )
    assert inferir_entidad_descarga("/api/v2/impuestos/certificado-220/2024") == (
        "certificado_220",
        "2024",
    )
    assert inferir_entidad_descarga("/api/v2/impuestos/certificado-220/2025") == (
        "certificado_220",
        "2025",
    )

    request = MagicMock()
    request.method = "GET"
    request.url.path = "/api/v2/desarrollos/ACT-00001"
    assert _debe_auditar(request) is False

    assert AccionAuditoria.EXPORTAR.value == "exportar"


def test_asignar_descarga_en_request_deja_hints_en_state():
    from unittest.mock import MagicMock

    from app.services.auditoria.snapshots import asignar_descarga_en_request

    request = MagicMock()
    request.state = MagicMock()
    request.state.auditoria_metadatos = None

    asignar_descarga_en_request(
        request,
        entidad_tipo="certificado_220",
        entidad_id="2025",
        metadatos={"cedula_consultada": "1107068093", "ano_gravable": 2025},
    )

    assert request.state.auditoria_entidad_tipo == "certificado_220"
    assert request.state.auditoria_entidad_id == "2025"
    assert request.state.auditoria_metadatos["cedula_consultada"] == "1107068093"


def test_modelo_a_dict_auditoria_acepta_dict_plano():
    from app.services.auditoria.snapshots import modelo_a_dict_auditoria

    datos = modelo_a_dict_auditoria({"id": "X", "porcentaje_progreso": 50})
    assert datos == {"id": "X", "porcentaje_progreso": 50}


def test_diff_cambios_solo_campos_modificados():
    from app.services.auditoria.snapshots import diff_cambios

    antes = {"titulo": "A", "estado": "Pendiente", "id": 1}
    despues = {"titulo": "B", "estado": "Pendiente", "id": 1}
    a, d = diff_cambios(antes, despues)
    assert a == {"titulo": "A"}
    assert d == {"titulo": "B"}


def test_inferir_entidad_desde_ruta():
    from app.core.middleware.auditoria_resolver import inferir_entidad_desde_ruta

    assert inferir_entidad_desde_ruta("/api/v2/desarrollos/ACT-00002") == (
        "desarrollo",
        "ACT-00002",
    )
    assert inferir_entidad_desde_ruta("/api/v2/actividades/42") == ("actividad", "42")
    assert inferir_entidad_desde_ruta("/api/v2/actividades/") == (None, None)
    assert inferir_entidad_desde_ruta(
        "/api/v2/actividades/desarrollo/ACT-00002/arbol"
    ) == (None, None)


def test_inferir_accion_desde_metodo():
    assert inferir_accion_desde_metodo("POST") == AccionAuditoria.CREAR
    assert inferir_accion_desde_metodo("DELETE") == AccionAuditoria.ELIMINAR


def test_inferir_resultado_desde_codigo():
    assert inferir_resultado_desde_codigo(200) == "exito"
    assert inferir_resultado_desde_codigo(403) == "denegado"
    assert inferir_resultado_desde_codigo(500) == "fallo"


def test_modelo_auditoria_accion_usuario_existe():
    assert AuditoriaAccionUsuario.__tablename__ == "auditoria_acciones_usuario"


def test_servicio_registrar_no_propaga_excepcion_si_db_falla():
    class FakeSessionFalla:
        async def execute(self, *_args, **_kwargs):
            raise RuntimeError("DB caída")

        async def commit(self):
            raise RuntimeError("DB caída")

        async def rollback(self):
            pass

    asyncio.run(
        ServicioAuditoria.registrar(
            FakeSessionFalla(),
            usuario_id="u-1",
            modulo="auth",
            accion=AccionAuditoria.LOGIN,
        )
    )


def test_servicio_registrar_enmascara_datos_nuevos():
    class FakeSession:
        def __init__(self):
            self.values = None

        async def execute(self, stmt):
            self.values = stmt.compile().params
            return None

        async def commit(self):
            pass

        async def rollback(self):
            pass

    session = FakeSession()
    asyncio.run(
        ServicioAuditoria.registrar(
            session,
            usuario_id="u-1",
            modulo="auth",
            accion=AccionAuditoria.ACTUALIZAR,
            datos_nuevos={"password": "no-debe-guardarse", "rol": "admin"},
        )
    )
    assert session.values is not None
