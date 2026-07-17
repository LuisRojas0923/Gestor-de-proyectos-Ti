"""Contratos de separacion entre migrador y runtime de FastAPI."""
import asyncio
import ast
import importlib
import re
from pathlib import Path

import pytest

from app.core.migrations import manager
from app.core.migrations import bootstrap_admin
from app.core.migrations import auth_runtime_protection
from app.core.migrations import rbac_admin_procedures
from app.core.migrations import actividades_migration
from app.core.migrations import auditoria_acciones_migration
from app.core.migrations import auditoria_evento_migration
from app.core.migrations import horas_extras_migration
from app.core.migrations import horas_extras_migration_s8
from app.core.migrations import structural_blindaje
from app.core import rbac_capability
from app.services.auth import rbac_discovery
from app.models.auth.usuario import RolCrear


ROOT = Path(__file__).resolve().parents[2]
MAIN_PATH = ROOT / "backend_v2" / "app" / "main.py"
MANAGER_PATH = ROOT / "backend_v2" / "app" / "core" / "migrations" / "manager.py"
CONFIG_PATH = ROOT / "backend_v2" / "app" / "config.py"
LOGIN_PATH = ROOT / "backend_v2" / "app" / "api" / "auth" / "login_router.py"
ADMIN_ROUTER_PATH = ROOT / "backend_v2" / "app" / "api" / "auth" / "admin_router.py"
OCCIDENTE_PATH = (
    ROOT / "backend_v2" / "app" / "services" / "novedades_nomina"
    / "occidente_extractor.py"
)
COMPOSE_PATHS = (
    ROOT / "docker-compose.yml",
    ROOT / "docker-compose.Pruebas3.yml",
    ROOT / "docker-compose.prod.yml",
)
RUNTIME_CONFIG_REQUERIDA = (
    "PORTAL_PENDING_PWD",
    "TRUSTED_PROXY_IPS",
    "SMTP_HOST",
    "CALENDARIFIC_API_KEY",
    "VERIFY_ADMIN_RATE_LIMIT",
    "RATE_LIMIT_LOGIN",
    "LOCKOUT_UMBRAL_FALLOS",
    "DEEPFACE_MODEL",
    "BIOMETRIA_MAX_IMAGE_BYTES",
    "LIBRANZA_OCCIDENTE_PASSWORD",
    "RBAC_ADMIN_CAPABILITY_FILE",
    "DATABASE_MIGRATION_ROLE",
)


def _startup_calls() -> set[str]:
    tree = ast.parse(MAIN_PATH.read_text(encoding="utf-8"))
    startup = next(
        node
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == "startup_event"
    )
    return {
        node.func.id
        for node in ast.walk(startup)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
    }


def _service_block(compose: str, service: str) -> str:
    match = re.search(
        rf"(?ms)^  {re.escape(service)}:\s*\n(.*?)(?=^  \S|\Z)",
        compose,
    )
    assert match is not None, f"No existe el servicio {service}"
    return match.group(1)


class _ScalarResult:
    def __init__(self, values=()):
        self._values = list(values)

    def scalars(self):
        return self

    def mappings(self):
        return self

    def all(self):
        return self._values

    def first(self):
        return self._values[0] if self._values else None


class _ReadConnection:
    def __init__(self, values=()):
        self.values = values
        self.statements = []

    async def execute(self, statement, _params=None):
        self.statements.append(str(statement).strip())
        return _ScalarResult(self.values)


class _ConnectionContext:
    def __init__(self, connection):
        self.connection = connection

    async def __aenter__(self):
        return self.connection

    async def __aexit__(self, *_args):
        return False


class _ReadEngine:
    def __init__(self, values=()):
        self.connection = _ReadConnection(values)

    def connect(self):
        return _ConnectionContext(self.connection)


class _ReadSession(_ReadConnection):
    pass


class _FailingConnection:
    async def execute(self, *_args, **_kwargs):
        raise RuntimeError("fallo SQL interno")


class _AdvisoryConnection:
    def __init__(self, lock):
        self.lock = lock

    async def execute(self, statement, _params=None):
        sql = str(statement)
        if "pg_advisory_unlock" in sql:
            self.lock.release()
        elif "pg_advisory_lock" in sql:
            await self.lock.acquire()
        return _ScalarResult()


class _AdvisoryEngine:
    def __init__(self):
        self.lock = asyncio.Lock()

    def connect(self):
        return _ConnectionContext(_AdvisoryConnection(self.lock))


class _SessionFactory:
    def __call__(self):
        return _ConnectionContext(_ReadSession())


def _aislar_post_migracion(monkeypatch):
    async def noop(*_args, **_kwargs):
        return None

    monkeypatch.setattr(manager, "preparar_integridad_rbac", noop)
    monkeypatch.setattr(manager, "sembrar_roles_sistema", noop)
    monkeypatch.setattr(manager, "verificar_admin_preexistente", noop)
    monkeypatch.setattr(manager, "aplicar_privilegios_runtime", noop)
    monkeypatch.setattr(bootstrap_admin, "asegurar_admin_inicial", noop)
    monkeypatch.setattr(auth_runtime_protection, "instalar_proteccion_auth_runtime", noop)
    monkeypatch.setattr(rbac_admin_procedures, "instalar_procedimientos_admin", noop)
    monkeypatch.setattr(rbac_discovery, "sincronizar_manifiesto_rbac", noop)
    monkeypatch.setenv("DATABASE_RUNTIME_ROLE", "gestor_runtime")
    monkeypatch.setattr(
        rbac_capability,
        "obtener_capacidad_rbac",
        lambda: "capacidad-rbac-unitaria-12345678901234567890",
    )


def test_startup_runtime_no_ejecuta_migraciones_ni_sincroniza_rbac():
    calls = _startup_calls()

    assert "init_db" not in calls
    assert "sincronizar_manifiesto_rbac" not in calls
    assert "verificar_esquema_runtime" in calls
    assert "verificar_manifiesto_rbac" in calls


@pytest.mark.asyncio
async def test_esquema_incompleto_bloquea_runtime_sin_escrituras():
    engine = _ReadEngine()
    verify = getattr(manager, "verificar_esquema_runtime", None)

    assert verify is not None, "Falta el verificador read-only del esquema"
    with pytest.raises(RuntimeError, match="Esquema incompleto"):
        await verify(engine)
    assert engine.connection.statements
    assert all(sql.upper().startswith("SELECT") for sql in engine.connection.statements)


@pytest.mark.asyncio
async def test_rbac_incompleto_bloquea_runtime_sin_commit():
    session = _ReadSession()
    verify = getattr(rbac_discovery, "verificar_manifiesto_rbac", None)

    assert verify is not None, "Falta el verificador read-only de RBAC"
    with pytest.raises(RuntimeError, match="RBAC incompleto"):
        await verify(session)
    assert session.statements
    assert all(sql.upper().startswith("SELECT") for sql in session.statements)
    assert not hasattr(session, "commit")


@pytest.mark.asyncio
async def test_dos_jobs_migradores_se_serializan(monkeypatch):
    engine = _AdvisoryEngine()
    activos = 0
    maximo_activos = 0

    async def migration_stub(_engine, _session_factory):
        nonlocal activos, maximo_activos
        activos += 1
        maximo_activos = max(maximo_activos, activos)
        await asyncio.sleep(0.01)
        activos -= 1

    monkeypatch.setattr(manager, "init_db_process", migration_stub)
    _aislar_post_migracion(monkeypatch)
    session_factory = _SessionFactory()
    await asyncio.gather(
        manager.ejecutar_migraciones(engine, session_factory),
        manager.ejecutar_migraciones(engine, session_factory),
    )

    assert maximo_activos == 1
    assert not engine.lock.locked()


@pytest.mark.asyncio
async def test_job_fallido_propaga_error_y_libera_lock(monkeypatch):
    engine = _AdvisoryEngine()

    async def migration_stub(_engine, _session_factory):
        raise RuntimeError("job fallido")

    monkeypatch.setattr(manager, "init_db_process", migration_stub)
    with pytest.raises(RuntimeError, match="job fallido"):
        await manager.ejecutar_migraciones(engine, object())

    assert not engine.lock.locked()


def test_comando_migrate_exige_url_dedicada(monkeypatch):
    monkeypatch.delenv("MIGRATION_DATABASE_URL", raising=False)
    manage = importlib.import_module("app.manage")

    with pytest.raises(RuntimeError, match="MIGRATION_DATABASE_URL"):
        manage.obtener_url_migracion()


def test_compose_ejecuta_migrate_antes_del_runtime_sin_filtrar_credencial():
    for path in COMPOSE_PATHS:
        compose = path.read_text(encoding="utf-8")
        migrate = _service_block(compose, "migrate")
        backend = _service_block(compose, "backend")

        assert "python -m app.manage migrate" in migrate, path.name
        assert "MIGRATION_DATABASE_URL" in migrate, path.name
        assert "service_completed_successfully" in backend, path.name
        assert "MIGRATION_DATABASE_URL" not in backend, path.name
        assert "env_file:" not in backend, path.name
        assert "DB_MIGRATION_PASS" not in backend, path.name
        for variable in RUNTIME_CONFIG_REQUERIDA:
            assert variable in backend, f"{path.name}: falta {variable}"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "execute",
    (
        actividades_migration.safe_execute,
        auditoria_acciones_migration.safe_execute,
        auditoria_evento_migration.safe_execute,
        horas_extras_migration.safe_execute,
        horas_extras_migration_s8._safe_execute,
        structural_blindaje.safe_execute,
    ),
)
async def test_helpers_migracion_propagan_fallos_sql(execute):
    with pytest.raises(RuntimeError, match="fallo SQL interno"):
        await execute(_FailingConnection(), "SELECT 1")


def test_compose_aprovisiona_roles_distintos_sin_defaults_productivos():
    init_script = (
        ROOT / "postgres" / "init" / "01-gestor-roles.sh"
    ).read_text(encoding="utf-8")
    development = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    production = (ROOT / "docker-compose.prod.yml").read_text(encoding="utf-8")
    pruebas = (ROOT / "docker-compose.Pruebas3.yml").read_text(encoding="utf-8")
    env_example = (ROOT / ".env.example").read_text(encoding="utf-8")

    assert "NOLOGIN NOSUPERUSER" in init_script
    assert "LOGIN NOINHERIT NOSUPERUSER" in init_script
    assert "GRANT %I TO %I" in init_script
    assert "pg_depend" in init_script
    assert "d.deptype IN ('a', 'i')" in init_script
    assert "Las credenciales PostgreSQL deben ser distintas" in init_script
    assert "LIBRANZA_OCCIDENTE_PASSWORD=${LIBRANZA_OCCIDENTE_PASSWORD:-}" in development
    assert "LIBRANZA_OCCIDENTE_PASSWORD requerida" in production
    assert "LIBRANZA_OCCIDENTE_PASSWORD requerida" in pruebas
    assert "restart: unless-stopped" in _service_block(development, "frontend")
    assert "./secrets/rbac_admin_capability.key" in development
    assert "RBAC_ADMIN_CAPABILITY_FILE=./secrets/rbac_admin_capability.key" in env_example
    assert "REVOKE %I FROM %I" in init_script
    assert "DB_MIGRATION_PASS:?" in production
    assert "DB_RUNTIME_PASS:?" in production
    assert "password_segura" not in production


def test_manager_no_conserva_bootstrap_admin_predecible():
    source = MANAGER_PATH.read_text(encoding="utf-8")

    assert "admin123" not in source
    assert 'cedula="admin"' not in source


def test_jit_no_usa_pending_password_publico_y_falla_sin_secreto():
    config_source = CONFIG_PATH.read_text(encoding="utf-8")
    login_source = LOGIN_PATH.read_text(encoding="utf-8")

    assert 'portal_pending_pwd: str = ""' in config_source
    assert "if not config.portal_pending_pwd" in login_source


def test_registry_declara_todos_los_modulos_con_tablas_sqlmodel():
    from app.models.registry import MODEL_MODULES

    modules_with_tables = set()
    models_root = ROOT / "backend_v2" / "app" / "models"
    for path in models_root.rglob("*.py"):
        if "table=True" in path.read_text(encoding="utf-8"):
            relative = path.relative_to(ROOT / "backend_v2").with_suffix("")
            modules_with_tables.add(".".join(relative.parts))

    assert modules_with_tables == set(MODEL_MODULES)


def test_libranza_occidente_no_tiene_password_publico_de_fallback():
    source = OCCIDENTE_PATH.read_text(encoding="utf-8")

    assert 'os.getenv("LIBRANZA_OCCIDENTE_PASSWORD")' in source
    assert "805005717" not in source
    assert "LIBRANZA_OCCIDENTE_PASSWORD no configurada" in source


def test_endpoints_admin_delegan_mutaciones_a_procedimientos_privilegiados():
    source = ADMIN_ROUTER_PATH.read_text(encoding="utf-8")
    source += (
        ROOT / "backend_v2" / "app" / "services" / "auth"
        / "protected_identity_service.py"
    ).read_text(encoding="utf-8")

    for function_name in (
        "admin_actualizar_usuario",
        "admin_configurar_permiso",
        "admin_crear_rol",
        "admin_eliminar_rol",
    ):
        assert f"public.{function_name}" in source
    assert "db.add(nuevo_rol)" not in source
    assert "await db.delete(rol)" not in source


def test_procedimientos_privilegiados_exigen_capacidad_no_actor_falsificable():
    for contrato in rbac_admin_procedures.ADMIN_FUNCTIONS.values():
        assert contrato["args"].startswith("p_capacidad character varying")
        assert "validar_capacidad_rbac(p_capacidad)" in contrato["body"]

    source = ADMIN_ROUTER_PATH.read_text(encoding="utf-8")
    assert "obtener_capacidad_rbac()" in source
    assert '"capacidad":' in source


def test_verificador_y_ddl_critico_fijan_namespace_public_y_acl_exacta():
    verifier = (
        ROOT / "backend_v2" / "app" / "core" / "migrations" / "schema_verifier.py"
    ).read_text(encoding="utf-8")
    procedures = (
        ROOT / "backend_v2" / "app" / "core" / "migrations" / "rbac_admin_procedures.py"
    ).read_text(encoding="utf-8")
    protection = (
        ROOT / "backend_v2" / "app" / "core" / "migrations" / "auth_runtime_protection.py"
    ).read_text(encoding="utf-8")

    assert "current_schema()" not in verifier
    assert "funcion_schema" in verifier
    assert "grantees_execute" in verifier
    assert "COUNT(*) FROM public.configuracion_seguridad_runtime" not in verifier
    assert "valor_hash" not in verifier
    assert "public." in procedures
    assert "public." in protection


def test_payloads_admin_son_tipados_y_rol_se_normaliza_antes_de_consultar():
    source = ADMIN_ROUTER_PATH.read_text(encoding="utf-8")

    assert "datos: dict" not in source
    assert "List[dict]" not in source
    assert "model_dump(exclude_unset=True)" in source
    assert RolCrear(id=" Mi Rol ", nombre="Mi rol").id == "mi_rol"
    for invalido in ("rol;drop", 123, None):
        with pytest.raises(ValueError):
            RolCrear(id=invalido, nombre="Inválido")


def test_escalado_y_reset_admin_no_dejan_hash_predecible_ni_filtran_errores():
    source = ADMIN_ROUTER_PATH.read_text(encoding="utf-8")

    assert "obtener_hash_contrasena(usuario.cedula)" not in source
    assert "logging.error(f" not in source
    assert "secrets.token_urlsafe" in source


def test_limite_biometrico_default_coincide_con_compose():
    source = (
        ROOT / "backend_v2" / "app" / "services" / "biometria" / "biometria_service.py"
    ).read_text(encoding="utf-8")

    assert "str(5 * 1024 * 1024)" in source


def test_sesiones_web_se_hashean_y_validan_revocacion():
    session_source = (
        ROOT / "backend_v2" / "app" / "services" / "auth" / "sesion_service.py"
    ).read_text(encoding="utf-8")
    profile_source = (
        ROOT / "backend_v2" / "app" / "api" / "auth" / "profile_router.py"
    ).read_text(encoding="utf-8")

    assert "sha256" in session_source
    assert "token_sesion=hash_token_sesion(token_jwt)" in session_source
    assert "validar_sesion_activa" in profile_source
    assert 'if payload.get("token_type") == "mcp"' not in profile_source
    assert 'exclude={"hash_contrasena"}' in profile_source


def test_trigger_protege_identidad_y_endpoint_analista_exige_admin():
    body = auth_runtime_protection.AUTH_PROTECTION_FUNCTION_BODY
    source = ADMIN_ROUTER_PATH.read_text(encoding="utf-8")

    for campo in (
        "id", "hash_contrasena", "cedula", "correo", "correo_actualizado",
        "correo_verificado", "esta_activo", "viaticante",
    ):
        assert f"NEW.{campo} IS DISTINCT FROM OLD.{campo}" in body
    assert "OLD.rol IN ('admin', 'admin_sistemas')" not in body
    assert "admin: Usuario = Depends(obtener_usuario_actual_db)" in source
    assert "crear_analista_desde_erp(" in source and "admin.id" in source


def test_capacidad_solo_archivo_acl_privada_exacta_y_colision_controlada():
    capability_source = (
        ROOT / "backend_v2" / "app" / "core" / "rbac_capability.py"
    ).read_text(encoding="utf-8")
    verifier_source = (
        ROOT / "backend_v2" / "app" / "core" / "migrations" / "schema_verifier.py"
    ).read_text(encoding="utf-8")
    admin_source = ADMIN_ROUTER_PATH.read_text(encoding="utf-8")

    assert 'os.getenv("RBAC_ADMIN_CAPABILITY",' not in capability_source
    assert "capability_grantees" in verifier_source
    assert "except IntegrityError" in admin_source


def test_runtime_no_expone_create_all_ni_seed_estructural():
    source = (
        ROOT / "backend_v2" / "app" / "api" / "solid" / "router.py"
    ).read_text(encoding="utf-8")
    assert "create_all" not in source
    assert '@router.post("/seed")' not in source


def test_utilidades_ejecutables_no_contienen_admin123():
    for nombre in ("create_admin.py", "reset.py"):
        path = ROOT / "backend_v2" / nombre
        if path.exists():
            assert "admin123" not in path.read_text(encoding="utf-8")


def test_verify_incluye_tabla_auditoria_eventos():
    source = (
        ROOT / "backend_v2" / "app" / "core" / "migrations" / "schema_verifier.py"
    ).read_text(encoding="utf-8")
    assert "auditoria_eventos" in source
