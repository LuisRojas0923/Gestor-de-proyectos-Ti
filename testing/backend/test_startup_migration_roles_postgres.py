"""Aceptacion PostgreSQL real para roles, migracion y startup verify-only."""
import asyncio
import os
import subprocess
import sys

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app import manage
from app.core.migrations.manager import verificar_esquema_runtime
from app.models.registry import cargar_modelos


MIGRATION_URL = os.getenv("TEST_PHASE1P_MIGRATION_URL", "")
RUNTIME_URL = os.getenv("TEST_PHASE1P_RUNTIME_URL", "")
OWNER_URL = os.getenv("TEST_PHASE1P_OWNER_URL", "")
REDIS_URL = os.getenv("TEST_PHASE1P_REDIS_URL", "")
CAPABILITY = "capacidad-rbac-fase-1p-aleatoria-12345678901234567890"

pytestmark = pytest.mark.skipif(
    not MIGRATION_URL or not RUNTIME_URL or not OWNER_URL or not REDIS_URL,
    reason="Requiere PostgreSQL aislado con roles de Fase 1P",
)


def _async_url(url: str) -> str:
    return url.replace("postgresql://", "postgresql+asyncpg://", 1)


async def _comprobar_fastapi_real(runtime_url: str, admin_hash: str) -> None:
    from testing.backend.phase1p_http_acceptance import comprobar_fastapi_real

    await comprobar_fastapi_real(runtime_url, REDIS_URL, admin_hash)


@pytest.mark.asyncio
async def test_dos_migradores_runtime_minimo_y_reparacion_exclusiva(
    monkeypatch, tmp_path,
):
    secret = tmp_path / "admin-bootstrap"
    secret.write_text("fase-1p-clave-temporal-aleatoria-123456789", encoding="utf-8")
    capability_file = tmp_path / "rbac-capability"
    capability_file.write_text(CAPABILITY, encoding="utf-8")
    monkeypatch.setenv("MIGRATION_DATABASE_URL", MIGRATION_URL)
    monkeypatch.setenv("MIGRATION_DATABASE_ROLE", "gestor_migrador")
    monkeypatch.setenv("MIGRATION_SCHEMA_OWNER_ROLE", "gestor_schema_owner")
    monkeypatch.setenv("DATABASE_RUNTIME_ROLE", "gestor_runtime")
    monkeypatch.setenv("DATABASE_SCHEMA_OWNER_ROLE", "gestor_schema_owner")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD_FILE", str(secret))
    monkeypatch.setenv("ADMIN_BOOTSTRAP_CEDULA", "admin-fase-1p")
    monkeypatch.setenv("RBAC_ADMIN_CAPABILITY_FILE", str(capability_file))

    entorno_migrador = os.environ.copy()
    entorno_migrador.update({
        "ENVIRONMENT": "production",
        "PYTHONPATH": os.path.abspath("backend_v2") + os.pathsep + entorno_migrador.get("PYTHONPATH", ""),
        "MIGRATION_DATABASE_URL": MIGRATION_URL,
        "MIGRATION_DATABASE_ROLE": "gestor_migrador",
        "MIGRATION_SCHEMA_OWNER_ROLE": "gestor_schema_owner",
        "DATABASE_RUNTIME_ROLE": "gestor_runtime",
        "DATABASE_SCHEMA_OWNER_ROLE": "gestor_schema_owner",
        "ADMIN_BOOTSTRAP_PASSWORD_FILE": str(secret),
        "ADMIN_BOOTSTRAP_CEDULA": "admin-fase-1p",
        "RBAC_ADMIN_CAPABILITY_FILE": str(capability_file),
    })
    entorno_migrador.pop("JWT_SECRET_KEY", None)
    comando = subprocess.run(
        [sys.executable, "-c", "import asyncio; from app.manage import ejecutar_migrate; asyncio.run(ejecutar_migrate())"],
        env=entorno_migrador, cwd=tmp_path,
        capture_output=True, text=True, check=False,
    )
    assert comando.returncode == 0, comando.stderr

    await asyncio.gather(manage.ejecutar_migrate(), manage.ejecutar_migrate())
    cargar_modelos()

    runtime_engine = create_async_engine(_async_url(RUNTIME_URL), poolclass=NullPool)
    owner_engine = create_async_engine(
        _async_url(MIGRATION_URL),
        poolclass=NullPool,
        connect_args={"server_settings": {"role": "gestor_schema_owner"}},
    )
    bootstrap_engine = create_async_engine(_async_url(OWNER_URL), poolclass=NullPool)
    try:
        await verificar_esquema_runtime(runtime_engine)
        async with owner_engine.begin() as conn:
            from app.services.auth.servicio import ServicioAuth
            admin_hash = ServicioAuth.obtener_hash_contrasena(
                "fase-1p-clave-temporal-aleatoria-123456789"
            )
            await conn.execute(text("""
                UPDATE public.usuarios
                SET hash_contrasena = :hash, correo = 'fase1p@example.test',
                    correo_actualizado = TRUE, correo_verificado = TRUE,
                    esta_activo = TRUE, rol = 'admin'
                WHERE cedula = 'admin-fase-1p'
            """), {"hash": admin_hash})
            await conn.execute(text("""
                INSERT INTO usuarios (
                    id, cedula, nombre, hash_contrasena, rol, esta_activo,
                    zona_horaria, correo_actualizado, correo_verificado, viaticante
                ) VALUES (
                    'USR-FASE1P', 'usuario-fase-1p', 'Usuario Fase 1P', :user_hash,
                    'usuario', TRUE, 'America/Bogota', FALSE, FALSE, FALSE
                )
                ON CONFLICT (id) DO UPDATE SET rol = 'usuario', hash_contrasena = :user_hash
            """), {"user_hash": ServicioAuth.obtener_hash_contrasena("usuario-fase-1p-clave-123456789")})
            stored_hash = (await conn.execute(text(
                "SELECT hash_contrasena FROM usuarios WHERE cedula = 'admin-fase-1p'"
            ))).scalar_one()
            assert ServicioAuth.verificar_contrasena(
                "fase-1p-clave-temporal-aleatoria-123456789", stored_hash
            )
        await _comprobar_fastapi_real(RUNTIME_URL, admin_hash)
        async with runtime_engine.begin() as conn:
            identidad = (await conn.execute(text("SELECT current_user"))).scalar_one()
            assert identidad == "gestor_runtime"
            tokens = (await conn.execute(text("SELECT token_sesion FROM sesiones"))).scalars().all()
            assert tokens and all(len(token) == 64 and "." not in token for token in tokens)

        async with owner_engine.begin() as conn:
            owners = (await conn.execute(text("""
                SELECT DISTINCT tableowner
                FROM pg_tables
                WHERE schemaname = 'public'
            """))).scalars().all()
            assert owners == ["gestor_schema_owner"]

            modulo = (await conn.execute(text("""
                SELECT modulo FROM permisos_rol
                WHERE rol = 'admin' ORDER BY modulo LIMIT 1
            """))).scalar_one()
            await conn.execute(text("""
                UPDATE permisos_rol SET permitido = FALSE
                WHERE rol = 'admin' AND modulo = :modulo
            """), {"modulo": modulo})
            await conn.execute(text("""
                INSERT INTO categorias_ticket (id, nombre, tipo_formulario)
                VALUES ('fase_1p', 'Fase 1P', 'general')
                ON CONFLICT (id) DO NOTHING
            """))
        await manage.ejecutar_migrate()
        async with owner_engine.begin() as conn:
            permiso = (await conn.execute(text("""
                SELECT COUNT(*), BOOL_AND(permitido)
                FROM permisos_rol WHERE rol = 'admin' AND modulo = :modulo
            """), {"modulo": modulo})).one()
            assert tuple(permiso) == (1, True)

        async with runtime_engine.begin() as conn:
            ticket_seq = (await conn.execute(text("SELECT nextval('ticket_id_seq')"))).scalar_one()
            assert ticket_seq >= 1
            ticket_id = f"TKT-{ticket_seq:04d}"
            await conn.execute(text("""
                INSERT INTO tickets (
                    id, categoria_id, asunto, descripcion, creador_id,
                    correo_creador, prioridad, estado
                ) VALUES (
                    :id, 'fase_1p', 'Ticket de aceptación', 'Secuencia disponible',
                    'admin-fase-1p', 'fase1p@example.test', 'Media', 'Pendiente'
                )
            """), {"id": ticket_id})
            assert (await conn.execute(
                text("SELECT id FROM tickets WHERE id = :id"), {"id": ticket_id}
            )).scalar_one() == ticket_id

        async with owner_engine.begin() as conn:
            await conn.execute(text("CREATE TABLE prueba_default_grant (id integer)"))
            await conn.execute(text("CREATE SEQUENCE prueba_default_grant_seq"))
        async with runtime_engine.begin() as conn:
            await conn.execute(text("INSERT INTO prueba_default_grant (id) VALUES (1)"))
            assert (await conn.execute(text("SELECT COUNT(*) FROM prueba_default_grant"))).scalar_one() == 1
            assert (await conn.execute(text("SELECT nextval('prueba_default_grant_seq')"))).scalar_one() == 1
        async with owner_engine.begin() as conn:
            await conn.execute(text("DROP TABLE prueba_default_grant"))
            await conn.execute(text("DROP SEQUENCE prueba_default_grant_seq"))

        with pytest.raises(DBAPIError):
            async with runtime_engine.begin() as conn:
                await conn.execute(text("CREATE TABLE runtime_no_debe_crear (id integer)"))
        with pytest.raises(DBAPIError):
            async with runtime_engine.begin() as conn:
                await conn.execute(text("""
                    INSERT INTO permisos_rol (rol, modulo, permitido)
                    VALUES ('usuario', 'no_autorizado', TRUE)
                """))
        for sentencia in (
            "INSERT INTO roles_sistema (id, nombre, es_sistema) VALUES ('admin_falso', 'Admin', TRUE)",
            "INSERT INTO usuarios (id, cedula, hash_contrasena, nombre, rol) VALUES ('forjado', 'forjado', 'hash', 'Forjado', 'analyst')",
            "UPDATE usuarios SET rol = 'usuario' WHERE cedula = 'admin-fase-1p'",
            "UPDATE usuarios SET hash_contrasena = 'tomado' WHERE cedula = 'admin-fase-1p'",
            "UPDATE usuarios SET hash_contrasena = 'tomado' WHERE id = 'USR-FASE1P'",
            "UPDATE usuarios SET correo = 'atacante@example.test' WHERE cedula = 'admin-fase-1p'",
            "UPDATE usuarios SET cedula = 'cedula-atacante' WHERE id = 'USR-FASE1P'",
            "UPDATE usuarios SET correo_actualizado = TRUE WHERE id = 'USR-FASE1P'",
                "UPDATE usuarios SET correo_verificado = TRUE WHERE id = 'USR-FASE1P'",
                "UPDATE usuarios SET esta_activo = FALSE WHERE id = 'USR-FASE1P'",
                "UPDATE usuarios SET id = 'USR-FORJADO' WHERE id = 'USR-FASE1P'",
                "UPDATE usuarios SET viaticante = TRUE WHERE id = 'USR-FASE1P'",
                "DELETE FROM usuarios WHERE cedula = 'admin-fase-1p'",
                "DELETE FROM usuarios WHERE id = 'USR-FASE1P'",
        ):
            with pytest.raises(DBAPIError):
                async with runtime_engine.begin() as conn:
                    await conn.execute(text(sentencia))

        funciones_falsificables = (
            "admin_actualizar_usuario(:cap, :actor, 'USR-FASE1P', 'admin')",
            "admin_configurar_permiso(:cap, :actor, 'usuario', 'forjado', TRUE)",
            "admin_crear_rol(:cap, :actor, 'forjado', 'Forjado', NULL)",
            "admin_eliminar_rol(:cap, :actor, 'analyst')",
            "auth_actualizar_hash_usuario(:cap, 'USR-FASE1P', 'tomado')",
            "auth_actualizar_correo_usuario(:cap, 'USR-FASE1P', 'x@example.test', TRUE, TRUE)", "admin_actualizar_estado_usuario(:cap, :actor, 'USR-FASE1P', FALSE)",
        )
        for llamada in funciones_falsificables:
            with pytest.raises(DBAPIError):
                async with runtime_engine.begin() as conn:
                    await conn.execute(text(f"SELECT public.{llamada}"), {
                        "cap": "capacidad-incorrecta-12345678901234567890",
                        "actor": "admin-fase-1p",
                    })

        alteraciones = (
            "ALTER TABLE usuarios DROP COLUMN area",
            "DROP TABLE auditoria_eventos",
            "ALTER TABLE nomina_plantillas_horario DROP CONSTRAINT ck_plantilla_version_positiva",
            "DROP TRIGGER trg_nomina_plantillas_horario_historial_append_only "
            "ON nomina_plantillas_horario_historial",
        )
        for alteracion in alteraciones:
            async with owner_engine.begin() as conn:
                await conn.execute(text(alteracion))
            with pytest.raises(RuntimeError, match="Esquema incompleto"):
                await verificar_esquema_runtime(runtime_engine)
            await manage.ejecutar_migrate()
            await verificar_esquema_runtime(runtime_engine)

        corrupciones_semanticas = (
            (
                (
                    "ALTER TABLE nomina_plantillas_horario DROP CONSTRAINT ck_plantilla_version_positiva",
                    "ALTER TABLE nomina_plantillas_horario ADD CONSTRAINT ck_plantilla_version_positiva "
                    "CHECK (version > -100) NOT VALID",
                ),
                owner_engine,
            ),
            (
                ("ALTER TABLE nomina_plantillas_horario_historial DISABLE TRIGGER "
                 "trg_nomina_plantillas_horario_historial_append_only",),
                owner_engine,
            ),
            (
                (
                    "DROP TRIGGER trg_nomina_plantillas_horario_historial_append_only "
                    "ON nomina_plantillas_horario_historial",
                    "CREATE TRIGGER trg_nomina_plantillas_horario_historial_append_only "
                    "BEFORE INSERT OR UPDATE OR DELETE ON nomina_plantillas_horario_historial "
                    "FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_append_only()",
                ),
                owner_engine,
            ),
            (
                ("DROP FUNCTION rechazar_mutacion_append_only() CASCADE",
                 "CREATE FUNCTION rechazar_mutacion_append_only() RETURNS integer AS $$ "
                 "BEGIN RETURN 1; END; $$ LANGUAGE plpgsql"),
                owner_engine,
            ),
            (
                (
                    "DROP INDEX ux_permisos_rol_rol_modulo",
                    "CREATE UNIQUE INDEX ux_permisos_rol_rol_modulo "
                    "ON permisos_rol (rol, modulo) WHERE permitido",
                ),
                owner_engine,
            ),
            (
                (
                    "DROP INDEX idx_auditoria_resultado",
                    "CREATE INDEX idx_auditoria_resultado ON auditoria_eventos (endpoint)",
                ),
                owner_engine,
            ),
            (("ALTER TABLE usuarios OWNER TO gestor_runtime",), bootstrap_engine),
        )
        for sentencias, engine in corrupciones_semanticas:
            async with engine.begin() as conn:
                for sentencia in sentencias:
                    await conn.execute(text(sentencia))
            with pytest.raises(RuntimeError, match="Esquema incompleto"):
                await verificar_esquema_runtime(runtime_engine)
            if any("OWNER TO" in sentencia for sentencia in sentencias):
                async with bootstrap_engine.begin() as conn:
                    await conn.execute(text("ALTER TABLE usuarios OWNER TO gestor_schema_owner"))
            await manage.ejecutar_migrate()
            await verificar_esquema_runtime(runtime_engine)

        async with owner_engine.begin() as conn:
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION proteger_credenciales_admin_runtime()
                RETURNS trigger AS $$
                BEGIN
                    -- Operación sensible no permitida
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            """))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime_engine)
        await manage.ejecutar_migrate()

        async with owner_engine.begin() as conn:
            await conn.execute(text("""
                CREATE FUNCTION proteger_credenciales_admin_runtime(integer)
                RETURNS integer AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql
            """))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime_engine)
        await manage.ejecutar_migrate()

        async with owner_engine.begin() as conn:
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION public.admin_eliminar_rol(
                    p_capacidad character varying, p_actor character varying,
                    p_id character varying
                ) RETURNS void SECURITY DEFINER
                SET search_path = pg_catalog, public AS $$
                BEGIN RETURN; END;
                $$ LANGUAGE plpgsql
            """))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime_engine)
        await manage.ejecutar_migrate()

        funciones_criticas = (
            "rechazar_mutacion_append_only", "proteger_credenciales_admin_runtime",
            "validar_capacidad_rbac", "auth_actualizar_hash_usuario",
            "auth_consumir_token_recuperacion",
            "auth_actualizar_correo_usuario", "admin_actualizar_estado_usuario", "admin_actualizar_usuario",
            "admin_configurar_permiso", "admin_crear_rol", "admin_eliminar_rol",
        )
        nombres_sql = ", ".join(f"'{nombre}'" for nombre in funciones_criticas)
        async with bootstrap_engine.begin() as conn:
            await conn.execute(text(f"""
                DO $owner$ DECLARE signature text;
                BEGIN
                    FOR signature IN
                        SELECT p.oid::regprocedure::text FROM pg_proc p
                        WHERE p.pronamespace = 'public'::regnamespace
                          AND p.proname IN ({nombres_sql})
                    LOOP
                        EXECUTE 'ALTER FUNCTION ' || signature || ' OWNER TO gestor_runtime';
                    END LOOP;
                END $owner$;
            """))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime_engine)
        async with bootstrap_engine.begin() as conn:
            await conn.execute(text(f"""
                DO $owner$ DECLARE signature text;
                BEGIN
                    FOR signature IN
                        SELECT p.oid::regprocedure::text FROM pg_proc p
                        WHERE p.pronamespace = 'public'::regnamespace
                          AND p.proname IN ({nombres_sql})
                    LOOP
                        EXECUTE 'ALTER FUNCTION ' || signature || ' OWNER TO gestor_schema_owner';
                    END LOOP;
                END $owner$;
            """))
        await manage.ejecutar_migrate()
        await verificar_esquema_runtime(runtime_engine)

        async with bootstrap_engine.begin() as conn:
            await conn.execute(text("ALTER ROLE gestor_runtime BYPASSRLS"))
            await conn.execute(text("GRANT gestor_schema_owner TO gestor_runtime"))
        with pytest.raises(RuntimeError, match="Privilegios runtime"):
            await verificar_esquema_runtime(runtime_engine)
        async with bootstrap_engine.begin() as conn:
            await conn.execute(text("REVOKE gestor_schema_owner FROM gestor_runtime"))
            await conn.execute(text("ALTER ROLE gestor_runtime NOBYPASSRLS"))
        await verificar_esquema_runtime(runtime_engine)

        async with bootstrap_engine.begin() as conn:
            await conn.execute(text("CREATE SCHEMA sombra AUTHORIZATION gestor_schema_owner"))
            await conn.execute(text("CREATE TABLE sombra.permisos_rol (rol text, modulo text)"))
            await conn.execute(text("""
                CREATE UNIQUE INDEX ux_permisos_rol_rol_modulo
                ON sombra.permisos_rol (rol, modulo)
            """))
            await conn.execute(text("ALTER ROLE gestor_migrador SET search_path = sombra, public"))
            await conn.execute(text("ALTER ROLE gestor_runtime SET search_path = sombra, public"))
        async with owner_engine.begin() as conn:
            await conn.execute(text("DROP INDEX public.ux_permisos_rol_rol_modulo"))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime_engine)
        await manage.ejecutar_migrate()
        await verificar_esquema_runtime(runtime_engine)
        async with owner_engine.begin() as conn:
            await conn.execute(text("""
                CREATE FUNCTION sombra.rechazar_mutacion_append_only()
                RETURNS trigger AS $$ BEGIN RETURN OLD; END; $$ LANGUAGE plpgsql
            """))
            await conn.execute(text("""
                DROP TRIGGER trg_nomina_plantillas_horario_historial_append_only
                ON public.nomina_plantillas_horario_historial
            """))
            await conn.execute(text("""
                CREATE TRIGGER trg_nomina_plantillas_horario_historial_append_only
                BEFORE UPDATE OR DELETE ON public.nomina_plantillas_horario_historial
                FOR EACH ROW EXECUTE FUNCTION sombra.rechazar_mutacion_append_only()
            """))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime_engine)
        await manage.ejecutar_migrate()
        async with owner_engine.begin() as conn:
            await conn.execute(text("""
                GRANT EXECUTE ON FUNCTION public.admin_eliminar_rol(
                    character varying, character varying, character varying
                ) TO gestor_runtime WITH GRANT OPTION
            """))
            await conn.execute(text("GRANT SELECT ON public.configuracion_seguridad_runtime TO gestor_migrador"))
        with pytest.raises(RuntimeError, match="Esquema incompleto"):
            await verificar_esquema_runtime(runtime_engine)
        await manage.ejecutar_migrate()
        async with bootstrap_engine.begin() as conn:
            await conn.execute(text("ALTER ROLE gestor_migrador RESET search_path"))
            await conn.execute(text("ALTER ROLE gestor_runtime RESET search_path"))
            await conn.execute(text("DROP SCHEMA sombra CASCADE"))
        await verificar_esquema_runtime(runtime_engine)
    finally:
        await runtime_engine.dispose()
        await owner_engine.dispose()
        await bootstrap_engine.dispose()
