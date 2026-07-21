"""Integridad avanzada de Bitacoras Operacionales sobre PostgreSQL aislado."""
import os
from urllib.parse import urlparse
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool


def _requiere_postgres_aislado():
    for variable in ("DATABASE_URL", "MIGRATION_DATABASE_URL"):
        base = urlparse(os.getenv(variable, ""))
        if base.hostname != "db-test" or base.path.rstrip("/") != "/project_manager_test":
            pytest.skip(
                f"{variable} requiere db-test/project_manager_test de docker-compose.tests.yml"
            )


def _async_url(url: str) -> str:
    return url.replace("postgresql://", "postgresql+asyncpg://", 1)


def _runtime_engine():
    return create_async_engine(
        _async_url(os.environ["DATABASE_URL"]), poolclass=NullPool
    )


def _owner_engine():
    return create_async_engine(
        _async_url(os.environ["MIGRATION_DATABASE_URL"]),
        poolclass=NullPool,
        connect_args={
            "server_settings": {
                "role": os.environ["MIGRATION_SCHEMA_OWNER_ROLE"],
                "search_path": "public,pg_catalog",
            }
        },
    )


async def _usuarios(conn):
    ids = (await conn.execute(
        text("SELECT id FROM usuarios ORDER BY id LIMIT 2")
    )).scalars().all()
    assert len(ids) == 2
    return [str(valor) for valor in ids]


async def _asegurar_usuario_secundario():
    owner = _owner_engine()
    try:
        async with owner.begin() as conn:
            await conn.execute(text("""
                INSERT INTO usuarios (
                    id, cedula, nombre, hash_contrasena, rol, esta_activo,
                    zona_horaria, correo_actualizado, correo_verificado, viaticante
                ) VALUES (
                    'USR-BITACORA-TEST', 'bitacora-test', 'Usuario Bitacora',
                    'hash-test', 'usuario', TRUE, 'America/Bogota', FALSE, FALSE, FALSE
                ) ON CONFLICT (id) DO NOTHING
            """))
    finally:
        await owner.dispose()


async def _crear_completa(conn, usuario_id: str):
    bitacora_id = uuid4()
    foto_id = uuid4()
    await conn.execute(text("""
        INSERT INTO bitacoras_operacionales (
            id, fecha_elaboracion, orden_trabajo, nombre_obra, ciudad,
            ingeniero_responsable, creado_por_id, codigo_formato,
            fecha_formato, version_formato, sin_novedad
        ) VALUES (
            :id, CURRENT_DATE, :ot, 'Obra prueba', 'Bogota', 'Director prueba',
            :usuario, 'FT-OPE-49', DATE '2022-04-06', '01', TRUE
        )
    """), {"id": bitacora_id, "ot": f"OT-{uuid4()}", "usuario": usuario_id})
    await conn.execute(text("""
        INSERT INTO bitacora_operacional_actividades
            (bitacora_id, orden, descripcion)
        VALUES (:id, 1, 'Actividad')
    """), {"id": bitacora_id})
    await conn.execute(text("""
        INSERT INTO bitacora_operacional_fotografias (
            id, bitacora_id, orden, ruta_relativa, nombre_original,
            tipo_mime, tamano_bytes, ancho, alto, hash_sha256
        ) VALUES (
            :foto, :id, 1, :ruta, 'foto.jpg', 'image/jpeg',
            100, 10, 10, :hash
        )
    """), {
        "foto": foto_id,
        "id": bitacora_id,
        "ruta": f"bitacoras/{bitacora_id}/foto.jpg",
        "hash": "a" * 64,
    })
    return bitacora_id, foto_id


async def _finalizar(conn, bitacora_id, usuario_id):
    await conn.execute(text("""
        UPDATE bitacoras_operacionales SET
            estado = 'FINALIZADA', finalizado_por_id = :usuario,
            firma_ruta = 'firma.png', firma_hash = :firma,
            pdf_ruta = 'bitacora.pdf', pdf_hash = :pdf,
            nombre_firmante = 'Coordinador', version_constancia = '1',
            finalizado_en = now()
        WHERE id = :id
    """), {
        "id": bitacora_id,
        "usuario": usuario_id,
        "firma": "b" * 64,
        "pdf": "c" * 64,
    })


@pytest.mark.asyncio
async def test_migracion_real_doble_repara_default_y_fk():
    _requiere_postgres_aislado()
    from app.core.migrations.bitacoras_operacionales_migration import (
        migrar_bitacoras_operacionales,
    )
    from app.core.migrations.schema_verifier import verificar_esquema_runtime

    owner = _owner_engine()
    runtime = _runtime_engine()
    try:
        for _ in range(2):
            async with owner.begin() as conn:
                await migrar_bitacoras_operacionales(conn)
        await verificar_esquema_runtime(runtime)

        alteraciones = (
            "ALTER TABLE bitacoras_operacionales ALTER COLUMN version DROP DEFAULT",
            "ALTER TABLE bitacoras_operacionales DROP CONSTRAINT fk_bitacora_creador",
        )
        for alteracion in alteraciones:
            async with owner.begin() as conn:
                await conn.execute(text(alteracion))
            with pytest.raises(RuntimeError, match="Esquema incompleto"):
                await verificar_esquema_runtime(runtime)
            async with owner.begin() as conn:
                await migrar_bitacoras_operacionales(conn)
            await verificar_esquema_runtime(runtime)
    finally:
        await owner.dispose()
        await runtime.dispose()


@pytest.mark.asyncio
async def test_privilegios_bitacoras_se_reparan_y_verifican():
    _requiere_postgres_aislado()
    from app.core.migrations.manager import aplicar_privilegios_runtime
    from app.core.migrations.schema_verifier import verificar_esquema_runtime

    owner = _owner_engine()
    runtime = _runtime_engine()
    runtime_role = os.environ["DATABASE_RUNTIME_ROLE"]
    try:
        async with owner.begin() as conn:
            await conn.execute(text(
                f"GRANT TRUNCATE ON bitacoras_operacionales TO {runtime_role}"
            ))
            await conn.execute(text(
                "GRANT SELECT ON bitacora_operacional_fotografias TO PUBLIC"
            ))
            await conn.execute(text(
                f"GRANT UPDATE ON SEQUENCE bitacora_operacional_actividades_id_seq TO {runtime_role}"
            ))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime)

        sesiones = async_sessionmaker(owner, expire_on_commit=False)
        async with sesiones() as session:
            await aplicar_privilegios_runtime(session)
        await verificar_esquema_runtime(runtime)
    finally:
        await owner.dispose()
        await runtime.dispose()


@pytest.mark.asyncio
async def test_defaults_y_finalizacion_requieren_foto_y_actor_propietario():
    _requiere_postgres_aislado()
    await _asegurar_usuario_secundario()
    engine = _runtime_engine()
    try:
        async with engine.begin() as conn:
            usuarios = await _usuarios(conn)
            row = (await conn.execute(text("""
                INSERT INTO bitacoras_operacionales (
                    fecha_elaboracion, orden_trabajo, nombre_obra, ciudad,
                    ingeniero_responsable, creado_por_id, codigo_formato,
                    fecha_formato, version_formato, sin_novedad
                ) VALUES (
                    CURRENT_DATE, :ot, 'Obra defaults', 'Bogota', 'Director',
                    :usuario, 'FT-OPE-49', DATE '2022-04-06', '01', TRUE
                ) RETURNING id, estado, version, sin_novedad
            """), {"ot": f"OT-{uuid4()}", "usuario": usuarios[0]})).one()
            assert tuple(row)[1:] == ("BORRADOR", 1, True)
            bitacora_id = row[0]
            await conn.execute(text("""
                INSERT INTO bitacora_operacional_actividades
                    (bitacora_id, orden, descripcion)
                VALUES (:id, 1, 'Actividad')
            """), {"id": bitacora_id})

        with pytest.raises(DBAPIError, match="propietario"):
            async with engine.begin() as conn:
                await conn.execute(text("""
                    UPDATE bitacoras_operacionales
                    SET creado_por_id = :otro WHERE id = :id
                """), {"otro": usuarios[1], "id": bitacora_id})

        with pytest.raises(DBAPIError, match="requiere una fotografia"):
            async with engine.begin() as conn:
                await _finalizar(conn, bitacora_id, usuarios[0])

        async with engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO bitacora_operacional_fotografias (
                    bitacora_id, orden, ruta_relativa, nombre_original,
                    tipo_mime, tamano_bytes, ancho, alto, hash_sha256
                ) VALUES (:id, 1, :ruta, 'foto.jpg', 'image/jpeg', 1, 1, 1, :hash)
            """), {
                "id": bitacora_id,
                "ruta": f"bitacoras/{bitacora_id}/foto.jpg",
                "hash": "a" * 64,
            })
        with pytest.raises(DBAPIError):
            async with engine.begin() as conn:
                await _finalizar(conn, bitacora_id, usuarios[1])
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_documento_finalizado_bloquea_padre_y_todas_las_mutaciones_hijas():
    _requiere_postgres_aislado()
    await _asegurar_usuario_secundario()
    engine = _runtime_engine()
    try:
        async with engine.begin() as conn:
            usuario = (await _usuarios(conn))[0]
            bitacora_id, foto_id = await _crear_completa(conn, usuario)
            await _finalizar(conn, bitacora_id, usuario)

        operaciones = (
            ("UPDATE bitacoras_operacionales SET ciudad = 'Cali' WHERE id = :id", {"id": bitacora_id}),
            ("DELETE FROM bitacoras_operacionales WHERE id = :id", {"id": bitacora_id}),
            ("INSERT INTO bitacora_operacional_actividades (bitacora_id, orden, descripcion) VALUES (:id, 2, 'Otra')", {"id": bitacora_id}),
            ("UPDATE bitacora_operacional_actividades SET descripcion = 'Otra' WHERE bitacora_id = :id", {"id": bitacora_id}),
            ("DELETE FROM bitacora_operacional_actividades WHERE bitacora_id = :id", {"id": bitacora_id}),
            ("INSERT INTO bitacora_operacional_fotografias (id, bitacora_id, orden, ruta_relativa, nombre_original, tipo_mime, tamano_bytes, ancho, alto, hash_sha256) VALUES (:foto, :id, 2, :ruta, 'otra.jpg', 'image/jpeg', 1, 1, 1, :hash)", {"foto": uuid4(), "id": bitacora_id, "ruta": f"bitacoras/{bitacora_id}/otra.jpg", "hash": "d" * 64}),
            ("UPDATE bitacora_operacional_fotografias SET ancho = 20 WHERE id = :foto", {"foto": foto_id}),
            ("DELETE FROM bitacora_operacional_fotografias WHERE id = :foto", {"foto": foto_id}),
        )
        for sentencia, parametros in operaciones:
            with pytest.raises(DBAPIError, match="inmutable|finalizada|eliminan"):
                async with engine.begin() as conn:
                    await conn.execute(text(sentencia), parametros)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_verificador_falla_cerrado_y_migracion_repara_objetos_criticos():
    _requiere_postgres_aislado()
    from app.core.migrations.bitacoras_operacionales_migration import (
        migrar_bitacoras_operacionales,
    )
    from app.core.migrations.schema_verifier import verificar_esquema_runtime

    owner = _owner_engine()
    runtime = _runtime_engine()
    try:
        alteraciones_reparables = (
            "ALTER TABLE bitacoras_operacionales DROP CONSTRAINT ck_bitacora_hashes_sha256",
            "DROP INDEX idx_bitacoras_ot_fecha",
            "DROP TRIGGER trg_bitacora_fecha_bogota ON bitacoras_operacionales",
            "CREATE OR REPLACE FUNCTION validar_fecha_bitacora_operacional() "
            "RETURNS trigger AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql",
            "ALTER TABLE bitacoras_operacionales DROP CONSTRAINT ck_bitacora_version_positiva, "
            "ADD CONSTRAINT ck_bitacora_version_positiva "
            "CHECK (version > 0 OR TRUE)",
        )
        for alteracion in alteraciones_reparables:
            async with owner.begin() as conn:
                await conn.execute(text(alteracion))
            with pytest.raises(RuntimeError, match="Esquema incompleto"):
                await verificar_esquema_runtime(runtime)
            async with owner.begin() as conn:
                await migrar_bitacoras_operacionales(conn)
            await verificar_esquema_runtime(runtime)

        drift_columnas = (
            (
                "ALTER TABLE bitacoras_operacionales ALTER COLUMN version TYPE bigint",
                "ALTER TABLE bitacoras_operacionales ALTER COLUMN version TYPE integer USING version::integer",
            ),
            (
                "ALTER TABLE bitacoras_operacionales ALTER COLUMN ciudad DROP NOT NULL",
                "ALTER TABLE bitacoras_operacionales ALTER COLUMN ciudad SET NOT NULL",
            ),
        )
        for corromper, restaurar in drift_columnas:
            async with owner.begin() as conn:
                await conn.execute(text(corromper))
            with pytest.raises(RuntimeError, match="Esquema incompleto"):
                await verificar_esquema_runtime(runtime)
            async with owner.begin() as conn:
                await conn.execute(text(restaurar))
            await verificar_esquema_runtime(runtime)
    finally:
        await owner.dispose()
        await runtime.dispose()


@pytest.mark.asyncio
async def test_constraints_hijos_rechazan_orden_texto_hash_dimensiones_y_ruta():
    _requiere_postgres_aislado()
    await _asegurar_usuario_secundario()
    engine = _runtime_engine()
    try:
        async with engine.begin() as conn:
            usuario = (await _usuarios(conn))[0]
            bitacora_id, _ = await _crear_completa(conn, usuario)
        operaciones = (
            ("INSERT INTO bitacoras_operacionales (fecha_elaboracion, orden_trabajo, nombre_obra, ciudad, ingeniero_responsable, creado_por_id, codigo_formato, fecha_formato, version_formato) VALUES (CURRENT_DATE, :ot, 'Obra', 'Bogota', 'Director', :usuario, ' ', DATE '2022-04-06', '')", {"ot": f"OT-{uuid4()}", "usuario": usuario}),
            ("INSERT INTO bitacora_operacional_actividades (bitacora_id, orden, descripcion) VALUES (:id, 0, 'Invalida')", {"id": bitacora_id}),
            ("INSERT INTO bitacora_operacional_actividades (bitacora_id, orden, descripcion) VALUES (:id, 2, '   ')", {"id": bitacora_id}),
            ("INSERT INTO bitacora_operacional_fotografias (bitacora_id, orden, ruta_relativa, nombre_original, tipo_mime, tamano_bytes, ancho, alto, hash_sha256) VALUES (:id, 2, :ruta, 'x.jpg', 'image/jpeg', 0, 1, 1, :hash)", {"id": bitacora_id, "ruta": f"bitacoras/{uuid4()}/x.jpg", "hash": "a" * 64}),
            ("INSERT INTO bitacora_operacional_fotografias (bitacora_id, orden, ruta_relativa, nombre_original, tipo_mime, tamano_bytes, ancho, alto, hash_sha256) VALUES (:id, 2, :ruta, 'x.jpg', 'image/jpeg', 1, 1, 1, 'invalido')", {"id": bitacora_id, "ruta": f"bitacoras/{uuid4()}/x.jpg"}),
            ("INSERT INTO bitacora_operacional_fotografias (bitacora_id, orden, ruta_relativa, nombre_original, tipo_mime, tamano_bytes, ancho, alto, hash_sha256) SELECT bitacora_id, 2, ruta_relativa, 'otra.jpg', tipo_mime, 1, 1, 1, hash_sha256 FROM bitacora_operacional_fotografias WHERE bitacora_id = :id", {"id": bitacora_id}),
        )
        for sentencia, parametros in operaciones:
            with pytest.raises(DBAPIError):
                async with engine.begin() as conn:
                    await conn.execute(text(sentencia), parametros)
    finally:
        await engine.dispose()
