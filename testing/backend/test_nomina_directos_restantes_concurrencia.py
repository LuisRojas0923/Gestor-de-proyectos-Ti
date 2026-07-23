"""Contrato transaccional de los flujos directos restantes de nómina."""

import asyncio
import threading
import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import delete, select

from app.config import config
from app.models.novedades_nomina.nomina import (
    NominaArchivo,
    NominaExcepcion,
    NominaExcepcionHistorial,
)
from app.services.novedades_nomina.excepcion_service import ExcepcionService
from app.services.novedades_nomina.nomina_helper import NominaHelper
from app.services.novedades_nomina.nomina_service import NominaService


SUBCATEGORIAS_DIRECTAS = [
    "BOGOTA LIBRANZA",
    "DAVIVIENDA LIBRANZA",
    "OCCIDENTE LIBRANZA",
    "CAMPOSANTO",
    "RECORDAR",
    "BENEFICIAR",
    "GRANCOOP",
    "CONTROL DE DESCUENTOS",
]


@pytest.mark.asyncio
@pytest.mark.parametrize("subcategoria", SUBCATEGORIAS_DIRECTAS)
async def test_reemplazo_directo_rechaza_filas_vacias_antes_del_lock(subcategoria):
    session = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await NominaService.preparar_reemplazo_directo(
            session, subcategoria, 7, 2026, []
        )

    assert exc_info.value.status_code == 422
    session.execute.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("subcategoria", SUBCATEGORIAS_DIRECTAS)
async def test_reemplazo_directo_bloquea_antes_de_consultar_excepciones(subcategoria):
    eventos = []
    session = AsyncMock()

    async def bloquear(*_args, **_kwargs):
        eventos.append("lock")

    async def excepciones(*_args, **kwargs):
        assert kwargs["bloquear"] is True
        eventos.append("excepciones")
        return []

    with (
        patch.object(NominaService, "_bloquear_periodo", side_effect=bloquear),
        patch(
            "app.services.novedades_nomina.nomina_service."
            "ExcepcionService.obtener_excepciones_activas",
            side_effect=excepciones,
        ),
    ):
        await NominaService.preparar_reemplazo_directo(
            session, subcategoria, 7, 2026, [{"cedula": "1", "valor": 10}]
        )

    assert eventos == ["lock", "excepciones"]


@pytest.mark.asyncio
async def test_consulta_erp_bulk_no_bloquea_event_loop(monkeypatch):
    class SesionWorker:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

    def consulta_lenta(*_args):
        time.sleep(0.15)
        return {}

    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper.SessionErp",
        SesionWorker,
    )
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper."
        "EmpleadosService.consultar_empleados_bulk",
        consulta_lenta,
    )
    inicio = time.perf_counter()
    consulta = asyncio.create_task(
        NominaHelper.get_mapa_erp(
            object(), [{"cedula": "123"}], []
        )
    )
    await asyncio.sleep(0.02)
    latencia_event_loop = time.perf_counter() - inicio
    await consulta

    assert latencia_event_loop < 0.1


@pytest.mark.asyncio
async def test_consulta_erp_bulk_crea_y_cierra_sesion_dentro_del_worker(monkeypatch):
    dependencia = object()
    sesiones = []
    hilos = []

    class SesionWorker:
        cerrada = False

        def __enter__(self):
            sesiones.append(self)
            hilos.append(threading.get_ident())
            return self

        def __exit__(self, *_args):
            self.cerrada = True

    def consultar(sesion, cedulas):
        assert sesion is sesiones[0]
        assert sesion is not dependencia
        assert cedulas == ["123"]
        return {"123": {"nombre": "PRUEBA"}}

    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper.SessionErp",
        SesionWorker,
    )
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper."
        "EmpleadosService.consultar_empleados_bulk",
        consultar,
    )

    resultado = await NominaHelper.consultar_empleados_bulk(dependencia, ["123"])

    assert resultado == {"123": {"nombre": "PRUEBA"}}
    assert sesiones[0].cerrada is True
    assert hilos[0] != threading.get_ident()


@pytest.mark.asyncio
async def test_empleados_activos_erp_usa_wrapper_async_y_sesion_propia(monkeypatch):
    dependencia = object()
    sesiones = []

    class SesionWorker:
        cerrada = False

        def __enter__(self):
            sesiones.append(self)
            return self

        def __exit__(self, *_args):
            self.cerrada = True

    def consultar(sesion):
        assert sesion is sesiones[0]
        assert sesion is not dependencia
        return [{"nrocedula": "123"}]

    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper.SessionErp",
        SesionWorker,
    )
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper."
        "EmpleadosService.obtener_todos_los_empleados_activos",
        consultar,
    )

    resultado = await NominaHelper.obtener_todos_los_empleados_activos(dependencia)

    assert resultado == [{"nrocedula": "123"}]
    assert sesiones[0].cerrada is True


@pytest.mark.asyncio
async def test_consulta_erp_timeout_no_cierra_ni_reutiliza_sesion_dependencia(monkeypatch):
    dependencia = object()
    consulta_iniciada = threading.Event()
    liberar_consulta = threading.Event()
    sesion_cerrada = threading.Event()

    class SesionWorker:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            sesion_cerrada.set()

    def consultar(sesion, _cedulas):
        assert sesion is not dependencia
        consulta_iniciada.set()
        liberar_consulta.wait(timeout=1)
        return {}

    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper.SessionErp",
        SesionWorker,
    )
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper."
        "EmpleadosService.consultar_empleados_bulk",
        consultar,
    )
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper."
        "TIMEOUT_CONSULTA_ERP_SEGUNDOS",
        0.02,
    )

    with pytest.raises(HTTPException) as exc_info:
        await NominaHelper.consultar_empleados_bulk(dependencia, ["123"])

    assert exc_info.value.status_code == 504
    assert consulta_iniciada.is_set()
    assert not sesion_cerrada.is_set()
    liberar_consulta.set()
    assert await asyncio.to_thread(sesion_cerrada.wait, 1)


@pytest.mark.asyncio
async def test_consulta_erp_limita_tambien_espera_del_semaforo(monkeypatch):
    semaforo_ocupado = asyncio.Semaphore(0)
    consulta = AsyncMock()
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper._semaforo_erp",
        semaforo_ocupado,
    )
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper."
        "TIMEOUT_CONSULTA_ERP_SEGUNDOS",
        0.02,
    )
    monkeypatch.setattr(
        "app.services.novedades_nomina.nomina_helper."
        "EmpleadosService.consultar_empleados_bulk",
        consulta,
    )

    with pytest.raises(HTTPException) as exc_info:
        await NominaHelper.consultar_empleados_bulk(object(), ["123"])

    assert exc_info.value.status_code == 504
    consulta.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("subcategoria", SUBCATEGORIAS_DIRECTAS)
async def test_postgresql_serializa_saldo_repetido_y_reproceso(subcategoria):
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    cedula = f"98{SUBCATEGORIAS_DIRECTAS.index(subcategoria):02d}2097"
    mes, anio = 10, 2097
    excepcion_id = None

    try:
        async with factory() as setup:
            anteriores = (await setup.execute(select(NominaExcepcion).where(
                NominaExcepcion.cedula == cedula,
                NominaExcepcion.subcategoria == subcategoria,
            ))).scalars().all()
            for anterior in anteriores:
                await setup.execute(delete(NominaExcepcionHistorial).where(
                    NominaExcepcionHistorial.excepcion_id == anterior.id
                ))
                await setup.delete(anterior)
            excepcion = NominaExcepcion(
                cedula=cedula,
                nombre_asociado="PRUEBA DIRECTA",
                subcategoria=subcategoria,
                tipo="SALDO_FAVOR",
                estado="ACTIVO",
                valor_configurado=60,
                saldo_actual=60,
                creado_por="pytest",
            )
            setup.add(excepcion)
            await setup.commit()
            await setup.refresh(excepcion)
            excepcion_id = excepcion.id

        rows = [
            {"cedula": cedula, "valor": 40.0},
            {"cedula": cedula, "valor": 40.0},
        ]

        async def procesar(session):
            excepciones = await NominaService.preparar_reemplazo_directo(
                session, subcategoria, mes, anio, rows
            )
            excepcion = next(item for item in excepciones if item.id == excepcion_id)
            procesadas = set()
            valores = []
            for row in rows:
                valores.append(await ExcepcionService.aplicar_saldo_favor(
                    session,
                    excepcion,
                    row["valor"],
                    mes,
                    anio,
                    acumular_periodo=excepcion.id in procesadas,
                ))
                procesadas.add(excepcion.id)
            await session.commit()
            return valores

        async with factory() as primera, factory() as segunda:
            resultados = await asyncio.gather(
                procesar(primera),
                procesar(segunda),
            )

        assert all(sorted(resultado) == [0, 20] for resultado in resultados)
        async with factory() as check:
            excepcion_final = await check.get(NominaExcepcion, excepcion_id)
            historiales = (await check.execute(select(NominaExcepcionHistorial).where(
                NominaExcepcionHistorial.excepcion_id == excepcion_id,
                NominaExcepcionHistorial.mes == mes,
                NominaExcepcionHistorial.anio == anio,
            ))).scalars().all()
            assert excepcion_final.estado == "AGOTADO"
            assert excepcion_final.saldo_actual == 0
            assert len(historiales) == 1
            assert historiales[0].valor_aplicado == 60
    finally:
        if excepcion_id is not None:
            async with factory() as cleanup:
                await cleanup.execute(delete(NominaExcepcionHistorial).where(
                    NominaExcepcionHistorial.excepcion_id == excepcion_id
                ))
                await cleanup.execute(delete(NominaExcepcion).where(
                    NominaExcepcion.id == excepcion_id
                ))
                await cleanup.commit()
        await engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize("subcategoria", SUBCATEGORIAS_DIRECTAS)
async def test_postgresql_reproceso_directo_reutiliza_metadata(subcategoria):
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    indice = SUBCATEGORIAS_DIRECTAS.index(subcategoria)
    hash_archivo = f"{indice:064x}"
    mes, anio = 9, 2096
    rows = [{"cedula": "1", "valor": 10.0}]

    async with factory() as setup:
        await setup.execute(delete(NominaArchivo).where(
            NominaArchivo.hash_archivo == hash_archivo,
            NominaArchivo.subcategoria == subcategoria,
            NominaArchivo.mes_fact == mes,
            NominaArchivo.año_fact == anio,
        ))
        await setup.commit()

    async def reprocesar(session):
        await NominaService.preparar_reemplazo_directo(
            session, subcategoria, mes, anio, rows
        )
        archivo = await NominaService.obtener_o_crear_archivo(
            session,
            hash_archivo=hash_archivo,
            subcategoria=subcategoria,
            mes=mes,
            anio=anio,
            nombre_archivo="prueba.xlsx",
            tamaño_bytes=10,
            tipo_archivo="xlsx",
            ruta_almacenamiento=f"uploads/nomina/{hash_archivo}.xlsx",
            categoria="PRUEBA",
        )
        await session.commit()
        return archivo.id

    try:
        async with factory() as primera, factory() as segunda:
            ids = await asyncio.gather(
                reprocesar(primera),
                reprocesar(segunda),
            )
        assert ids[0] == ids[1]
        async with factory() as check:
            archivos = (await check.execute(select(NominaArchivo).where(
                NominaArchivo.hash_archivo == hash_archivo,
                NominaArchivo.subcategoria == subcategoria,
                NominaArchivo.mes_fact == mes,
                NominaArchivo.año_fact == anio,
            ))).scalars().all()
            assert len(archivos) == 1
    finally:
        async with factory() as cleanup:
            await cleanup.execute(delete(NominaArchivo).where(
                NominaArchivo.hash_archivo == hash_archivo,
                NominaArchivo.subcategoria == subcategoria,
                NominaArchivo.mes_fact == mes,
                NominaArchivo.año_fact == anio,
            ))
            await cleanup.commit()
        await engine.dispose()
