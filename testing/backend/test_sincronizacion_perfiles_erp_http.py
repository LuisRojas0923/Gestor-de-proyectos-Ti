import json
import time

import pytest
from sqlalchemy import func, select, text, update


async def _login_admin_test(client):
    respuesta = await client.post(
        "/auth/login",
        data={
            "username": "admin_test",
            "password": "test-admin-bootstrap-password-0123456789abcdef",
        },
    )
    assert respuesta.status_code == 200
    return respuesta.json()


async def _login_usuario_erp_test(client):
    cedula = "1000000001"
    contrasena = "ClaveSegura#2026"
    respuesta = await client.post(
        "/auth/login",
        data={"username": cedula, "password": contrasena},
    )
    if respuesta.status_code == 400:
        assert respuesta.headers["x-password-not-set"] == "true"
        configuracion = await client.post(
            "/auth/setup-password",
            json={"cedula": cedula, "contrasena": contrasena},
        )
        assert configuracion.status_code == 200
        respuesta = await client.post(
            "/auth/login",
            data={"username": cedula, "password": contrasena},
        )
    assert respuesta.status_code == 200
    return respuesta.json()


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_preview_denegado_genera_un_evento_y_no_cachea(client, db_session):
    from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario

    ruta = "/api/v2/auth/usuarios/sincronizacion-erp/previsualizacion"
    antes = (await db_session.execute(
        select(func.count()).select_from(AuditoriaAccionUsuario).where(
            AuditoriaAccionUsuario.ruta == ruta
        )
    )).scalar_one()

    respuesta = await client.get("/auth/usuarios/sincronizacion-erp/previsualizacion")
    assert respuesta.status_code == 401
    assert respuesta.headers["cache-control"] == "no-store, private"

    despues = (await db_session.execute(
        select(func.count()).select_from(AuditoriaAccionUsuario).where(
            AuditoriaAccionUsuario.ruta == ruta
        )
    )).scalar_one()
    assert despues - antes == 1


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_endpoints_admin_y_422_no_refleja_usuario(client, db_session):
    from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario

    login = await _login_admin_test(client)
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    preview = await client.get(
        "/auth/usuarios/sincronizacion-erp/previsualizacion",
        headers=headers,
    )
    assert preview.status_code == 200
    assert preview.headers["cache-control"] == "no-store, private"

    individual = await client.post(
        "/auth/usuarios/sincronizacion-erp/individual",
        headers=headers,
        json={"usuario_id": login["user"]["id"]},
    )
    assert individual.status_code == 200
    assert individual.json()["estado"] == "no_encontrado_erp"

    evento = (await db_session.execute(
        select(AuditoriaAccionUsuario)
        .where(AuditoriaAccionUsuario.ruta == (
            "/api/v2/auth/usuarios/sincronizacion-erp/individual"
        ))
        .order_by(AuditoriaAccionUsuario.id.desc())
        .limit(1)
    )).scalar_one()
    evento_serializado = json.dumps({
        "entidad_id": evento.entidad_id,
        "datos_nuevos": evento.datos_nuevos,
        "metadatos": evento.metadatos,
    })
    assert login["user"]["id"] not in evento_serializado
    assert (evento.datos_nuevos or {}).get("usuario_id") == "[REDACTED]"

    valor_sensible = "<usuario-id-no-valido>"
    invalida = await client.post(
        "/auth/usuarios/sincronizacion-erp/individual",
        headers=headers,
        json={"usuario_id": valor_sensible},
    )
    assert invalida.status_code == 422
    assert valor_sensible not in invalida.text


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_login_jit_termina_con_cargo_vigente_del_erp(client):
    login = await _login_usuario_erp_test(client)
    assert login["user"]["cargo"] == "CARGO VIGENTE"


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_usuario_sin_permiso_no_puede_sincronizar(client):
    login = await _login_usuario_erp_test(client)
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    respuestas = [
        await client.get(
            "/auth/usuarios/sincronizacion-erp/previsualizacion",
            headers=headers,
        ),
        await client.post(
            "/auth/usuarios/sincronizacion-erp/aplicar",
            headers=headers,
        ),
        await client.post(
            "/auth/usuarios/sincronizacion-erp/individual",
            headers=headers,
            json={"usuario_id": login["user"]["id"]},
        ),
    ]
    assert [respuesta.status_code for respuesta in respuestas] == [403, 403, 403]


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_apply_actualiza_cargo_y_reporta_conteos_reconciliados(client, db_session):
    from app.models.auth.usuario import Usuario

    await _login_usuario_erp_test(client)
    await db_session.execute(
        update(Usuario)
        .where(Usuario.cedula == "1000000001")
        .values(cargo="CARGO ANTERIOR")
    )
    await db_session.commit()

    admin = await _login_admin_test(client)
    respuesta = await client.post(
        "/auth/usuarios/sincronizacion-erp/aplicar",
        headers={"Authorization": f"Bearer {admin['access_token']}"},
    )

    assert respuesta.status_code == 200
    resumen = respuesta.json()
    assert resumen["actualizados"] >= 1
    assert resumen["evaluados"] == (
        resumen["actualizados"]
        + resumen["sin_cambios"]
        + resumen["no_sincronizables"]
        + resumen["fallidos"]
    )
    cargo = (await db_session.execute(
        select(Usuario.cargo).where(Usuario.cedula == "1000000001")
    )).scalar_one()
    assert cargo == "CARGO VIGENTE"


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_apply_con_lock_concurrente_responde_409(client, db_session):
    admin = await _login_admin_test(client)
    await db_session.execute(text(
        "SELECT pg_advisory_lock(hashtext('sincronizacion_perfiles_erp'))"
    ))
    try:
        respuesta = await client.post(
            "/auth/usuarios/sincronizacion-erp/aplicar",
            headers={"Authorization": f"Bearer {admin['access_token']}"},
        )
    finally:
        await db_session.execute(text(
            "SELECT pg_advisory_unlock(hashtext('sincronizacion_perfiles_erp'))"
        ))

    assert respuesta.status_code == 409


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_individual_con_fila_bloqueada_falla_en_tiempo_acotado(client, db_session):
    from app.models.auth.usuario import Usuario

    usuario_login = await _login_usuario_erp_test(client)
    await db_session.execute(
        update(Usuario)
        .where(Usuario.cedula == "1000000001")
        .values(cargo="CARGO ANTERIOR")
    )
    await db_session.commit()
    await db_session.execute(
        select(Usuario)
        .where(Usuario.cedula == "1000000001")
        .with_for_update()
    )

    admin = await _login_admin_test(client)
    inicio = time.monotonic()
    try:
        respuesta = await client.post(
            "/auth/usuarios/sincronizacion-erp/individual",
            headers={"Authorization": f"Bearer {admin['access_token']}"},
            json={"usuario_id": usuario_login["user"]["id"]},
        )
    finally:
        await db_session.rollback()

    assert time.monotonic() - inicio < 6
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "fallido"


@pytest.mark.mutating_integration
@pytest.mark.live_infrastructure
@pytest.mark.asyncio
async def test_endpoints_aplican_rate_limits_independientes(client):
    admin = await _login_admin_test(client)
    headers = {"Authorization": f"Bearer {admin['access_token']}"}

    preview = [
        await client.get(
            "/auth/usuarios/sincronizacion-erp/previsualizacion",
            headers=headers,
        )
        for _ in range(3)
    ]
    individual = [
        await client.post(
            "/auth/usuarios/sincronizacion-erp/individual",
            headers=headers,
            json={"usuario_id": admin["user"]["id"]},
        )
        for _ in range(11)
    ]
    aplicar = [
        await client.post(
            "/auth/usuarios/sincronizacion-erp/aplicar",
            headers=headers,
        )
        for _ in range(2)
    ]

    assert [respuesta.status_code for respuesta in preview] == [200, 200, 429]
    assert [respuesta.status_code for respuesta in individual] == [200] * 10 + [429]
    assert [respuesta.status_code for respuesta in aplicar] == [200, 429]
