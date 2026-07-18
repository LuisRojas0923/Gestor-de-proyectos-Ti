"""Verificación read-only del esquema y privilegios del proceso runtime."""
import os
import re

from sqlalchemy import text
from sqlmodel import SQLModel


CONSTRAINTS_REQUERIDOS = {
    "ck_plantilla_version_positiva": ("nomina_plantillas_horario", "CHECK ((version > 0))"),
    "ck_plantilla_dia_rango": ("nomina_plantillas_horario_dias", "CHECK (((dia_semana >= 1) AND (dia_semana <= 7)))"),
    "ck_plantilla_almuerzo_rango": ("nomina_plantillas_horario_dias", "CHECK (((minutos_almuerzo >= 0) AND (minutos_almuerzo <= 240)))"),
    "ck_plantilla_horas_par": ("nomina_plantillas_horario_dias", "CHECK (((hora_entrada IS NULL) = (hora_salida IS NULL)))"),
    "uq_aplicacion_solicitud_plantilla": ("nomina_aplicaciones_plantilla_horario", "UNIQUE (solicitud_id, plantilla_id)"),
    "uq_relacion_gestor_empleado": ("relaciones_gestor_empleado", "UNIQUE (gestor_usuario_id, empleado_cedula)"),
}

TRIGGERS_REQUERIDOS = {
    "trg_nomina_plantillas_horario_historial_append_only": ("nomina_plantillas_horario_historial", "rechazar_mutacion_append_only", 27),
    "trg_nomina_aplicaciones_plantilla_horario_append_only": ("nomina_aplicaciones_plantilla_horario", "rechazar_mutacion_append_only", 27),
    "trg_nomina_aplicaciones_plantilla_empleados_append_only": ("nomina_aplicaciones_plantilla_empleados", "rechazar_mutacion_append_only", 27),
    "trg_historial_relaciones_gestor_empleado_append_only": ("historial_relaciones_gestor_empleado", "rechazar_mutacion_append_only", 27),
    "trg_usuarios_proteger_admin_runtime": ("usuarios", "proteger_credenciales_admin_runtime", 31),
}


def _normalizar(definicion: str) -> str:
    return re.sub(r"\s+", " ", definicion.lower()).strip()


def _validar_constraints(rows) -> bool:
    if len(rows) != len(CONSTRAINTS_REQUERIDOS):
        return False
    encontrados = {row["nombre"]: row for row in rows}
    for nombre, (tabla, definicion_esperada) in CONSTRAINTS_REQUERIDOS.items():
        row = encontrados.get(nombre)
        if not row or row["tabla"] != tabla or not row["validado"]:
            return False
        if _normalizar(row["definicion"]) != _normalizar(definicion_esperada):
            return False
    return True


def _validar_triggers(rows) -> bool:
    if len(rows) != len(TRIGGERS_REQUERIDOS):
        return False
    encontrados = {row["nombre"]: row for row in rows}
    for nombre, (tabla, funcion, tipo) in TRIGGERS_REQUERIDOS.items():
        row = encontrados.get(nombre)
        if (not row or row["tabla"] != tabla or row["funcion"] != funcion
                or row["funcion_schema"] != "public"):
            return False
        if row["habilitado"] not in ("O", b"O") or row["tipo"] != tipo:
            return False
    return True


def _validar_admin_functions(funciones, owner_role: str, runtime_role: str) -> bool:
    from app.core.migrations.rbac_admin_procedures import PRIVILEGED_FUNCTIONS
    for nombre, contrato in PRIVILEGED_FUNCTIONS.items():
        row = funciones.get(nombre)
        esperados = {owner_role}
        if contrato["runtime_execute"]:
            esperados.add(runtime_role)
        if (not row or row["namespace"] != "public"
                or row["argumentos"] != contrato["args"]
                or row["retorno"] != contrato["return"]):
            return False
        configuracion = row["configuracion"] or []
        if (row["owner"] != owner_role or not row["security_definer"]
                or row["lenguaje"] != "plpgsql"
                or "search_path=pg_catalog, public" not in configuracion
                or _normalizar(row["cuerpo"]) != _normalizar(contrato["body"])
                or set(row["grantees_execute"] or []) != esperados
                or row["execute_grant_option"]):
            return False
    return True


async def verificar_esquema_runtime(async_engine):
    """Comprueba estructura, ownership e identidad sin modificar la base."""
    from app.core.migrations.rbac_admin_procedures import PRIVILEGED_FUNCTIONS
    from app.models.auth.auditoria_evento import AuditoriaEvento

    tablas = list(SQLModel.metadata.tables.values()) + [AuditoriaEvento.__table__]
    nombres_tablas = sorted({table.name for table in tablas})
    columnas = {(table.name, column.name) for table in tablas for column in table.columns}
    if not nombres_tablas:
        raise RuntimeError("Esquema incompleto: no hay tablas registradas para verificar")

    runtime_role = os.getenv("DATABASE_RUNTIME_ROLE", "gestor_runtime")
    owner_role = os.getenv("DATABASE_SCHEMA_OWNER_ROLE", "gestor_schema_owner")
    async with async_engine.connect() as conn:
        tablas_rows = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT tablename AS nombre, tableowner AS owner
            FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY(:tablas)
        """), {"tablas": nombres_tablas})).mappings().all()
        columnas_rows = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ANY(:tablas)
        """), {"tablas": nombres_tablas})).all()
        constraints = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT c.conname AS nombre, t.relname AS tabla,
                   pg_get_constraintdef(c.oid) AS definicion, c.convalidated AS validado
            FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' AND c.conname = ANY(:nombres)
        """), {"nombres": list(CONSTRAINTS_REQUERIDOS)})).mappings().all()
        triggers = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT g.tgname AS nombre, t.relname AS tabla, p.proname AS funcion,
                   pn.nspname AS funcion_schema,
                   g.tgenabled AS habilitado, g.tgtype AS tipo
            FROM pg_trigger g JOIN pg_class t ON t.oid = g.tgrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_proc p ON p.oid = g.tgfoid
            JOIN pg_namespace pn ON pn.oid = p.pronamespace
            WHERE n.nspname = 'public' AND NOT g.tgisinternal
              AND g.tgname = ANY(:nombres)
        """), {"nombres": list(TRIGGERS_REQUERIDOS)})).mappings().all()
        nombres_funciones = [
            "rechazar_mutacion_append_only",
            "proteger_credenciales_admin_runtime",
            *PRIVILEGED_FUNCTIONS,
        ]
        funciones = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT p.proname AS nombre, pg_get_function_identity_arguments(p.oid) AS argumentos,
                   pg_get_function_result(p.oid) AS retorno, p.prosrc AS cuerpo,
                   l.lanname AS lenguaje, r.rolname AS owner, p.prosecdef AS security_definer,
                    p.proconfig AS configuracion, n.nspname AS namespace,
                    ARRAY(
                        SELECT CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END
                        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
                        LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
                        WHERE acl.privilege_type = 'EXECUTE'
                        ORDER BY CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END
                    ) AS grantees_execute,
                    EXISTS (
                        SELECT 1
                        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
                        WHERE acl.privilege_type = 'EXECUTE'
                          AND acl.is_grantable
                          AND acl.grantee <> p.proowner
                    ) AS execute_grant_option
            FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
            JOIN pg_roles r ON r.oid = p.proowner
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE p.pronamespace = 'public'::regnamespace
              AND p.proname = ANY(:nombres)
        """), {"nombres": nombres_funciones})).mappings().all()
        indice = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT t.relname AS tabla, i.indisunique AS unico, i.indisvalid AS valido,
                   i.indpred IS NULL AS sin_predicado, i.indexprs IS NULL AS sin_expresiones,
                   pg_get_indexdef(i.indexrelid) AS definicion
            FROM pg_index i JOIN pg_class x ON x.oid = i.indexrelid
            JOIN pg_class t ON t.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = x.relnamespace
            WHERE n.nspname = 'public'
              AND x.relname = 'ux_permisos_rol_rol_modulo'
        """))).mappings().first()
        indices_auditoria = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT x.relname AS nombre, i.indisvalid AS valido,
                   i.indisunique AS unico, i.indpred IS NULL AS sin_predicado,
                   i.indexprs IS NULL AS sin_expresiones,
                   ARRAY(
                       SELECT pg_get_indexdef(i.indexrelid, posicion, TRUE)
                       FROM generate_series(1, i.indnkeyatts) AS posicion
                   ) AS columnas
            FROM pg_index i JOIN pg_class x ON x.oid = i.indexrelid
            JOIN pg_class t ON t.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = x.relnamespace
            WHERE n.nspname = 'public' AND t.relname = 'auditoria_eventos'
              AND x.relname = ANY(:nombres)
        """), {"nombres": [
            "idx_auditoria_usuario_ts", "idx_auditoria_resultado",
        ]})).mappings().all()
        secuencia = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT c.relname AS nombre, pg_get_userbyid(c.relowner) AS owner
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'S'
              AND c.relname = 'ticket_id_seq'
        """))).mappings().first()

        owners = {row["nombre"]: row["owner"] for row in tablas_rows}
        funciones_por_nombre = {row["nombre"]: row for row in funciones}
        append_only = funciones_por_nombre.get("rechazar_mutacion_append_only")
        proteccion_auth = funciones_por_nombre.get("proteger_credenciales_admin_runtime")
        from app.core.migrations.auth_runtime_protection import AUTH_PROTECTION_FUNCTION_BODY
        from app.core.migrations.horarios_relaciones_migration import APPEND_ONLY_FUNCTION_BODY
        auth_body = AUTH_PROTECTION_FUNCTION_BODY.format(runtime_role=runtime_role)
        estructura_valida = (
            set(owners) == set(nombres_tablas)
            and set(owners.values()) == {owner_role}
            and columnas <= {tuple(row) for row in columnas_rows}
            and len(funciones) == len(nombres_funciones)
            and _validar_constraints(constraints)
            and _validar_triggers(triggers)
            and append_only is not None and append_only["argumentos"] == ""
            and append_only["retorno"] == "trigger" and append_only["lenguaje"] == "plpgsql"
            and append_only["owner"] == owner_role and not append_only["security_definer"]
            and set(append_only["grantees_execute"] or []) == {owner_role}
            and _normalizar(append_only["cuerpo"]) == _normalizar(APPEND_ONLY_FUNCTION_BODY)
            and proteccion_auth is not None and proteccion_auth["argumentos"] == ""
            and proteccion_auth["retorno"] == "trigger" and proteccion_auth["lenguaje"] == "plpgsql"
            and proteccion_auth["owner"] == owner_role and not proteccion_auth["security_definer"]
            and set(proteccion_auth["grantees_execute"] or []) == {owner_role}
            and _normalizar(proteccion_auth["cuerpo"]) == _normalizar(auth_body)
            and _validar_admin_functions(funciones_por_nombre, owner_role, runtime_role)
            and indice is not None
            and indice["tabla"] == "permisos_rol"
            and indice["unico"] and indice["valido"]
            and indice["sin_predicado"] and indice["sin_expresiones"]
            and _normalizar(indice["definicion"]).endswith("using btree (rol, modulo)")
            and len(indices_auditoria) == 2
            and {
                row["nombre"]: list(row["columnas"])
                for row in indices_auditoria
                if row["valido"] and not row["unico"]
                and row["sin_predicado"] and row["sin_expresiones"]
            } == {
                "idx_auditoria_usuario_ts": ["usuario_id", '"timestamp"'],
                "idx_auditoria_resultado": ["resultado"],
            }
            and secuencia is not None and secuencia["owner"] == owner_role
        )
        capacidad = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT t.tableowner AS owner,
                   has_table_privilege(:runtime,
                       'public.configuracion_seguridad_runtime',
                       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS runtime_access,
                   ARRAY(
                       SELECT CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END
                       FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
                       LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
                       ORDER BY CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END
                   ) AS capability_grantees,
                   EXISTS (
                       SELECT 1
                       FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
                       WHERE acl.is_grantable AND acl.grantee <> c.relowner
                   ) AS capability_grant_option
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
            WHERE t.schemaname = 'public'
              AND t.tablename = 'configuracion_seguridad_runtime'
        """), {"runtime": runtime_role})).mappings().first()
        estructura_valida = (
            estructura_valida
            and capacidad is not None
            and capacidad["owner"] == owner_role
            and not capacidad["runtime_access"]
            and set(capacidad["capability_grantees"] or []) == {owner_role}
            and not capacidad["capability_grant_option"]
        )
        if not estructura_valida:
            raise RuntimeError("Esquema incompleto: faltan objetos estructurales requeridos")

        privilegios = (await conn.execute(text(  # @audit-ok: verificación read-only fail-fast
            """
            SELECT current_user = :runtime AS identidad_runtime,
                   session_user = :runtime AS sesion_runtime,
                    has_schema_privilege(current_user, 'public', 'CREATE') AS puede_ddl,
                   pg_has_role(current_user, :owner, 'MEMBER') AS miembro_owner,
                    has_table_privilege(current_user, 'public.modulos_sistema', 'INSERT,UPDATE,DELETE,TRUNCATE')
                    OR has_table_privilege(current_user, 'public.permisos_rol', 'INSERT,UPDATE,DELETE,TRUNCATE')
                    OR has_table_privilege(current_user, 'public.roles_sistema', 'INSERT,UPDATE,DELETE,TRUNCATE')
                   AS puede_escribir_rbac,
                   EXISTS (
                       SELECT 1 FROM pg_auth_members m
                       JOIN pg_roles member ON member.oid = m.member
                       WHERE member.rolname = current_user
                   ) AS tiene_membresias,
                   (
                       SELECT COUNT(*) = 3 AND BOOL_AND(
                           NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb
                           AND NOT rolcreaterole AND NOT rolreplication AND NOT rolinherit
                           AND CASE WHEN rolname = :owner THEN NOT rolcanlogin ELSE rolcanlogin END
                       )
                       FROM pg_roles
                       WHERE rolname = ANY(:roles)
                   ) AS roles_endurecidos,
                   (
                       SELECT COUNT(*) = 1 AND BOOL_AND(
                           parent.rolname = :owner AND member.rolname = :migrator
                       )
                       FROM pg_auth_members m
                       JOIN pg_roles parent ON parent.oid = m.roleid
                       JOIN pg_roles member ON member.oid = m.member
                       WHERE parent.rolname = ANY(:roles) OR member.rolname = ANY(:roles)
                   ) AS membresias_validas
        """), {
            "runtime": runtime_role,
            "owner": owner_role,
            "migrator": os.getenv("DATABASE_MIGRATION_ROLE", "gestor_migrador"),
            "roles": [
                owner_role,
                os.getenv("DATABASE_MIGRATION_ROLE", "gestor_migrador"),
                runtime_role,
            ],
        })).mappings().one()
        if (not privilegios["identidad_runtime"] or not privilegios["sesion_runtime"]
                or privilegios["puede_ddl"] or privilegios["miembro_owner"]
                or privilegios["puede_escribir_rbac"] or privilegios["tiene_membresias"]
                or not privilegios["roles_endurecidos"]
                or not privilegios["membresias_validas"]):
            raise RuntimeError("Privilegios runtime inválidos")
