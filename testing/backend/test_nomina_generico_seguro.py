"""Pruebas focales del reproceso y almacenamiento genéricos de nómina."""

import asyncio
import hashlib
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import config
from app.models.novedades_nomina.nomina import (
    NominaArchivo,
    NominaRegistroCrudo,
    NominaRegistroNormalizado,
)


@pytest.mark.asyncio
async def test_ejecutor_generico_usa_proceso_cancelable_y_limite_de_lectura():
    from app.services.novedades_nomina import procesamiento_seguro as modulo

    ejecutar = AsyncMock(return_value=[{"cedula": "1"}])
    with patch.object(modulo.to_process, "run_sync", new=ejecutar):
        resultado = await modulo.ejecutar_extractor_generico_seguro(
            "archivo.xlsx", "xlsx"
        )

    assert resultado == [{"cedula": "1"}]
    assert ejecutar.await_args.args == (
        modulo._extraer_archivo_generico,
        "archivo.xlsx",
        "xlsx",
        modulo.MAX_BYTES_REPROCESO,
    )
    assert ejecutar.await_args.kwargs["cancellable"] is True


def test_lector_de_reproceso_rechaza_archivo_sobredimensionado(tmp_path):
    from app.services.novedades_nomina.procesamiento_seguro import (
        _extraer_archivo_generico,
    )

    archivo = tmp_path / "grande.csv"
    archivo.write_bytes(b"12345")

    with pytest.raises(ValueError, match="supera"):
        _extraer_archivo_generico(str(archivo), "csv", 4)


@pytest.mark.asyncio
async def test_carga_existente_usa_y_limpia_rutas_unicas(tmp_path):
    from app.api.novedades_nomina import nomina_router as modulo

    contenido = b"contenido"
    existente = MagicMock()
    resultado = MagicMock()
    resultado.scalars.return_value.first.return_value = existente
    session = AsyncMock()
    session.execute.return_value = resultado

    async def guardar(path, content):
        Path(path).write_bytes(content)

    rutas = []
    async def guardar_registrando(path, content):
        rutas.append(path)
        await guardar(path, content)

    with (
        patch.object(modulo, "STORAGE_DIR", str(tmp_path)),
        patch.object(
            modulo,
            "leer_archivos_nomina_http",
            new=AsyncMock(return_value=([contenido], ["nomina.xlsx"], ["xlsx"])),
        ),
        patch.object(modulo, "guardar_archivo_nomina", new=guardar_registrando),
        patch.object(
            modulo.uuid,
            "uuid4",
            side_effect=[SimpleNamespace(hex="uuid1"), SimpleNamespace(hex="uuid2")],
        ),
    ):
        for _ in range(2):
            assert await modulo.cargar_archivo.__wrapped__(
                request=MagicMock(),
                mes=7,
                año=2026,
                subcategoria="CELULARES",
                categoria="DESCUENTOS",
                file=MagicMock(),
                session=session,
            ) is existente

    file_hash = hashlib.sha256(contenido).hexdigest()
    assert rutas == [
        str(tmp_path / f"{file_hash}-uuid1.xlsx"),
        str(tmp_path / f"{file_hash}-uuid2.xlsx"),
    ]
    assert all(not Path(ruta).exists() for ruta in rutas)


@pytest.mark.asyncio
async def test_fallo_db_elimina_solo_la_ruta_de_la_carga(tmp_path):
    from app.api.novedades_nomina import nomina_router as modulo

    contenido = b"contenido"
    session = AsyncMock()
    session.execute.side_effect = RuntimeError("fallo con datos sensibles")

    async def guardar(path, content):
        Path(path).write_bytes(content)

    with (
        patch.object(modulo, "STORAGE_DIR", str(tmp_path)),
        patch.object(
            modulo,
            "leer_archivos_nomina_http",
            new=AsyncMock(return_value=([contenido], ["nomina.xlsx"], ["xlsx"])),
        ),
        patch.object(modulo, "guardar_archivo_nomina", new=guardar),
        patch.object(
            modulo.uuid, "uuid4", return_value=SimpleNamespace(hex="propia")
        ),
    ):
        with pytest.raises(Exception, match="No fue posible guardar el archivo"):
            await modulo.cargar_archivo.__wrapped__(
                request=MagicMock(),
                mes=7,
                año=2026,
                subcategoria="CELULARES",
                categoria="DESCUENTOS",
                file=MagicMock(),
                session=session,
            )

    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_migracion_identidad_toma_lock_antes_de_modificar():
    from app.core.migrations.nomina_archivos_migration import (
        asegurar_identidad_archivo_nomina,
    )

    class ConexionFalsa:
        def __init__(self):
            self.sentencias = []
            self.existencias = iter((False, False))

        async def execute(self, statement):
            sentencia = str(statement)
            self.sentencias.append(sentencia)
            resultado = MagicMock()
            if "SELECT EXISTS" in sentencia:
                resultado.scalar_one.return_value = next(self.existencias)
            return resultado

    conn = ConexionFalsa()
    await asegurar_identidad_archivo_nomina(conn)

    assert "SELECT EXISTS" in conn.sentencias[0]
    assert "pg_advisory_xact_lock" in conn.sentencias[1]
    assert "SELECT EXISTS" in conn.sentencias[2]
    assert "SET LOCAL lock_timeout" in conn.sentencias[3]
    assert "LOCK TABLE nomina_archivos" in conn.sentencias[4]
    assert "uq_nomina_archivo_identidad_periodo" in conn.sentencias[-1]


@pytest.mark.asyncio
async def test_migracion_identidad_retorna_si_constraint_ya_existe():
    from app.core.migrations.nomina_archivos_migration import (
        asegurar_identidad_archivo_nomina,
    )

    conn = AsyncMock()
    resultado = MagicMock()
    resultado.scalar_one.return_value = True
    conn.execute.return_value = resultado

    await asegurar_identidad_archivo_nomina(conn)

    assert conn.execute.await_count == 1
    assert "SELECT EXISTS" in str(conn.execute.await_args.args[0])


@pytest.mark.asyncio
async def test_migracion_identidad_revalida_despues_del_advisory_lock():
    from app.core.migrations.nomina_archivos_migration import (
        asegurar_identidad_archivo_nomina,
    )

    class ConexionFalsa:
        def __init__(self):
            self.sentencias = []
            self.existencias = iter((False, True))

        async def execute(self, statement):
            sentencia = str(statement)
            self.sentencias.append(sentencia)
            resultado = MagicMock()
            if "SELECT EXISTS" in sentencia:
                resultado.scalar_one.return_value = next(self.existencias)
            return resultado

    conn = ConexionFalsa()
    await asegurar_identidad_archivo_nomina(conn)

    assert len(conn.sentencias) == 3
    assert "pg_advisory_xact_lock" in conn.sentencias[1]
    assert "SELECT EXISTS" in conn.sentencias[2]
    assert all("LOCK TABLE" not in sentencia for sentencia in conn.sentencias)


@pytest.mark.asyncio
async def test_migracion_identidad_tolera_dos_startups_postgresql():
    from app.core.migrations.nomina_archivos_migration import (
        asegurar_identidad_archivo_nomina,
    )

    engine = create_async_engine(config.database_url, poolclass=NullPool)
    async with engine.begin() as setup:
        await setup.execute(text(
            "ALTER TABLE nomina_archivos DROP CONSTRAINT IF EXISTS "
            "uq_nomina_archivo_identidad_periodo"
        ))

    async def ejecutar():
        async with engine.begin() as conn:
            await asegurar_identidad_archivo_nomina(conn)

    await asyncio.wait_for(asyncio.gather(ejecutar(), ejecutar()), timeout=10)
    async with engine.connect() as check:
        resultado = await check.execute(text("""
            SELECT COUNT(*)
            FROM pg_constraint
            WHERE conname = 'uq_nomina_archivo_identidad_periodo'
              AND conrelid = 'nomina_archivos'::regclass
        """))
        assert resultado.scalar_one() == 1
    await engine.dispose()


def _archivo_reproceso(ruta, archivo_id=7, mes=7, anio=2026):
    return SimpleNamespace(
        id=archivo_id, ruta_almacenamiento=str(ruta), tipo_archivo="xlsx",
        subcategoria="REPROCESO SEGURO", mes_fact=mes, año_fact=anio,
        estado="Procesado", error_log=None,
    )


@pytest.mark.asyncio
async def test_reproceso_generico_confirma_resultado_valido(tmp_path):
    from app.api.novedades_nomina.nomina_router import procesar_archivo

    ruta = tmp_path / "nomina.xlsx"
    ruta.write_bytes(b"contenido")
    archivo = _archivo_reproceso(ruta)
    session = AsyncMock()
    session.add = MagicMock()
    session.get.return_value = archivo
    with (
        patch(
            "app.api.novedades_nomina.nomina_router.ejecutar_extractor_generico_seguro",
            new=AsyncMock(return_value=[{"cedula": "1"}]),
        ),
        patch(
            "app.api.novedades_nomina.nomina_router.NominaProcessor.normalize_record",
            new=AsyncMock(return_value=SimpleNamespace()),
        ),
    ):
        resultado = await procesar_archivo(7, session=session, db_erp=None)

    assert resultado["archivo_id"] == 7
    assert archivo.estado == "Procesado"
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_reproceso_generico_revierte_si_falla_despues_del_delete(tmp_path):
    from app.api.novedades_nomina.nomina_router import procesar_archivo

    ruta = tmp_path / "nomina.xlsx"
    ruta.write_bytes(b"contenido")
    archivo = _archivo_reproceso(ruta, archivo_id=8)
    session = AsyncMock()
    session.add = MagicMock()
    session.get.return_value = archivo
    with (
        patch(
            "app.api.novedades_nomina.nomina_router.ejecutar_extractor_generico_seguro",
            new=AsyncMock(return_value=[{"cedula": "1"}]),
        ),
        patch(
            "app.api.novedades_nomina.nomina_router.NominaProcessor.normalize_record",
            new=AsyncMock(side_effect=RuntimeError("PII 123456")),
        ),
        pytest.raises(Exception),
    ):
        await procesar_archivo(8, session=session, db_erp=None)

    assert session.rollback.await_count >= 1
    assert archivo.estado == "Error"
    assert "123456" not in str(archivo.error_log)


@pytest.mark.asyncio
async def test_reproceso_generico_serializa_dos_sesiones_postgresql(tmp_path):
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from sqlmodel import delete, select
    from app.api.novedades_nomina.nomina_router import procesar_archivo

    engine = create_async_engine(config.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    ruta = tmp_path / "concurrente.xlsx"
    ruta.write_bytes(b"contenido")
    hash_archivo, archivo_id = "f" * 64, None
    mes, anio = 8, 2095
    try:
        async with factory() as setup:
            for tabla in ("nomina_registros_crudos", "nomina_registros_normalizados"):
                await setup.execute(text(
                    f"DELETE FROM {tabla} WHERE archivo_id IN ("
                    "SELECT id FROM nomina_archivos WHERE hash_archivo = :hash)"
                ), {"hash": hash_archivo})
            await setup.execute(delete(NominaArchivo).where(
                NominaArchivo.hash_archivo == hash_archivo
            ))
            archivo = NominaArchivo(
                nombre_archivo="concurrente.xlsx", hash_archivo=hash_archivo,
                tamaño_bytes=9, tipo_archivo="xlsx", ruta_almacenamiento=str(ruta),
                mes_fact=mes, año_fact=anio, categoria="PRUEBA",
                subcategoria="REPROCESO CONCURRENTE", estado="Procesado",
            )
            setup.add(archivo)
            await setup.commit()
            await setup.refresh(archivo)
            archivo_id = archivo.id

        async def normalizar(_self, _raw, archivo, fila):
            return NominaRegistroNormalizado(
                archivo_id=archivo.id, mes_fact=mes, año_fact=anio, cedula="1",
                nombre_asociado="PRUEBA", valor=10, empresa="PRUEBA",
                concepto="PRUEBA", categoria_final="PRUEBA",
                subcategoria_final="REPROCESO CONCURRENTE",
                estado_validacion="OK", fila_origen=fila,
            )

        with (
            patch(
                "app.api.novedades_nomina.nomina_router.ejecutar_extractor_generico_seguro",
                new=AsyncMock(return_value=[{"cedula": "1"}]),
            ),
            patch(
                "app.api.novedades_nomina.nomina_router.NominaProcessor.normalize_record",
                new=normalizar,
            ),
        ):
            async with factory() as primera, factory() as segunda:
                await asyncio.gather(
                    procesar_archivo(archivo_id, session=primera, db_erp=None),
                    procesar_archivo(archivo_id, session=segunda, db_erp=None),
                )
        async with factory() as check:
            registros = (await check.execute(select(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.archivo_id == archivo_id
            ))).scalars().all()
            assert len(registros) == 1
    finally:
        if archivo_id is not None:
            async with factory() as cleanup:
                await cleanup.execute(delete(NominaRegistroCrudo).where(
                    NominaRegistroCrudo.archivo_id == archivo_id
                ))
                await cleanup.execute(delete(NominaRegistroNormalizado).where(
                    NominaRegistroNormalizado.archivo_id == archivo_id
                ))
                await cleanup.execute(delete(NominaArchivo).where(
                    NominaArchivo.id == archivo_id
                ))
                await cleanup.commit()
        await engine.dispose()


@pytest.mark.asyncio
async def test_migracion_consolida_duplicados_y_preserva_referencias():
    from app.core.migrations.nomina_archivos_migration import asegurar_identidad_archivo_nomina

    engine = create_async_engine(config.database_url, poolclass=NullPool)
    hash_archivo, ids = "e" * 64, []
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE nomina_archivos DROP CONSTRAINT IF EXISTS "
            "uq_nomina_archivo_identidad_periodo"
        ))
        for indice in (1, 2):
            resultado = await conn.execute(text("""
                INSERT INTO nomina_archivos (
                    nombre_archivo, hash_archivo, tamaño_bytes, tipo_archivo,
                    ruta_almacenamiento, mes_fact, año_fact, categoria,
                    subcategoria, estado
                ) VALUES (:nombre, :hash, 10, 'xlsx', :ruta, 6, 2094,
                    'PRUEBA', 'MIGRACION DUPLICADOS', 'Procesado') RETURNING id
            """), {"nombre": f"duplicado-{indice}.xlsx", "hash": hash_archivo,
                    "ruta": f"uploads/nomina/duplicado-{indice}.xlsx"})
            ids.append(resultado.scalar_one())
        await conn.execute(text("""
            INSERT INTO nomina_registros_crudos (archivo_id, fila_origen, payload)
            VALUES (:id, 1, CAST('{"dato": 1}' AS JSON))
        """), {"id": ids[0]})
        await conn.execute(text("""
            INSERT INTO nomina_registros_normalizados (
                archivo_id, fecha_creacion, mes_fact, año_fact, cedula, valor,
                valor_rdc, valor_colaborador, empresa, concepto, categoria_final,
                subcategoria_final, estado_validacion, horas, dias, fila_origen
            ) VALUES (:id, NOW(), 6, 2094, '1', 10, 0, 0, 'PRUEBA',
                'PRUEBA', 'PRUEBA', 'MIGRACION DUPLICADOS', 'OK', 0, 0, 1)
        """), {"id": ids[0]})
    try:
        async with engine.begin() as conn:
            await asegurar_identidad_archivo_nomina(conn)
        async with engine.connect() as check:
            metadata = (await check.execute(text("""
                SELECT id FROM nomina_archivos WHERE hash_archivo = :hash
                AND subcategoria = 'MIGRACION DUPLICADOS'
                AND mes_fact = 6 AND año_fact = 2094
            """), {"hash": hash_archivo})).scalars().all()
            assert metadata == [max(ids)]
            for tabla in ("nomina_registros_crudos", "nomina_registros_normalizados"):
                referencia = await check.execute(text(
                    f"SELECT archivo_id FROM {tabla} WHERE archivo_id = :id"
                ), {"id": max(ids)})
                assert referencia.scalar_one() == max(ids)
    finally:
        async with engine.begin() as cleanup:
            for tabla in ("nomina_registros_crudos", "nomina_registros_normalizados"):
                await cleanup.execute(text(
                    f"DELETE FROM {tabla} WHERE archivo_id = ANY(:ids)"
                ), {"ids": ids})
            await cleanup.execute(text(
                "DELETE FROM nomina_archivos WHERE id = ANY(:ids)"
            ), {"ids": ids})
        await engine.dispose()
