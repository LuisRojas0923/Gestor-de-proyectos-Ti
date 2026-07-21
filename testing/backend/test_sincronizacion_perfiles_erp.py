from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.requests import Request


def _request_login() -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/api/v2/auth/login",
        "headers": [],
        "client": ("127.0.0.1", 5000),
        "query_string": b"",
    })


def _db_mock() -> MagicMock:
    db = MagicMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _usuario_completo() -> SimpleNamespace:
    return SimpleNamespace(
        id="USR-P-1000000001",
        cedula="1000000001",
        nombre="USUARIO ERP TEST",
        rol="usuario",
        esta_activo=True,
        hash_contrasena="hash-configurado",
        correo="erp-test@example.invalid",
        correo_actualizado=True,
        correo_verificado=True,
        area="TI",
        cargo="CARGO ANTERIOR",
        sede="CALI",
        centrocosto="001",
        viaticante=False,
        baseviaticos=0.0,
    )


@pytest.mark.asyncio
async def test_login_refresca_perfil_completo_aunque_area_y_sede_existan():
    from app.api.auth.login_router import login

    handler = getattr(login, "__wrapped__", login)
    usuario = _usuario_completo()
    sincronizar = AsyncMock(return_value=usuario)

    with patch("app.api.auth.login_router._verificar_lockout_cedula", return_value=0), \
         patch("app.api.auth.login_router._auditar_login", new=AsyncMock()), \
         patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=usuario)), \
         patch("app.services.auth.servicio.ServicioAuth.es_password_configurado", return_value=True), \
         patch("app.services.auth.servicio.ServicioAuth.verificar_contrasena", return_value=True), \
         patch("app.services.auth.servicio.ServicioAuth.sincronizar_perfil_desde_erp", new=sincronizar), \
         patch("app.services.auth.servicio.ServicioAuth.obtener_permisos_por_rol", new=AsyncMock(return_value=[])), \
         patch("app.services.auth.servicio.ServicioAuth.crear_token_acceso", return_value="token-test"), \
         patch("app.services.auth.servicio.ServicioAuth.registrar_sesion", new=AsyncMock()):
        respuesta = await handler(
            _request_login(),
            OAuth2PasswordRequestForm(
                username=usuario.cedula,
                password="ClaveSegura#2026",
                scope="",
            ),
            _db_mock(),
            object(),
        )

    sincronizar.assert_awaited_once()
    assert respuesta["access_token"] == "token-test"


@pytest.mark.asyncio
async def test_login_continua_si_sincronizacion_erp_falla_y_relee_usuario():
    from app.api.auth.login_router import login

    handler = getattr(login, "__wrapped__", login)
    usuario = _usuario_completo()
    db = _db_mock()
    obtener_usuario = AsyncMock(side_effect=[usuario, usuario])

    with patch("app.api.auth.login_router._verificar_lockout_cedula", return_value=0), \
         patch("app.api.auth.login_router._auditar_login", new=AsyncMock()), \
         patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=obtener_usuario), \
         patch("app.services.auth.servicio.ServicioAuth.es_password_configurado", return_value=True), \
         patch("app.services.auth.servicio.ServicioAuth.verificar_contrasena", return_value=True), \
         patch("app.services.auth.servicio.ServicioAuth.sincronizar_perfil_desde_erp", new=AsyncMock(side_effect=RuntimeError("ERP caido"))), \
         patch("app.services.auth.servicio.ServicioAuth.obtener_permisos_por_rol", new=AsyncMock(return_value=[])), \
         patch("app.services.auth.servicio.ServicioAuth.crear_token_acceso", return_value="token-degradado"), \
         patch("app.services.auth.servicio.ServicioAuth.registrar_sesion", new=AsyncMock()):
        respuesta = await handler(
            _request_login(),
            OAuth2PasswordRequestForm(
                username=usuario.cedula,
                password="ClaveSegura#2026",
                scope="",
            ),
            db,
            object(),
        )

    assert respuesta["access_token"] == "token-degradado"
    db.rollback.assert_awaited_once()
    assert obtener_usuario.await_count == 2


@pytest.mark.asyncio
async def test_dependencia_perfil_relee_usuario_despues_de_rollback_erp():
    from app.api.auth.profile_router import obtener_usuario_actual_db

    usuario = _usuario_completo()
    usuario.area = None
    usuario_releido = _usuario_completo()
    db = _db_mock()
    obtener_usuario = AsyncMock(side_effect=[usuario, usuario_releido])
    request = Request({
        "type": "http",
        "method": "GET",
        "path": "/api/v2/auth/yo",
        "headers": [],
        "client": ("127.0.0.1", 5000),
        "query_string": b"",
    })

    with patch(
        "app.api.auth.profile_router.ServicioAuth.obtener_payload_token",
        return_value={"sub": usuario.cedula, "token_type": "session"},
    ), patch(
        "app.api.auth.profile_router.validar_sesion_activa",
        new=AsyncMock(return_value=SimpleNamespace()),
    ), patch(
        "app.api.auth.profile_router.ServicioAuth.obtener_usuario_por_cedula",
        new=obtener_usuario,
    ), patch(
        "app.api.auth.profile_router.ServicioAuth.sincronizar_perfil_desde_erp",
        new=AsyncMock(side_effect=RuntimeError("ERP caido")),
    ):
        resultado = await obtener_usuario_actual_db(
            request,
            "token-test",
            db,
            object(),
        )

    assert resultado is usuario_releido
    assert obtener_usuario.await_count == 2
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_perfil_erp_identico_no_escribe_ni_invalida_correo_verificado():
    from app.services.auth.servicio import ServicioAuth

    usuario = _usuario_completo()
    db = _db_mock()
    perfil = {
        "nombre": usuario.nombre,
        "cargo": usuario.cargo,
        "area": usuario.area,
        "ciudadcontratacion": usuario.sede,
        "centrocosto": usuario.centrocosto,
        "viaticante": usuario.viaticante,
        "baseviaticos": usuario.baseviaticos,
        "correocorporativo": usuario.correo,
    }

    with patch(
        "app.services.auth.sincronizacion_perfiles_service.obtener_perfil_laboral_por_cedula",
        new=AsyncMock(return_value=SimpleNamespace(
            estado="encontrado_activo",
            perfil=SimpleNamespace(
                cedula=usuario.cedula,
                nombre=perfil["nombre"],
                cargo=perfil["cargo"],
                area=perfil["area"],
                sede=perfil["ciudadcontratacion"],
                centrocosto=perfil["centrocosto"],
                viaticante=perfil["viaticante"],
                baseviaticos=perfil["baseviaticos"],
                correo=perfil["correocorporativo"],
            ),
        )),
    ), patch(
        "app.services.auth.sincronizacion_perfiles_service.actualizar_correo_protegido",
        new=AsyncMock(),
    ) as actualizar_correo:
        resultado = await ServicioAuth.sincronizar_perfil_desde_erp(db, usuario)

    actualizar_correo.assert_not_awaited()
    db.commit.assert_not_awaited()
    assert usuario.correo_verificado is True
    assert resultado.estado == "sin_cambios"


@pytest.mark.asyncio
async def test_conflicto_integridad_individual_se_clasifica_sin_error_500():
    from app.models.auth.sincronizacion_perfil import (
        EstadoPerfilERP,
        EstadoSincronizacion,
        PerfilLaboralERP,
        ResultadoPerfilERP,
    )
    from app.services.auth.sincronizacion_perfiles_service import (
        sincronizar_usuario_desde_erp,
    )

    usuario = _usuario_completo()
    db = _db_mock()
    db.execute = AsyncMock(return_value=SimpleNamespace(
        scalar_one_or_none=lambda: usuario
    ))
    resultado_erp = ResultadoPerfilERP(
        estado=EstadoPerfilERP.ENCONTRADO_ACTIVO,
        perfil=PerfilLaboralERP(
            cedula=usuario.cedula,
            nombre=usuario.nombre,
            cargo=usuario.cargo,
            area=usuario.area,
            sede=usuario.sede,
            centrocosto=usuario.centrocosto,
            viaticante=usuario.viaticante,
            baseviaticos=usuario.baseviaticos,
            correo="correo-duplicado@example.invalid",
        ),
    )

    with patch(
        "app.services.auth.sincronizacion_perfiles_service.obtener_perfil_laboral_por_cedula",
        new=AsyncMock(return_value=resultado_erp),
    ), patch(
        "app.services.auth.sincronizacion_perfiles_service._aplicar_cambios",
        new=AsyncMock(side_effect=IntegrityError("UPDATE", {}, Exception())),
    ):
        resultado = await sincronizar_usuario_desde_erp(db, usuario)

    assert resultado.estado == EstadoSincronizacion.DATO_ERP_INVALIDO
    db.rollback.assert_awaited_once()
    assert "lock_timeout" in str(db.execute.await_args_list[0].args[0]).lower()
    consulta_bloqueada = db.execute.await_args_list[1].args[0]
    assert consulta_bloqueada.get_execution_options()["populate_existing"] is True


def test_openapi_declara_cuerpo_de_sincronizacion_individual():
    from app.main import app

    operacion = app.openapi()["paths"][
        "/api/v2/auth/usuarios/sincronizacion-erp/individual"
    ]["post"]

    assert "requestBody" in operacion
    esquema = operacion["requestBody"]["content"]["application/json"]["schema"]
    assert esquema["title"] == "SolicitudSincronizacionIndividual"
    assert esquema["required"] == ["usuario_id"]


@pytest.mark.asyncio
async def test_lote_erp_fallido_reconcilia_evaluados_y_fallidos():
    from app.models.auth.sincronizacion_perfil import (
        EstadoPerfilERP,
        ResultadoPerfilERP,
    )
    from app.services.auth.sincronizacion_perfiles_service import (
        sincronizar_usuarios_activos_desde_erp,
    )

    class _ResultadoDB:
        def __init__(self, *, escalar=None, usuarios=None):
            self.escalar = escalar
            self.usuarios = usuarios or []

        def scalar_one(self):
            return self.escalar

        def scalars(self):
            return SimpleNamespace(all=lambda: self.usuarios)

    usuarios = [
        SimpleNamespace(id="USR-1", cedula=" 1 ", esta_activo=True),
        SimpleNamespace(id="USR-2", cedula="2", esta_activo=True),
    ]
    db = _db_mock()
    db.execute = AsyncMock(side_effect=[
        _ResultadoDB(escalar=2),
        _ResultadoDB(usuarios=[usuarios[0]]),
        _ResultadoDB(usuarios=[usuarios[1]]),
        _ResultadoDB(usuarios=[]),
    ])

    with patch(
        "app.services.auth.sincronizacion_perfiles_service.consultar_perfiles_laborales_bulk_async",
        new=AsyncMock(side_effect=[
            {"1": ResultadoPerfilERP(estado=EstadoPerfilERP.NO_ENCONTRADO)},
            RuntimeError("ERP temporalmente no disponible"),
        ]),
    ):
        resumen = await sincronizar_usuarios_activos_desde_erp(
            db,
            aplicar=False,
            tamano_lote=1,
        )

    assert resumen.evaluados == 2
    assert resumen.no_sincronizables == 1
    assert resumen.fallidos == 1
    assert resumen.evaluados == (
        resumen.actualizados
        + resumen.sin_cambios
        + resumen.no_sincronizables
        + resumen.fallidos
    )


@pytest.mark.asyncio
async def test_fallo_sql_tras_un_lote_confirmado_devuelve_parcial():
    from app.models.auth.sincronizacion_perfil import (
        EstadoPerfilERP,
        ResultadoPerfilERP,
    )
    from app.services.auth.sincronizacion_perfiles_service import (
        sincronizar_usuarios_activos_desde_erp,
    )

    class _ResultadoDB:
        def __init__(self, *, escalar=None, usuarios=None):
            self.escalar = escalar
            self.usuarios = usuarios or []

        def scalar_one(self):
            return self.escalar

        def scalars(self):
            return SimpleNamespace(all=lambda: self.usuarios)

    usuario = SimpleNamespace(id="USR-1", cedula="1", esta_activo=True)
    db = _db_mock()
    db.execute = AsyncMock(side_effect=[
        _ResultadoDB(escalar=2),
        _ResultadoDB(usuarios=[usuario]),
        OperationalError("SELECT", {}, Exception("DB caida")),
    ])

    with patch(
        "app.services.auth.sincronizacion_perfiles_service.consultar_perfiles_laborales_bulk_async",
        new=AsyncMock(return_value={
            "1": ResultadoPerfilERP(estado=EstadoPerfilERP.NO_ENCONTRADO)
        }),
    ):
        resumen = await sincronizar_usuarios_activos_desde_erp(
            db,
            aplicar=False,
            tamano_lote=1,
        )

    assert resumen.estado_general == "parcial"
    assert resumen.evaluados == 1
    assert resumen.no_sincronizables == 1
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_commit_fallido_descarta_resultados_y_reconcilia_conteos():
    from app.models.auth.sincronizacion_perfil import (
        EstadoPerfilERP,
        ResultadoPerfilERP,
    )
    from app.services.auth.sincronizacion_perfiles_service import (
        sincronizar_usuarios_activos_desde_erp,
    )

    class _ResultadoDB:
        def __init__(self, *, escalar=None, usuarios=None):
            self.escalar = escalar
            self.usuarios = usuarios or []

        def scalar_one(self):
            return self.escalar

        def scalars(self):
            return SimpleNamespace(all=lambda: self.usuarios)

    usuario = SimpleNamespace(id="USR-1", cedula="1", esta_activo=True)
    db = _db_mock()
    db.execute = AsyncMock(side_effect=[
        _ResultadoDB(escalar=1),
        _ResultadoDB(usuarios=[usuario]),
        SimpleNamespace(),
        _ResultadoDB(usuarios=[]),
    ])
    db.commit = AsyncMock(side_effect=RuntimeError("commit fallido"))
    lock_conn = SimpleNamespace(
        execute=AsyncMock(return_value=SimpleNamespace(scalar_one=lambda: True)),
        close=AsyncMock(),
    )

    with patch(
        "app.services.auth.sincronizacion_perfiles_service.async_engine",
        new=SimpleNamespace(connect=AsyncMock(return_value=lock_conn)),
    ), patch(
        "app.services.auth.sincronizacion_perfiles_service.consultar_perfiles_laborales_bulk_async",
        new=AsyncMock(return_value={
            "1": ResultadoPerfilERP(estado=EstadoPerfilERP.NO_ENCONTRADO)
        }),
    ):
        resumen = await sincronizar_usuarios_activos_desde_erp(
            db,
            aplicar=True,
            tamano_lote=1,
        )

    assert resumen.estado_general == "parcial"
    assert resumen.evaluados == 1
    assert resumen.fallidos == 1
    assert resumen.no_sincronizables == 0
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_sincronizacion_masiva_rechaza_mas_de_mil_usuarios():
    from app.services.auth.sincronizacion_perfiles_service import (
        LimiteSincronizacionExcedido,
        sincronizar_usuarios_activos_desde_erp,
    )

    db = _db_mock()
    db.execute = AsyncMock(return_value=SimpleNamespace(scalar_one=lambda: 1001))

    with pytest.raises(LimiteSincronizacionExcedido):
        await sincronizar_usuarios_activos_desde_erp(db, aplicar=False)
