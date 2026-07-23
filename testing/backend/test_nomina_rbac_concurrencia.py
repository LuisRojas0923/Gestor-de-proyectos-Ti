"""Regresiones de seguridad y serialización del flujo compartido de nómina."""

import asyncio
import io
import zipfile
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.novedades_nomina.dependencies import (
    requiere_permiso_comisiones,
    requiere_permiso_nomina_novedades,
)
from app.api.novedades_nomina.nomina_router import procesar_archivo
from app.database import obtener_db
from app.config import config
from app.main import app
from app.services.novedades_nomina.errores import ErrorEstructuraNomina
from app.services.novedades_nomina.nomina_service import NominaService
from app.models.novedades_nomina.nomina import (
    NominaArchivo,
    NominaExcepcion,
    NominaExcepcionHistorial,
    NominaRegistroNormalizado,
)
from sqlmodel import delete, select

def _contenido_xlsx_minimo() -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("xl/workbook.xml", "<workbook />")
    return output.getvalue()


def _upload_xlsx(nombre: str = "fuente.xlsx"):
    archivo = AsyncMock()
    archivo.filename = nombre
    archivo.content_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    archivo.read = AsyncMock(return_value=_contenido_xlsx_minimo())
    return archivo

RUTAS_SENSIBLES = (
    ("GET", "/api/v2/novedades-nomina/catalogo"),
    ("GET", "/api/v2/novedades-nomina/historial"),
    ("GET", "/api/v2/novedades-nomina/archivos/1/preview"),
    ("GET", "/api/v2/novedades-nomina/archivos/1/descargar"),
    ("POST", "/api/v2/novedades-nomina/archivos"),
    ("POST", "/api/v2/novedades-nomina/archivos/1/procesar"),
    ("GET", "/api/v2/novedades-nomina/subcategorias/resumen?mes=7&a%C3%B1o=2026"),
    ("GET", "/api/v2/novedades-nomina/subcategorias/SEGUROS%20HDI?mes=7&a%C3%B1o=2026"),
    ("POST", "/api/v2/novedades-nomina/exportar-solid?mes=7&a%C3%B1o=2026"),
    ("GET", "/api/v2/novedades-nomina/excepciones/"),
    ("POST", "/api/v2/novedades-nomina/excepciones/"),
    ("GET", "/api/v2/novedades-nomina/control_descuentos/datos?mes=7&anio=2026"),
    ("POST", "/api/v2/novedades-nomina/control_descuentos/preview"),
    ("GET", "/api/v2/novedades-nomina/camposanto/datos?mes=7&anio=2026"),
    ("POST", "/api/v2/novedades-nomina/camposanto/preview"),
    ("GET", "/api/v2/novedades-nomina/bogota_libranza/datos?mes=7&anio=2026"),
    ("GET", "/api/v2/novedades-nomina/medicina_prepagada/datos?mes=7&anio=2026"),
    ("GET", "/api/v2/novedades-nomina/planillas_regionales_1q/datos?mes=7&anio=2026"),
    ("GET", "/api/v2/novedades-nomina/tabla-maestra/validar?mes=7&anio=2026"),
)


@pytest.mark.parametrize(("method", "ruta"), RUTAS_SENSIBLES)
def test_rutas_genericas_nomina_rechazan_solicitud_sin_token(method, ruta):
    client = TestClient(app, raise_server_exceptions=False)
    response = client.request(method, ruta)
    assert response.status_code == 401


@pytest.mark.parametrize(("method", "ruta"), RUTAS_SENSIBLES)
def test_rutas_genericas_nomina_rechazan_usuario_sin_permiso(method, ruta):
    async def sin_permiso():
        raise HTTPException(status_code=403, detail="Sin permiso")

    app.dependency_overrides[requiere_permiso_nomina_novedades] = sin_permiso
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.request(method, ruta)
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_comisiones_rechaza_usuario_sin_permiso_del_modulo():
    async def sin_permiso():
        raise HTTPException(status_code=403, detail="Sin permiso")

    app.dependency_overrides[requiere_permiso_comisiones] = sin_permiso
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/api/v2/novedades-nomina/comisiones/datos?mes=7&anio=2026")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_todo_el_arbol_nomina_declara_dependencia_rbac():
    rutas_nomina = [
        route
        for route in app.routes
        if getattr(route, "path", "").startswith("/api/v2/novedades-nomina/")
    ]
    assert rutas_nomina

    for route in rutas_nomina:
        dependencias = {
            dependency.call
            for dependency in getattr(route, "dependant").dependencies
        }
        esperada = (
            requiere_permiso_comisiones
            if route.path.startswith("/api/v2/novedades-nomina/comisiones/")
            else requiere_permiso_nomina_novedades
        )
        assert esperada in dependencias, f"Ruta sin RBAC: {route.path}"


@pytest.mark.asyncio
async def test_bloqueo_nomina_usa_clave_estable_por_periodo():
    session = AsyncMock()

    await NominaService._bloquear_periodo(
        session,
        subcategoria=" SEGUROS HDI ",
        mes=7,
        anio=2026,
    )

    statement, params = session.execute.await_args.args
    assert "pg_advisory_xact_lock" in str(statement)
    assert params == {"scope": "nomina:SEGUROS HDI:2026:7"}


@pytest.mark.asyncio
async def test_bloqueo_postgresql_serializa_dos_cargas_del_mismo_periodo():
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as first, factory() as second:
            await NominaService._bloquear_periodo(first, "SEGUROS HDI", 7, 2026)
            waiting = asyncio.create_task(
                NominaService._bloquear_periodo(second, "SEGUROS HDI", 7, 2026)
            )
            await asyncio.sleep(0.1)
            assert not waiting.done()

            await first.commit()
            await asyncio.wait_for(waiting, timeout=2)
            await second.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_dos_flujos_completos_serializan_saldo_y_reemplazo(
    tmp_path, monkeypatch
):
    monkeypatch.chdir(tmp_path)
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    subcategoria = "PRUEBA CONCURRENCIA NOMINA"
    cedula = "9912345678"
    mes = 12
    anio = 2099

    async with factory() as setup:
        await setup.execute(
            delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.subcategoria_final == subcategoria,
                NominaRegistroNormalizado.mes_fact == mes,
                NominaRegistroNormalizado.año_fact == anio,
            )
        )
        excepciones_previas = await setup.execute(
            select(NominaExcepcion).where(
                NominaExcepcion.cedula == cedula,
                NominaExcepcion.subcategoria == subcategoria,
            )
        )
        for excepcion in excepciones_previas.scalars().all():
            await setup.execute(
                delete(NominaExcepcionHistorial).where(
                    NominaExcepcionHistorial.excepcion_id == excepcion.id
                )
            )
            await setup.delete(excepcion)
        excepcion = NominaExcepcion(
            cedula=cedula,
            nombre_asociado="PRUEBA CONCURRENCIA",
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

    def upload(nombre: str):
        return _upload_xlsx(nombre)

    rows = [{
        "cedula": cedula,
        "nombre_asociado": "PRUEBA CONCURRENCIA",
        "valor": 60.0,
        "concepto": "PRUEBA",
    }]
    mapa_erp = {
        cedula: {
            "nombre": "PRUEBA CONCURRENCIA",
            "empresa": "REFRIDCOL",
            "estado": "ACTIVO",
            "ciudadcontratacion": "CALI",
        }
    }

    try:
        async with factory() as first, factory() as second:
            with patch.object(
                NominaService,
                "get_mapa_erp",
                new=AsyncMock(return_value=mapa_erp),
            ):
                resultados = await asyncio.gather(
                    NominaService.procesar_flujo(
                        first, AsyncMock(), [upload("uno.xlsx")], "OTROS",
                        subcategoria, lambda _: (rows, {}, []), "xlsx", mes, anio,
                    ),
                    NominaService.procesar_flujo(
                        second, AsyncMock(), [upload("dos.xlsx")], "OTROS",
                        subcategoria, lambda _: (rows, {}, []), "xlsx", mes, anio,
                    ),
                )

        async with factory() as check:
            excepcion_final = await check.get(NominaExcepcion, excepcion_id)
            historiales = await check.execute(
                select(NominaExcepcionHistorial).where(
                    NominaExcepcionHistorial.excepcion_id == excepcion_id,
                    NominaExcepcionHistorial.mes == mes,
                    NominaExcepcionHistorial.anio == anio,
                )
            )
            registros = await check.execute(
                select(NominaRegistroNormalizado).where(
                    NominaRegistroNormalizado.subcategoria_final == subcategoria,
                    NominaRegistroNormalizado.mes_fact == mes,
                    NominaRegistroNormalizado.año_fact == anio,
                )
            )
            archivos = [await check.get(NominaArchivo, r["archivo_id"]) for r in resultados]
            historial_final = historiales.scalars().all()
            registros_finales = registros.scalars().all()

            assert excepcion_final.saldo_actual == 0
            assert excepcion_final.estado == "AGOTADO"
            assert len(historial_final) == 1
            assert historial_final[0].valor_aplicado == 60
            assert len(registros_finales) == 1
            assert registros_finales[0].valor == 0
            assert registros_finales[0].estado_validacion == "EXCEPCION_SALDO_FAVOR"
            assert all(archivo is not None for archivo in archivos)
    finally:
        async with factory() as cleanup:
            await cleanup.execute(
                delete(NominaRegistroNormalizado).where(
                    NominaRegistroNormalizado.subcategoria_final == subcategoria,
                    NominaRegistroNormalizado.mes_fact == mes,
                    NominaRegistroNormalizado.año_fact == anio,
                )
            )
            await cleanup.execute(
                delete(NominaExcepcionHistorial).where(
                    NominaExcepcionHistorial.excepcion_id == excepcion_id
                )
            )
            await cleanup.execute(
                delete(NominaExcepcion).where(NominaExcepcion.id == excepcion_id)
            )
            for result in locals().get("resultados", []):
                await cleanup.execute(
                    delete(NominaArchivo).where(NominaArchivo.id == result["archivo_id"])
                )
            await cleanup.commit()
        await engine.dispose()


def _registro_normalizado():
    return SimpleNamespace(
        cedula="94416010",
        nombre_asociado="PRECIADO JOSE",
        valor=100.0,
        valor_rdc=24.0,
        valor_colaborador=76.0,
        empresa="REFRIDCOL",
        concepto="PRUEBA",
        ciudad=None,
        observaciones=None,
        horas=0,
        dias=0,
        estado_validacion="OK",
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "subcategoria",
    ["MEDICINA PREPAGADA", "POLIZAS VEHICULOS", "OTROS GERENCIA"],
)
async def test_servicio_compartido_conserva_flujo_exitoso(
    tmp_path, monkeypatch, subcategoria
):
    monkeypatch.chdir(tmp_path)
    session = AsyncMock()
    session.execute.side_effect = [MagicMock(), MagicMock()]
    upload = _upload_xlsx()
    rows = [{"cedula": "94416010", "valor": 100.0}]

    with (
        patch(
            "app.services.novedades_nomina.nomina_service.ExcepcionService.obtener_excepciones_activas",
            new=AsyncMock(return_value=[]),
        ),
        patch.object(NominaService, "get_mapa_erp", new=AsyncMock(return_value={})),
        patch.object(
            NominaService,
            "crear_archivo_procesado",
            new=AsyncMock(return_value=SimpleNamespace(id=7)),
        ),
        patch.object(
            NominaService,
            "persistir_registros_normalizados",
            new=AsyncMock(return_value=[_registro_normalizado()]),
        ),
    ):
        result = await NominaService.procesar_flujo(
            session=session,
            db_erp=AsyncMock(),
            files=[upload],
            categoria="OTROS",
            subcategoria=subcategoria,
            extractor_fn=lambda _archivos: (rows, {}, []),
            extension="xlsx",
            mes=7,
            anio=2026,
        )

    assert result["archivo_id"] == 7
    assert len(result["rows"]) == 1
    assert "pg_advisory_xact_lock" in str(session.execute.await_args_list[0].args[0])
    assert "DELETE FROM nomina_registros_normalizados" in str(
        session.execute.await_args_list[1].args[0]
    )
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_servicio_bloquea_antes_de_cargar_excepciones(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    eventos = []
    session = AsyncMock()
    upload = _upload_xlsx()

    async def bloquear(*_args, **_kwargs):
        eventos.append("lock")

    async def excepciones(*_args, **_kwargs):
        eventos.append("excepciones")
        return []

    with (
        patch.object(NominaService, "_bloquear_periodo", side_effect=bloquear),
        patch(
            "app.services.novedades_nomina.nomina_service.ExcepcionService.obtener_excepciones_activas",
            side_effect=excepciones,
        ),
        patch.object(NominaService, "get_mapa_erp", new=AsyncMock(return_value={})),
        patch.object(
            NominaService,
            "crear_archivo_procesado",
            new=AsyncMock(return_value=SimpleNamespace(id=7)),
        ),
        patch.object(
            NominaService,
            "persistir_registros_normalizados",
            new=AsyncMock(return_value=[_registro_normalizado()]),
        ),
    ):
        await NominaService.procesar_flujo(
            session=session,
            db_erp=AsyncMock(),
            files=[upload],
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            extractor_fn=lambda _archivos: ([{"cedula": "94416010"}], {}, []),
            extension="xlsx",
            mes=7,
            anio=2026,
        )

    assert eventos == ["lock", "excepciones"]


@pytest.mark.asyncio
async def test_reproceso_generico_no_borra_si_archivo_no_existe():
    session = AsyncMock()
    session.get.return_value = SimpleNamespace(
        id=7,
        ruta_almacenamiento="archivo-ausente.xlsx",
        tipo_archivo="xlsx",
        subcategoria="OTROS GERENCIA",
        estado="Procesado",
        error_log=None,
    )

    with pytest.raises(HTTPException):
        await procesar_archivo(7, session=session, db_erp=AsyncMock())

    session.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_reproceso_generico_no_borra_si_extraccion_esta_vacia(
    tmp_path, monkeypatch
):
    archivo_path = tmp_path / "vacio.xlsx"
    archivo_path.write_bytes(b"contenido")
    session = AsyncMock()
    session.get.return_value = SimpleNamespace(
        id=7,
        ruta_almacenamiento=str(archivo_path),
        tipo_archivo="xlsx",
        subcategoria="OTROS GERENCIA",
        mes_fact=7,
        año_fact=2026,
        estado="Procesado",
        error_log=None,
    )
    monkeypatch.setattr(
        "app.api.novedades_nomina.nomina_router.NominaExtractor.extract_from_binary",
        lambda *_args: [],
    )

    with pytest.raises(HTTPException) as exc_info:
        await procesar_archivo(7, session=session, db_erp=AsyncMock())

    assert exc_info.value.status_code == 422
    session.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_servicio_compartido_revierte_si_falla_escritura(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    session = AsyncMock()
    upload = _upload_xlsx()

    with (
        patch(
            "app.services.novedades_nomina.nomina_service.ExcepcionService.obtener_excepciones_activas",
            new=AsyncMock(return_value=[]),
        ),
        patch.object(NominaService, "get_mapa_erp", new=AsyncMock(return_value={})),
        patch(
            "app.services.novedades_nomina.nomina_service.guardar_archivo_nomina",
            new=AsyncMock(side_effect=OSError("disco no disponible")),
        ),
        pytest.raises(OSError, match="disco no disponible"),
    ):
        await NominaService.procesar_flujo(
            session=session,
            db_erp=AsyncMock(),
            files=[upload],
            categoria="OTROS",
            subcategoria="MEDICINA PREPAGADA",
            extractor_fn=lambda _archivos: ([{"cedula": "1"}], {}, []),
            extension="xlsx",
            mes=7,
            anio=2026,
        )

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
    assert session.execute.await_count == 1


@pytest.mark.asyncio
async def test_error_estructural_seguro_llega_como_422():
    upload = _upload_xlsx("hdi.xlsx")

    def extractor(_archivos):
        raise ErrorEstructuraNomina("Hoja 'HDI', fila 8: PRIMA ANUAL es inválida.")

    with pytest.raises(HTTPException) as exc_info:
        await NominaService.procesar_flujo(
            session=AsyncMock(),
            db_erp=AsyncMock(),
            files=[upload],
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            extractor_fn=extractor,
            extension="xlsx",
            mes=7,
            anio=2026,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Hoja 'HDI', fila 8: PRIMA ANUAL es inválida."


def test_preview_no_expone_detalle_interno_en_error_500():
    session = AsyncMock()
    session.execute.side_effect = RuntimeError("postgres-password=secreto")
    app.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: object()
    app.dependency_overrides[obtener_db] = lambda: session
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/api/v2/novedades-nomina/archivos/1/preview")
        assert response.status_code == 500
        assert "secreto" not in response.text
    finally:
        app.dependency_overrides.clear()


def test_descarga_rechaza_ruta_fuera_del_almacenamiento():
    session = AsyncMock()
    session.get.return_value = SimpleNamespace(
        ruta_almacenamiento="../../etc/passwd",
        nombre_archivo="passwd",
    )
    app.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: object()
    app.dependency_overrides[obtener_db] = lambda: session
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/api/v2/novedades-nomina/archivos/1/descargar")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
