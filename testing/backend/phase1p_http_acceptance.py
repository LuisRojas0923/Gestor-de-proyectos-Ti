"""Flujos HTTP reales usados por la aceptación PostgreSQL de Fase 1P."""
import asyncio
import os

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.services.auth.servicio import ServicioAuth


BASE_URL = "http://127.0.0.1:58129"


async def comprobar_fastapi_real(
    runtime_url: str, redis_url: str, admin_hash: str
) -> None:
    env = os.environ.copy()
    env.update({
        "PYTHONPATH": os.path.abspath("backend_v2"),
        "DATABASE_URL": runtime_url,
        "DATABASE_RUNTIME_ROLE": "gestor_runtime",
        "DATABASE_SCHEMA_OWNER_ROLE": "gestor_schema_owner",
        "PORTAL_PENDING_PWD": "pending-test-no-publico-1234567890123456",
        "BIOMETRIA_ENGINE_TOKEN": "token-interno-fase-1p",
        "REDIS_URL": redis_url,
        "ENVIRONMENT": "test",
    })
    process = await asyncio.create_subprocess_exec(
        os.sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "127.0.0.1", "--port", "58129",
        cwd=os.path.abspath("backend_v2"), env=env,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for _ in range(60):
                try:
                    if (await client.get(f"{BASE_URL}/health")).status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                await asyncio.sleep(0.25)
            else:
                raise AssertionError("FastAPI no inició con la credencial runtime")
            engine = create_async_engine(
                runtime_url.replace("postgresql://", "postgresql+asyncpg://", 1),
                poolclass=NullPool,
            )
            async with engine.connect() as conn:
                current_hash = (await conn.execute(text(
                    "SELECT hash_contrasena FROM usuarios WHERE cedula='admin-fase-1p'"
                ))).scalar_one()
            await engine.dispose()
            assert ServicioAuth.verificar_contrasena(
                "fase-1p-clave-temporal-aleatoria-123456789", current_hash
            ), "Startup alteró el hash administrativo"
            await _ejecutar_flujos(client, admin_hash)
    finally:
        if process.returncode is None:
            process.terminate()
            await process.wait()


async def _login(client, username: str, password: str) -> dict[str, str]:
    response = await client.post(
        f"{BASE_URL}/api/v2/auth/login",
        data={"username": username, "password": password},
    )
    if response.status_code != 200:
        status_response = await client.get(
            f"{BASE_URL}/api/v2/auth/password-status/{username}"
        )
        raise AssertionError(f"{response.text}; status={status_response.text}")
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def _ejecutar_flujos(client, admin_hash: str) -> None:
    headers = await _login(
        client, "admin-fase-1p", "fase-1p-clave-temporal-aleatoria-123456789"
    )
    role = await client.post(
        f"{BASE_URL}/api/v2/auth/roles",
        json={"id": "fase_1p_temporal", "nombre": "Fase 1P"}, headers=headers,
    )
    assert role.status_code == 200, role.text
    permissions = await client.post(
        f"{BASE_URL}/api/v2/auth/permisos",
        json=[{"rol": "fase_1p_temporal", "modulo": "fase_1p_modulo", "permitido": True}],
        headers=headers,
    )
    assert permissions.status_code == 200, permissions.text

    user_headers = await _login(
        client, "usuario-fase-1p", "usuario-fase-1p-clave-123456789"
    )
    role_change = await client.patch(
        f"{BASE_URL}/api/v2/auth/analistas/USR-FASE1P",
        json={"rol": "fase_1p_temporal"}, headers=headers,
    )
    assert role_change.status_code == 200, role_change.text
    assert (await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=user_headers)).status_code == 401

    user_headers = await _login(
        client, "usuario-fase-1p", "usuario-fase-1p-clave-123456789"
    )
    deactivated = await client.patch(
        f"{BASE_URL}/api/v2/auth/analistas/USR-FASE1P",
        json={"esta_activo": False}, headers=headers,
    )
    assert deactivated.status_code == 200 and not deactivated.json()["esta_activo"]
    assert (await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=user_headers)).status_code == 401
    reactivated = await client.patch(
        f"{BASE_URL}/api/v2/auth/analistas/USR-FASE1P",
        json={"esta_activo": True}, headers=headers,
    )
    assert reactivated.status_code == 200 and reactivated.json()["esta_activo"]
    deleted = await client.delete(
        f"{BASE_URL}/api/v2/auth/roles/fase_1p_temporal", headers=headers
    )
    assert deleted.status_code == 200, deleted.text

    me = await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=headers)
    assert me.status_code == 200 and "hash_contrasena" not in me.json()
    recovery = ServicioAuth.crear_token_recuperacion(me.json()["id"], admin_hash)
    claves_recuperacion = (
        "fase-1p-clave-recuperada-a-123456789",
        "fase-1p-clave-recuperada-b-123456789",
    )
    recuperaciones = await asyncio.gather(*(
        client.post(
            f"{BASE_URL}/api/v2/auth/reset-password",
            json={"token": recovery, "nueva_contrasena": clave},
        )
        for clave in claves_recuperacion
    ))
    assert sorted(response.status_code for response in recuperaciones) == [200, 400]
    clave_recuperada = next(
        clave for clave, response in zip(claves_recuperacion, recuperaciones)
        if response.status_code == 200
    )

    headers = await _login(
        client, "admin-fase-1p", clave_recuperada
    )
    changed = await client.patch(
        f"{BASE_URL}/api/v2/auth/password",
        json={
            "contrasena_actual": clave_recuperada,
            "nueva_contrasena": "fase-1p-clave-personal-segura-123456789",
        }, headers=headers,
    )
    assert changed.status_code == 200, changed.text
    assert (await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=headers)).status_code == 401
    headers = await _login(
        client, "admin-fase-1p", "fase-1p-clave-personal-segura-123456789"
    )

    refreshes = await asyncio.gather(*(
        client.post(f"{BASE_URL}/api/v2/auth/refresh", headers=headers)
        for _ in range(2)
    ))
    assert sorted(response.status_code for response in refreshes) == [200, 401]
    refreshed = next(response for response in refreshes if response.status_code == 200)
    new_headers = {"Authorization": f"Bearer {refreshed.json()['access_token']}"}
    assert (await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=headers)).status_code == 401
    assert (await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=new_headers)).status_code == 200
    mcp_emitido = await client.post(
        f"{BASE_URL}/api/v2/auth/mcp-token",
        headers=new_headers,
        json={"scope": "read", "motivo": "aceptacion fase 1P"},
    )
    assert mcp_emitido.status_code == 200, mcp_emitido.text
    mcp_headers = {"Authorization": f"Bearer {mcp_emitido.json()['access_token']}"}
    mutacion_mcp = await client.post(
        f"{BASE_URL}/api/v2/auth/roles",
        headers=mcp_headers,
        json={"id": "mcp_no_permitido", "nombre": "MCP no permitido"},
    )
    assert mutacion_mcp.status_code == 403, mutacion_mcp.text
    mcp = ServicioAuth.crear_token_acceso(
        {"sub": "admin-fase-1p", "rol": "admin"}, tipo_token="mcp"  # [CONTROLADO]
    )
    assert (await client.post(
        f"{BASE_URL}/api/v2/auth/refresh",
        headers={"Authorization": f"Bearer {mcp}"},
    )).status_code == 400

    me = await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=new_headers)
    reset = await client.post(
        f"{BASE_URL}/api/v2/auth/analistas/{me.json()['id']}/reset-password",
        headers=new_headers,
    )
    assert reset.status_code == 200, reset.text
    assert (await client.get(f"{BASE_URL}/api/v2/auth/yo", headers=new_headers)).status_code == 401
    setup = await client.post(
        f"{BASE_URL}/api/v2/auth/setup-password",
        json={"cedula": "admin-fase-1p", "contrasena": "intento-toma-cuenta-123456789"},
    )
    assert setup.status_code == 400, setup.text
