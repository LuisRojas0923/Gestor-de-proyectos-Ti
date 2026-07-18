"""Migracion critica e idempotente para plantillas y alcance de empleados."""
import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)

APPEND_ONLY_FUNCTION_BODY = """
BEGIN
    RAISE EXCEPTION 'La tabla % es append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
"""


async def migrar_horarios_relaciones(conn) -> None:
    await conn.execute(text(  # @audit-ok: el job propaga cualquier fallo
        """
        DO $drop$ DECLARE signature text;
        BEGIN
            FOR signature IN
                SELECT p.oid::regprocedure::text FROM pg_proc p
                WHERE p.pronamespace = 'public'::regnamespace
                  AND p.proname = 'rechazar_mutacion_append_only'
            LOOP EXECUTE 'DROP FUNCTION ' || signature || ' CASCADE'; END LOOP;
        END $drop$;
    """))
    sentencias = (
        "ALTER TABLE nomina_horario_pactado_dia ADD COLUMN IF NOT EXISTS cruza_medianoche BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE nomina_calculo_diario_detalle ADD COLUMN IF NOT EXISTS cruza_medianoche BOOLEAN NOT NULL DEFAULT FALSE",
        """CREATE TABLE IF NOT EXISTS nomina_plantillas_horario (
            id UUID PRIMARY KEY, nombre VARCHAR(120) NOT NULL,
            descripcion VARCHAR(500), version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
            esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
            creado_por_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            actualizado_por_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )""",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_plantilla_nombre_activa ON nomina_plantillas_horario (lower(btrim(nombre))) WHERE esta_activa",
        """CREATE TABLE IF NOT EXISTS nomina_plantillas_horario_dias (
            plantilla_id UUID NOT NULL REFERENCES nomina_plantillas_horario(id) ON DELETE RESTRICT,
            dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
            hora_entrada TIME, hora_salida TIME,
            minutos_almuerzo SMALLINT NOT NULL DEFAULT 0 CHECK (minutos_almuerzo BETWEEN 0 AND 240),
            cruza_medianoche BOOLEAN NOT NULL DEFAULT FALSE,
            PRIMARY KEY (plantilla_id, dia_semana),
            CHECK ((hora_entrada IS NULL) = (hora_salida IS NULL))
        )""",
        """CREATE TABLE IF NOT EXISTS nomina_plantillas_horario_historial (
            id UUID PRIMARY KEY, plantilla_id UUID NOT NULL REFERENCES nomina_plantillas_horario(id) ON DELETE RESTRICT,
            accion VARCHAR(30) NOT NULL, version INTEGER NOT NULL,
            actor_usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id), snapshot JSONB NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )""",
        """CREATE TABLE IF NOT EXISTS operaciones_idempotentes (
            solicitud_id UUID NOT NULL, tipo_operacion VARCHAR(50) NOT NULL,
            actor_usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id), recurso_objetivo VARCHAR(150) NOT NULL,
            payload_hash VARCHAR(64) NOT NULL, estado VARCHAR(20) NOT NULL,
            resultado JSONB, creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), finalizado_en TIMESTAMPTZ,
            PRIMARY KEY (solicitud_id, tipo_operacion)
        )""",
        """CREATE TABLE IF NOT EXISTS nomina_aplicaciones_plantilla_horario (
            id UUID PRIMARY KEY, solicitud_id UUID NOT NULL,
            plantilla_id UUID NOT NULL REFERENCES nomina_plantillas_horario(id) ON DELETE RESTRICT,
            plantilla_version INTEGER NOT NULL, plantilla_nombre VARCHAR(120) NOT NULL,
            actor_usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id), cantidad_empleados INTEGER NOT NULL,
            estado VARCHAR(20) NOT NULL, creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (solicitud_id, plantilla_id)
        )""",
        """CREATE TABLE IF NOT EXISTS nomina_aplicaciones_plantilla_empleados (
            aplicacion_id UUID NOT NULL REFERENCES nomina_aplicaciones_plantilla_horario(id) ON DELETE RESTRICT,
            empleado_cedula VARCHAR(50) NOT NULL, snapshot_anterior JSONB NOT NULL,
            snapshot_aplicado JSONB NOT NULL, estado VARCHAR(20) NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (aplicacion_id, empleado_cedula)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_aplicacion_empleado_cedula ON nomina_aplicaciones_plantilla_empleados (empleado_cedula)",
        """CREATE TABLE IF NOT EXISTS relaciones_gestor_empleado (
            id UUID PRIMARY KEY, gestor_usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            empleado_cedula VARCHAR(50) NOT NULL, esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
            creado_por_id VARCHAR(50) NOT NULL REFERENCES usuarios(id), actualizado_por_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (gestor_usuario_id, empleado_cedula)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_rel_gestor_activa ON relaciones_gestor_empleado (gestor_usuario_id, esta_activa)",
        "CREATE INDEX IF NOT EXISTS idx_rel_empleado_activa ON relaciones_gestor_empleado (empleado_cedula, esta_activa)",
        """CREATE TABLE IF NOT EXISTS historial_relaciones_gestor_empleado (
            id UUID PRIMARY KEY, relacion_id UUID NOT NULL REFERENCES relaciones_gestor_empleado(id) ON DELETE RESTRICT,
            actor_usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id), accion VARCHAR(20) NOT NULL,
            estado_anterior BOOLEAN NOT NULL, estado_nuevo BOOLEAN NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )""",
        f"""CREATE FUNCTION public.rechazar_mutacion_append_only() RETURNS trigger AS $$
            {APPEND_ONLY_FUNCTION_BODY}
        $$ LANGUAGE plpgsql""",
        "REVOKE ALL ON FUNCTION public.rechazar_mutacion_append_only() FROM PUBLIC",
    )
    for sentencia in sentencias:
        try:
            await conn.execute(text(sentencia))
        except Exception:
            logger.error("Fallo ejecutando DDL base de migracion horarios-relaciones")
            raise

    constraints = (
        (
            "nomina_plantillas_horario", "ck_plantilla_version_positiva",
            "CHECK (version > 0)",
        ),
        (
            "nomina_plantillas_horario_dias", "ck_plantilla_dia_rango",
            "CHECK (dia_semana BETWEEN 1 AND 7)",
        ),
        (
            "nomina_plantillas_horario_dias", "ck_plantilla_almuerzo_rango",
            "CHECK (minutos_almuerzo BETWEEN 0 AND 240)",
        ),
        (
            "nomina_plantillas_horario_dias", "ck_plantilla_horas_par",
            "CHECK ((hora_entrada IS NULL) = (hora_salida IS NULL))",
        ),
        (
            "nomina_aplicaciones_plantilla_horario",
            "uq_aplicacion_solicitud_plantilla",
            "UNIQUE (solicitud_id, plantilla_id)",
        ),
        (
            "relaciones_gestor_empleado", "uq_relacion_gestor_empleado",
            "UNIQUE (gestor_usuario_id, empleado_cedula)",
        ),
    )
    for tabla, nombre, definicion in constraints:
        try:
            await conn.execute(text(
                f"ALTER TABLE {tabla} DROP CONSTRAINT IF EXISTS {nombre}"
            ))
            await conn.execute(text(
                f"ALTER TABLE {tabla} ADD CONSTRAINT {nombre} {definicion}"
            ))
        except Exception:
            logger.error("Fallo creando constraint critica de horarios-relaciones")
            raise

    for tabla in (
        "nomina_plantillas_horario_historial",
        "nomina_aplicaciones_plantilla_horario",
        "nomina_aplicaciones_plantilla_empleados",
        "historial_relaciones_gestor_empleado",
    ):
        try:
            await conn.execute(text(
                f"DROP TRIGGER IF EXISTS trg_{tabla}_append_only ON {tabla}"
            ))
            await conn.execute(text(f"""
                CREATE TRIGGER trg_{tabla}_append_only
                BEFORE UPDATE OR DELETE ON {tabla}
                FOR EACH ROW EXECUTE FUNCTION public.rechazar_mutacion_append_only()
            """))
        except Exception:
            logger.error("Fallo creando trigger append-only critico")
            raise
    logger.info("Migracion critica de horarios y relaciones aplicada")
