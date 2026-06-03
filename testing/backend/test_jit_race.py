"""
Test de integración F5.5: race condition en JIT (C4) con requests concurrentes.

Verifica que múltiples requests concurrentes contra /auth/login con una
cédula que existe en el ERP NO causen 500 ni creen usuarios duplicados.

REQUISITOS (todos opcionales — el test se skipea si falta alguno):
- Docker compose up (backend en 127.0.0.1:8000 + DB)
- Variable de entorno ERP_TEST_CEDULA con una cédula válida del ERP
- RAM libre ≥ 1.5 GB

MITIGACIONES DE RAM (Fase 5 del plan):
- Fixture `require_docker`: skip si 127.0.0.1:8000 no responde
- Guard `requiere_ram_suficiente`: skip si free < 1.5 GB
- Guard `requiere_erp_test_cedula`: skip si ERP_TEST_CEDULA no está definida
- 5 concurrentes (no 50) — bajo pero suficiente para detectar el race
- Cleanup explícito de la DB en teardown
- httpx.Limits bajo (max_connections=10, keepalive=5)

NOTA IMPORTANTE: este test requiere una cédula que exista en el ERP
externo. Sin esa conexión, el endpoint retorna 401 (no JIT) y el test
no valida nada útil. Por eso se skipea si ERP_TEST_CEDULA no está
configurada. Para correrlo en un entorno con ERP:

    export ERP_TEST_CEDULA=1234567890
    pytest testing/backend/test_jit_race.py -v
"""

import asyncio
import os
import time
import uuid

import httpx
import pytest


# Umbral de RAM libre mínima para correr este test (en MB)
MIN_RAM_FREE_MB = 1500

BASE_URL = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000/api/v2")


def _get_free_ram_mb() -> int | None:
    """
    Lee la RAM libre del sistema en MB usando ctypes (sin psutil).
    Retorna None si no se puede determinar (no Windows o sin ctypes).
    """
    try:
        import ctypes
        from ctypes import wintypes

        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ("dwLength", wintypes.DWORD),
                ("dwMemoryLoad", wintypes.DWORD),
                ("ullTotalPhys", ctypes.c_uint64),
                ("ullAvailPhys", ctypes.c_uint64),
                ("ullTotalPageFile", ctypes.c_uint64),
                ("ullAvailPageFile", ctypes.c_uint64),
                ("ullTotalVirtual", ctypes.c_uint64),
                ("ullAvailVirtual", ctypes.c_uint64),
                ("ullAvailExtendedVirtual", ctypes.c_uint64),
            ]

        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(stat)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            return int(stat.ullAvailPhys / 1024 / 1024)
    except Exception:
        return None
    return None


@pytest.fixture(autouse=True)
def requiere_ram_suficiente():
    """
    Skip automático si la RAM libre es menor a MIN_RAM_FREE_MB.
    Crítico para no colapsar la máquina del dev.
    """
    free_mb = _get_free_ram_mb()
    if free_mb is not None and free_mb < MIN_RAM_FREE_MB:
        pytest.skip(
            f"RAM libre insuficiente ({free_mb} MB < {MIN_RAM_FREE_MB} MB). "
            f"Cierra Chrome/IDEs antes de correr este test de integración."
        )


@pytest.fixture
def requiere_erp_test_cedula():
    """Skip si ERP_TEST_CEDULA no está configurada (necesaria para invocar JIT)."""
    cedula = os.getenv("ERP_TEST_CEDULA")
    if not cedula:
        pytest.skip(
            "ERP_TEST_CEDULA no está definida. Configúrala con una cédula "
            "válida del ERP para correr este test de integración."
        )
    return cedula


def _build_async_client() -> httpx.AsyncClient:
    """HTTPx con límites bajos para minimizar el pico de RAM."""
    limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)
    return httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=30.0,
        limits=limits,
        follow_redirects=True,
    )


async def _delete_test_user(cedula: str):
    """
    Limpieza post-test: elimina el usuario creado durante la prueba.
    Tolerante a fallos: si la limpieza falla, no afecta el test.
    """
    try:
        import asyncpg

        conn = await asyncpg.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "password_segura_refridcol"),
            database=os.getenv("DB_NAME", "project_manager"),
        )
        try:
            await conn.execute(
                "DELETE FROM sesiones WHERE usuario_id LIKE $1",
                f"USR-P-{cedula}%",
            )
            await conn.execute("DELETE FROM usuarios WHERE cedula = $1", cedula)
        finally:
            await conn.close()
    except Exception:
        pass


@pytest.mark.asyncio
@pytest.mark.usefixtures("require_docker")
async def test_jit_race_5_concurrentes_no_crea_duplicados(
    require_docker, requiere_erp_test_cedula
):
    """
    5 requests concurrentes con la misma cédula del ERP deben:
    1. NO retornar 500 (el IntegrityError debe manejarse)
    2. Crear EXACTAMENTE 1 usuario en la DB
    3. Todos retornar respuestas consistentes (mismo status code)

    Status esperado:
    - 400 si jit_auto_aprobar=True (legacy: PASSWORD_NOT_SET)
    - 403 si jit_auto_aprobar=False (aprobación pendiente)
    """
    cedula = requiere_erp_test_cedula
    password = "ClaveSegura#Test2026"

    try:
        async with _build_async_client() as client:
            tasks = [
                client.post(
                    "/auth/login",
                    data={"username": cedula, "password": password},
                )
                for _ in range(5)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            exceptions = [r for r in responses if isinstance(r, Exception)]
            assert len(exceptions) == 0, (
                f"5/5 requests concurrentes no debieron crashear. "
                f"Excepciones: {exceptions}"
            )

            for r in responses:
                assert r.status_code != 500, (
                    f"Race condition no manejada: status={r.status_code} "
                    f"body={r.text}"
                )

            status_codes = {r.status_code for r in responses}
            assert len(status_codes) == 1, (
                f"5 requests concurrentes deben tener el MISMO status code. "
                f"Obtenidos: {status_codes}"
            )

            status = responses[0].status_code
            assert status in (400, 403), (
                f"Status inesperado para login JIT: {status}. "
                f"Esperado 400 (legacy) o 403 (aprobación pendiente)."
            )

        # Verificar que existe EXACTAMENTE 1 usuario con esa cédula
        import asyncpg

        conn = await asyncpg.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "password_segura_refridcol"),
            database=os.getenv("DB_NAME", "project_manager"),
        )
        try:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM usuarios WHERE cedula = $1", cedula
            )
            assert count == 1, (
                f"5 requests concurrentes deben crear EXACTAMENTE 1 usuario. "
                f"Encontrados: {count}. Esto indica que el race condition NO está manejado."
            )
        finally:
            await conn.close()

    finally:
        await _delete_test_user(cedula)


@pytest.mark.asyncio
@pytest.mark.usefixtures("require_docker")
async def test_jit_race_3_concurrentes_distintas_cedulas(
    require_docker, requiere_erp_test_cedula
):
    """
    3 requests concurrentes con CÉDULAS DISTINTAS nuevas deben:
    1. NO retornar 500
    2. Cada cédula crear exactamente 1 usuario (no debe haber colisión)

    NOTA: este test usa la cédula base del ERP + 2 derivadas (con sufijo).
    Solo la base dispara el flujo JIT real. Las derivadas dependen de que
    el ERP acepte lookup por cédulas inexistentes sin crashear.
    """
    cedula_base = requiere_erp_test_cedula
    cedulas_test = [
        cedula_base,
        f"99{cedula_base[-6:]}",
        f"98{cedula_base[-6:]}",
    ]
    password = "ClaveSegura#Test2026"

    try:
        async with _build_async_client() as client:
            tasks = [
                client.post(
                    "/auth/login",
                    data={"username": c, "password": password},
                )
                for c in cedulas_test
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            exceptions = [r for r in responses if isinstance(r, Exception)]
            assert len(exceptions) == 0, (
                f"3/3 requests no debieron crashear. Excepciones: {exceptions}"
            )

            for r in responses:
                assert r.status_code != 500, (
                    f"Race condition no manejada: status={r.status_code} body={r.text}"
                )

        # Verificar que la cédula base (la única que existe en ERP) tiene 1 usuario
        import asyncpg

        conn = await asyncpg.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "password_segura_refridcol"),
            database=os.getenv("DB_NAME", "project_manager"),
        )
        try:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM usuarios WHERE cedula = $1", cedula_base
            )
            assert count == 1, (
                f"Cédula base {cedula_base} debe tener exactamente 1 usuario. "
                f"Encontrados: {count}"
            )
        finally:
            await conn.close()

    finally:
        # Solo limpiamos la base (las derivadas no debieron crear usuarios)
        await _delete_test_user(cedula_base)
