from unittest.mock import AsyncMock, Mock

import pytest

from app.services.erp import empleados_service as empleados_service_module
from app.services.erp.empleados_service import EmpleadosService


@pytest.mark.asyncio
async def test_obtener_empleado_por_cedula_delega_consulta_sync(monkeypatch):
    db_erp = object()
    esperado = {"cedula": "123"}
    consulta_sync = Mock(return_value=esperado)
    ejecutar_en_hilo = AsyncMock(return_value=esperado)
    monkeypatch.setattr(EmpleadosService, "obtener_empleado_por_cedula_sync", consulta_sync)
    monkeypatch.setattr(
        empleados_service_module,
        "run_in_threadpool",
        ejecutar_en_hilo,
    )

    resultado = await EmpleadosService.obtener_empleado_por_cedula(
        db_erp,
        "123",
        solo_activos=False,
    )

    assert resultado == esperado
    ejecutar_en_hilo.assert_awaited_once_with(consulta_sync, db_erp, "123", False)


@pytest.mark.asyncio
async def test_consultar_empleados_bulk_async_delega_consulta_sync(monkeypatch):
    db_erp = object()
    esperado = {"123": {"cedula": "123"}}
    consulta_sync = Mock(return_value=esperado)
    ejecutar_en_hilo = AsyncMock(return_value=esperado)
    monkeypatch.setattr(EmpleadosService, "consultar_empleados_bulk", consulta_sync)
    monkeypatch.setattr(
        empleados_service_module,
        "run_in_threadpool",
        ejecutar_en_hilo,
    )

    resultado = await EmpleadosService.consultar_empleados_bulk_async(db_erp, ["123"])

    assert resultado == esperado
    ejecutar_en_hilo.assert_awaited_once_with(consulta_sync, db_erp, ["123"])


@pytest.mark.asyncio
async def test_consultar_empleados_bulk_async_delega_bandera_salarial(monkeypatch):
    db_erp = object()
    esperado = {"123": {"salario_base_mensual": 3_300_000}}
    consulta_sync = Mock(return_value=esperado)
    ejecutar_en_hilo = AsyncMock(return_value=esperado)
    monkeypatch.setattr(EmpleadosService, "consultar_empleados_bulk", consulta_sync)
    monkeypatch.setattr(empleados_service_module, "run_in_threadpool", ejecutar_en_hilo)

    resultado = await EmpleadosService.consultar_empleados_bulk_async(
        db_erp,
        ["123"],
        incluir_datos_laborales=True,
        incluir_salario=True,
    )

    assert resultado == esperado
    ejecutar_en_hilo.assert_awaited_once_with(consulta_sync, db_erp, ["123"], True, True)


@pytest.mark.asyncio
async def test_obtener_todos_empleados_activos_async_delega_consulta_sync(monkeypatch):
    db_erp = object()
    esperado = [{"cedula": "123"}]
    consulta_sync = Mock(return_value=esperado)
    ejecutar_en_hilo = AsyncMock(return_value=esperado)
    monkeypatch.setattr(
        EmpleadosService,
        "obtener_todos_los_empleados_activos",
        consulta_sync,
    )
    monkeypatch.setattr(
        empleados_service_module,
        "run_in_threadpool",
        ejecutar_en_hilo,
    )

    resultado = await EmpleadosService.obtener_todos_los_empleados_activos_async(db_erp)

    assert resultado == esperado
    ejecutar_en_hilo.assert_awaited_once_with(consulta_sync, db_erp)


@pytest.mark.asyncio
async def test_actualizar_correo_erp_delega_escritura_sync(monkeypatch):
    db_erp = object()
    escritura_sync = Mock(return_value=True)
    ejecutar_en_hilo = AsyncMock(return_value=True)
    monkeypatch.setattr(
        EmpleadosService,
        "actualizar_correo_erp_sync",
        escritura_sync,
    )
    monkeypatch.setattr(
        empleados_service_module,
        "run_in_threadpool",
        ejecutar_en_hilo,
    )

    resultado = await EmpleadosService.actualizar_correo_erp(
        db_erp,
        "123",
        "persona@example.com",
    )

    assert resultado is True
    ejecutar_en_hilo.assert_awaited_once_with(
        escritura_sync,
        db_erp,
        "123",
        "persona@example.com",
    )
