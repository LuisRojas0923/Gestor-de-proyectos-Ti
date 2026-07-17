#!/bin/sh
set -eu

: "${APP_SCHEMA_OWNER_ROLE:?APP_SCHEMA_OWNER_ROLE requerido}"
: "${APP_MIGRATION_ROLE:?APP_MIGRATION_ROLE requerido}"
: "${APP_MIGRATION_PASSWORD:?APP_MIGRATION_PASSWORD requerido}"
: "${APP_RUNTIME_ROLE:?APP_RUNTIME_ROLE requerido}"
: "${APP_RUNTIME_PASSWORD:?APP_RUNTIME_PASSWORD requerido}"

if [ "$APP_SCHEMA_OWNER_ROLE" = "$APP_MIGRATION_ROLE" ] || \
   [ "$APP_SCHEMA_OWNER_ROLE" = "$APP_RUNTIME_ROLE" ] || \
   [ "$APP_MIGRATION_ROLE" = "$APP_RUNTIME_ROLE" ] || \
   [ "$APP_SCHEMA_OWNER_ROLE" = "$POSTGRES_USER" ] || \
   [ "$APP_MIGRATION_ROLE" = "$POSTGRES_USER" ] || \
   [ "$APP_RUNTIME_ROLE" = "$POSTGRES_USER" ]; then
  echo "Los roles owner, migrador, runtime y bootstrap deben ser distintos" >&2
  exit 1
fi
if [ "$APP_MIGRATION_PASSWORD" = "$APP_RUNTIME_PASSWORD" ] || \
   [ "$APP_MIGRATION_PASSWORD" = "$POSTGRES_PASSWORD" ] || \
   [ "$APP_RUNTIME_PASSWORD" = "$POSTGRES_PASSWORD" ]; then
  echo "Las credenciales PostgreSQL deben ser distintas" >&2
  exit 1
fi

psql --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set bootstrap_role="$POSTGRES_USER" \
  --set owner_role="$APP_SCHEMA_OWNER_ROLE" \
  --set migration_role="$APP_MIGRATION_ROLE" \
  --set migration_password="$APP_MIGRATION_PASSWORD" \
  --set runtime_role="$APP_RUNTIME_ROLE" \
  --set runtime_password="$APP_RUNTIME_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION', :'owner_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'owner_role')
\gexec
SELECT format('ALTER ROLE %I NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION', :'owner_role')
\gexec

SELECT format('CREATE ROLE %I LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'migration_role', :'migration_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migration_role')
\gexec
SELECT format('ALTER ROLE %I LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'migration_role', :'migration_password')
\gexec

SELECT format('CREATE ROLE %I LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'runtime_role', :'runtime_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_role')
\gexec
SELECT format('ALTER ROLE %I LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'runtime_role', :'runtime_password')
\gexec

SELECT format('REVOKE %I FROM %I', parent.rolname, member.rolname)
FROM pg_auth_members membership
JOIN pg_roles parent ON parent.oid = membership.roleid
JOIN pg_roles member ON member.oid = membership.member
WHERE member.rolname IN (:'owner_role', :'runtime_role')
   OR (member.rolname = :'migration_role' AND parent.rolname <> :'owner_role')
\gexec
SELECT format('REVOKE %I FROM %I', parent.rolname, member.rolname)
FROM pg_auth_members membership
JOIN pg_roles parent ON parent.oid = membership.roleid
JOIN pg_roles member ON member.oid = membership.member
WHERE parent.rolname IN (:'owner_role', :'migration_role', :'runtime_role')
  AND NOT (parent.rolname = :'owner_role' AND member.rolname = :'migration_role')
\gexec
SELECT format('GRANT %I TO %I', :'owner_role', :'migration_role')
\gexec
SELECT format(
  'ALTER %s %I.%I OWNER TO %I',
  CASE c.relkind
    WHEN 'S' THEN 'SEQUENCE'
    WHEN 'v' THEN 'VIEW'
    WHEN 'm' THEN 'MATERIALIZED VIEW'
    ELSE 'TABLE'
  END,
  n.nspname, c.relname, :'owner_role'
)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'public'
  AND r.rolname = :'bootstrap_role'
  AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
  AND (
    c.relkind <> 'S'
    OR NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.classid = 'pg_class'::regclass
        AND d.objid = c.oid
        AND d.refclassid = 'pg_class'::regclass
        AND d.deptype IN ('a', 'i')
    )
  )
\gexec
SELECT format(
  'ALTER FUNCTION %I.%I(%s) OWNER TO %I',
  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), :'owner_role'
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public' AND r.rolname = :'bootstrap_role'
\gexec
SELECT format('ALTER SCHEMA public OWNER TO %I', :'owner_role')
\gexec
SELECT format('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'migration_role')
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'runtime_role')
\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'runtime_role')
\gexec
SQL
