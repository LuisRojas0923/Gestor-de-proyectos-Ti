"""TDD de persistencia PostgreSQL para Bitacoras Operacionales."""
import asyncio
from datetime import date, timedelta
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
from urllib.parse import urlparse
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool


ROOT = Path(__file__).resolve().parents[2]


def test_modelos_declaran_tres_tablas_y_claves_postgresql():
    from app.models.bitacoras_operacionales.modelos import (
        BitacoraOperacional,
        BitacoraOperacionalActividad,
        BitacoraOperacionalFotografia,
    )

    assert BitacoraOperacional.__tablename__ == "bitacoras_operacionales"
    assert BitacoraOperacionalActividad.__tablename__ == "bitacora_operacional_actividades"
    assert BitacoraOperacionalFotografia.__tablename__ == "bitacora_operacional_fotografias"
    assert str(BitacoraOperacional.__table__.c.id.type) == "UUID"
    assert str(BitacoraOperacional.__table__.c.creado_en.type) == "DATETIME"
    assert BitacoraOperacional.__table__.c.orden_trabajo.type.length == 50
    assert BitacoraOperacional.__table__.c.creado_por_id.foreign_keys


def test_modelo_no_impone_unicidad_por_ot_y_fecha():
    from app.models.bitacoras_operacionales.modelos import BitacoraOperacional

    columnas_unicas = {
        tuple(columna.name for columna in constraint.columns)
        for constraint in BitacoraOperacional.__table__.constraints
        if constraint.__class__.__name__ == "UniqueConstraint"
    }
    assert ("orden_trabajo", "fecha_elaboracion") not in columnas_unicas


def test_schema_creacion_rechaza_campos_controlados_por_servidor():
    from app.models.bitacoras_operacionales.schemas import BitacoraOperacionalCrear

    with pytest.raises(ValidationError):
        BitacoraOperacionalCrear(
            orden_trabajo="OT-1",
            fecha_elaboracion=date.today(),
            nombre_obra="No confiable",
        )


def test_schema_creacion_rechaza_fecha_futura_y_ot_vacia():
    from app.models.bitacoras_operacionales.schemas import BitacoraOperacionalCrear

    with pytest.raises(ValidationError):
        BitacoraOperacionalCrear(
            orden_trabajo="OT-1",
            fecha_elaboracion=date.today() + timedelta(days=1),
        )
    with pytest.raises(ValidationError):
        BitacoraOperacionalCrear(
            orden_trabajo="   ",
            fecha_elaboracion=date.today(),
        )


def test_schema_patch_es_estricto_y_valida_novedad():
    from app.models.bitacoras_operacionales.schemas import BitacoraOperacionalActualizar

    with pytest.raises(ValidationError):
        BitacoraOperacionalActualizar(
            version_esperada=1,
            sin_novedad=True,
            novedades_dia="Texto incompatible",
        )
    with pytest.raises(ValidationError):
        BitacoraOperacionalActualizar(
            version_esperada=1,
            estado="FINALIZADA",
        )


class ConexionDDL:
    def __init__(self):
        self.sentencias = []

    async def execute(self, statement, *_args, **_kwargs):
        self.sentencias.append(str(statement))
        return SimpleNamespace()


@pytest.mark.asyncio
async def test_migracion_declara_objetos_criticos_y_es_repetible():
    from app.core.migrations.bitacoras_operacionales_migration import (
        migrar_bitacoras_operacionales,
    )

    conexion = ConexionDDL()
    await migrar_bitacoras_operacionales(conexion)
    cantidad_primera = len(conexion.sentencias)
    await migrar_bitacoras_operacionales(conexion)

    ddl = "\n".join(conexion.sentencias).lower()
    assert len(conexion.sentencias) == cantidad_primera * 2
    assert "create table if not exists public.bitacoras_operacionales" in ddl
    assert "create table if not exists public.bitacora_operacional_actividades" in ddl
    assert "create table if not exists public.bitacora_operacional_fotografias" in ddl
    assert "idx_bitacoras_propietario_fecha" in ddl
    assert "idx_bitacoras_ot_fecha" in ddl
    assert "idx_bitacoras_estado_fecha" in ddl
    assert "deferrable initially deferred" in ddl
    assert "proteger_bitacora_operacional_inmutable" in ddl
    assert "validar_bitacora_operacional_completa" in ddl
    assert "america/bogota" in ddl
    assert "unique (orden_trabajo, fecha_elaboracion)" not in ddl


def test_migracion_esta_registrada_y_propaga_fallos():
    manager = (
        ROOT / "backend_v2" / "app" / "core" / "migrations" / "manager.py"
    ).read_text(encoding="utf-8")

    assert "migrar_bitacoras_operacionales" in manager
    assert "await migrar_bitacoras_operacionales(conn)" in manager


def test_registry_carga_modelos_de_bitacoras():
    from app.models.registry import MODEL_MODULES

    assert "app.models.bitacoras_operacionales.modelos" in MODEL_MODULES


def test_verificador_declara_constraints_triggers_e_indices_criticos():
    from app.core.migrations import schema_verifier

    assert "ck_bitacora_estado_artefactos" in schema_verifier.CONSTRAINTS_REQUERIDOS
    assert "uq_bitacora_actividad_orden" in schema_verifier.CONSTRAINTS_REQUERIDOS
    assert "uq_bitacora_fotografia_orden" in schema_verifier.CONSTRAINTS_REQUERIDOS
    assert "trg_bitacora_operacional_inmutable" in schema_verifier.TRIGGERS_REQUERIDOS
    assert "trg_bitacora_actividad_inmutable" in schema_verifier.TRIGGERS_REQUERIDOS
    assert "trg_bitacora_fotografia_inmutable" in schema_verifier.TRIGGERS_REQUERIDOS
    assert schema_verifier.INDICES_BITACORAS_REQUERIDOS == {
        "idx_bitacoras_propietario_fecha": (
            "bitacoras_operacionales",
            ["creado_por_id", "fecha_elaboracion"],
        ),
        "idx_bitacoras_ot_fecha": (
            "bitacoras_operacionales",
            ["orden_trabajo", "fecha_elaboracion"],
        ),
        "idx_bitacoras_estado_fecha": (
            "bitacoras_operacionales",
            ["estado", "fecha_elaboracion"],
        ),
    }


def test_verificador_rechaza_funcion_de_inmutabilidad_alterada():
    from app.core.migrations.bitacoras_operacionales_migration import (
        BITACORA_FUNCTIONS,
    )
    from app.core.migrations.schema_verifier import _validar_funciones_bitacora

    funciones = {
        nombre: {
            "argumentos": "",
            "retorno": "trigger",
            "cuerpo": cuerpo,
            "lenguaje": "plpgsql",
            "owner": "gestor_schema_owner",
            "security_definer": False,
            "grantees_execute": ["gestor_schema_owner"],
        }
        for nombre, cuerpo in BITACORA_FUNCTIONS.items()
    }
    assert _validar_funciones_bitacora(funciones, "gestor_schema_owner") is True

    funciones["proteger_bitacora_operacional_inmutable"]["cuerpo"] = "BEGIN RETURN NEW; END;"
    assert _validar_funciones_bitacora(funciones, "gestor_schema_owner") is False


@pytest.mark.asyncio
async def test_migracion_no_silencia_error_ddl():
    from app.core.migrations.bitacoras_operacionales_migration import (
        migrar_bitacoras_operacionales,
    )

    conexion = SimpleNamespace(execute=AsyncMock(side_effect=RuntimeError("ddl")))

    with pytest.raises(RuntimeError, match="ddl"):
        await migrar_bitacoras_operacionales(conexion)


def _requiere_postgres_aislado():
    base = urlparse(os.getenv("DATABASE_URL", ""))
    if base.hostname != "db-test" or base.path.rstrip("/") != "/project_manager_test":
        pytest.skip("Requiere db-test/project_manager_test de docker-compose.tests.yml")


async def _usuario_existente(db_session) -> str:
    usuario_id = await db_session.scalar(text("SELECT id FROM usuarios LIMIT 1"))
    assert usuario_id
    return str(usuario_id)


@pytest.mark.asyncio
async def test_postgres_finaliza_documento_completo_y_bloquea_hijos(db_session):
    _requiere_postgres_aislado()
    usuario_id = await _usuario_existente(db_session)
    bitacora_id = uuid4()
    foto_id = uuid4()
    await db_session.execute(text("""
        INSERT INTO bitacoras_operacionales (
            id, fecha_elaboracion, orden_trabajo, nombre_obra, ciudad,
            ingeniero_responsable, creado_por_id, codigo_formato,
            fecha_formato, version_formato, novedades_dia
        ) VALUES (
            :id, CURRENT_DATE, 'OT-001', 'Obra prueba', 'Bogota',
            'Director prueba', :usuario, 'FT-OPE-49', DATE '2022-04-06',
            '01', 'Sin inconvenientes'
        )
    """), {"id": bitacora_id, "usuario": usuario_id})
    await db_session.execute(text("""
        INSERT INTO bitacora_operacional_actividades
            (bitacora_id, orden, descripcion)
        VALUES (:id, 1, 'Actividad segura')
    """), {"id": bitacora_id})
    await db_session.execute(text("""
        INSERT INTO bitacora_operacional_fotografias (
            id, bitacora_id, orden, ruta_relativa, nombre_original,
            tipo_mime, tamano_bytes, ancho, alto, hash_sha256
        ) VALUES (
            :foto, :id, 1, 'bitacoras/foto.jpg', 'foto.jpg',
            'image/jpeg', 100, 10, 10, :hash
        )
    """), {"foto": foto_id, "id": bitacora_id, "hash": "a" * 64})
    await db_session.execute(text("""
        UPDATE bitacoras_operacionales SET
            estado='FINALIZADA', finalizado_por_id=:usuario,
            firma_ruta='firma.png', firma_hash=:firma_hash,
            pdf_ruta='bitacora.pdf', pdf_hash=:pdf_hash,
            nombre_firmante='Usuario prueba', version_constancia='1',
            finalizado_en=now()
        WHERE id=:id
    """), {
        "id": bitacora_id,
        "usuario": usuario_id,
        "firma_hash": "b" * 64,
        "pdf_hash": "c" * 64,
    })
    await db_session.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))

    savepoint = await db_session.begin_nested()
    with pytest.raises(DBAPIError, match="inmutables"):
        await db_session.execute(text("""
            UPDATE bitacora_operacional_actividades
            SET descripcion='Alterada' WHERE bitacora_id=:id
        """), {"id": bitacora_id})
    await savepoint.rollback()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_postgres_rechaza_finalizacion_incompleta(db_session):
    _requiere_postgres_aislado()
    usuario_id = await _usuario_existente(db_session)
    bitacora_id = uuid4()
    await db_session.execute(text("""
        INSERT INTO bitacoras_operacionales (
            id, fecha_elaboracion, orden_trabajo, nombre_obra, ciudad,
            ingeniero_responsable, creado_por_id, codigo_formato,
            fecha_formato, version_formato, sin_novedad
        ) VALUES (
            :id, CURRENT_DATE, 'OT-002', 'Obra incompleta', 'Bogota',
            'Director prueba', :usuario, 'FT-OPE-49', DATE '2022-04-06',
            '01', TRUE
        )
    """), {"id": bitacora_id, "usuario": usuario_id})
    await db_session.execute(text("""
        UPDATE bitacoras_operacionales SET
            estado='FINALIZADA', finalizado_por_id=:usuario,
            firma_ruta='firma.png', firma_hash=:firma_hash,
            pdf_ruta='bitacora.pdf', pdf_hash=:pdf_hash,
            nombre_firmante='Usuario prueba', version_constancia='1',
            finalizado_en=now()
        WHERE id=:id
    """), {
        "id": bitacora_id,
        "usuario": usuario_id,
        "firma_hash": "b" * 64,
        "pdf_hash": "c" * 64,
    })

    with pytest.raises(DBAPIError, match="requiere una actividad"):
        await db_session.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
    await db_session.rollback()


@pytest.mark.asyncio
async def test_postgres_rechaza_fecha_futura_bogota(db_session):
    _requiere_postgres_aislado()
    usuario_id = await _usuario_existente(db_session)
    with pytest.raises(DBAPIError, match="no puede ser futura"):
        await db_session.execute(text("""
            INSERT INTO bitacoras_operacionales (
                id, fecha_elaboracion, orden_trabajo, nombre_obra, ciudad,
                ingeniero_responsable, creado_por_id, codigo_formato,
                fecha_formato, version_formato
            ) VALUES (
                :id, CURRENT_DATE + 1, 'OT-003', 'Obra futura', 'Bogota',
                'Director prueba', :usuario, 'FT-OPE-49', DATE '2022-04-06', '01'
            )
        """), {"id": uuid4(), "usuario": usuario_id})
    await db_session.rollback()


def test_migracion_blinda_propiedad_concurrencia_y_acl():
    from app.core.migrations.bitacoras_operacionales_migration import (
        BITACORA_CHILD_IMMUTABLE_BODY,
        BITACORA_PARENT_IMMUTABLE_BODY,
    )

    assert "FOR UPDATE" in BITACORA_CHILD_IMMUTABLE_BODY
    assert "creado_por_id IS DISTINCT FROM" in BITACORA_PARENT_IMMUTABLE_BODY
    migration_source = (
        ROOT / "backend_v2/app/core/migrations/bitacoras_operacionales_migration.py"
    ).read_text(encoding="utf-8")
    assert "btrim(firma_ruta) <> ''" in migration_source
    source = (ROOT / "backend_v2/app/core/migrations/manager.py").read_text(
        encoding="utf-8"
    )
    assert "REVOKE ALL ON public.bitacoras_operacionales" in source
    assert "REVOKE ALL ON SEQUENCE public.bitacora_operacional_actividades_id_seq" in source


def _runtime_engine():
    url = os.environ["DATABASE_URL"].replace(
        "postgresql://", "postgresql+asyncpg://", 1
    )
    return create_async_engine(url, poolclass=NullPool)


async def _crear_bitacora_completa(conn, usuario_id: str, orden: str):
    bitacora_id = uuid4()
    foto_id = uuid4()
    await conn.execute(text("""
        INSERT INTO bitacoras_operacionales (
            id, fecha_elaboracion, orden_trabajo, nombre_obra, ciudad,
            ingeniero_responsable, creado_por_id, codigo_formato,
            fecha_formato, version_formato, novedades_dia
        ) VALUES (
            :id, CURRENT_DATE, :orden, 'Obra concurrencia', 'Bogota',
            'Director prueba', :usuario, 'FT-OPE-49', DATE '2022-04-06',
            '01', 'Sin inconvenientes'
        )
    """), {"id": bitacora_id, "orden": orden, "usuario": usuario_id})
    await conn.execute(text("""
        INSERT INTO bitacora_operacional_actividades
            (bitacora_id, orden, descripcion)
        VALUES (:id, 1, 'Actividad inicial')
    """), {"id": bitacora_id})
    await conn.execute(text("""
        INSERT INTO bitacora_operacional_fotografias (
            id, bitacora_id, orden, ruta_relativa, nombre_original,
            tipo_mime, tamano_bytes, ancho, alto, hash_sha256
        ) VALUES (
            :foto, :id, 1, :ruta, 'foto.jpg', 'image/jpeg',
            100, 20, 20, :hash
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
            firma_ruta = 'firma.png', firma_hash = :firma_hash,
            pdf_ruta = 'bitacora.pdf', pdf_hash = :pdf_hash,
            nombre_firmante = 'Coordinador prueba', version_constancia = '1',
            finalizado_en = now()
        WHERE id = :id
    """), {
        "id": bitacora_id,
        "usuario": usuario_id,
        "firma_hash": "b" * 64,
        "pdf_hash": "c" * 64,
    })


@pytest.mark.asyncio
async def test_postgres_serializa_finalizacion_antes_de_insert_hijo(db_session):
    _requiere_postgres_aislado()
    usuario_id = await _usuario_existente(db_session)
    bitacora_id, _ = await _crear_bitacora_completa(
        db_session, usuario_id, f"OT-C-{uuid4()}"
    )
    await db_session.commit()
    engine = _runtime_engine()
    try:
        async with engine.connect() as finalizador:
            transaccion = await finalizador.begin()
            await _finalizar(finalizador, bitacora_id, usuario_id)

            async def insertar_concurrente():
                async with engine.begin() as mutador:
                    await mutador.execute(text("""
                        INSERT INTO bitacora_operacional_actividades
                            (bitacora_id, orden, descripcion)
                        VALUES (:id, 2, 'Actividad tardia')
                    """), {"id": bitacora_id})

            tarea = asyncio.create_task(insertar_concurrente())
            await asyncio.sleep(0.1)
            assert not tarea.done()
            await transaccion.commit()
            with pytest.raises(DBAPIError, match="finalizada"):
                await tarea
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_postgres_mutacion_hijo_antes_impide_finalizacion(db_session):
    _requiere_postgres_aislado()
    usuario_id = await _usuario_existente(db_session)
    bitacora_id, foto_id = await _crear_bitacora_completa(
        db_session, usuario_id, f"OT-C-{uuid4()}"
    )
    await db_session.commit()
    engine = _runtime_engine()
    try:
        async with engine.connect() as mutador:
            transaccion = await mutador.begin()
            await mutador.execute(
                text("DELETE FROM bitacora_operacional_fotografias WHERE id = :id"),
                {"id": foto_id},
            )

            async def finalizar_concurrente():
                async with engine.begin() as finalizador:
                    await _finalizar(finalizador, bitacora_id, usuario_id)

            tarea = asyncio.create_task(finalizar_concurrente())
            await asyncio.sleep(0.1)
            assert not tarea.done()
            await transaccion.commit()
            with pytest.raises(DBAPIError, match="requiere una fotografia"):
                await tarea
        estado = await db_session.scalar(
            text("SELECT estado FROM bitacoras_operacionales WHERE id = :id"),
            {"id": bitacora_id},
        )
        assert estado == "BORRADOR"
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_postgres_rechaza_metadatos_finales_vacios(db_session):
    _requiere_postgres_aislado()
    usuario_id = await _usuario_existente(db_session)
    bitacora_id, _ = await _crear_bitacora_completa(
        db_session, usuario_id, f"OT-P-{uuid4()}"
    )
    await db_session.commit()

    with pytest.raises(DBAPIError):
        await db_session.execute(text("""
            UPDATE bitacoras_operacionales SET
                estado = 'FINALIZADA', finalizado_por_id = :usuario,
                firma_ruta = ' ', firma_hash = :firma_hash,
                pdf_ruta = '', pdf_hash = :pdf_hash,
                nombre_firmante = ' ', version_constancia = '',
                finalizado_en = now()
            WHERE id = :id
        """), {
            "id": bitacora_id,
            "usuario": usuario_id,
            "firma_hash": "b" * 64,
            "pdf_hash": "c" * 64,
        })
        await db_session.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
    await db_session.rollback()
