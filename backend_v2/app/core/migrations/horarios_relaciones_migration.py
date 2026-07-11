"""Migracion critica e idempotente para plantillas y alcance de empleados."""
import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)


async def migrar_horarios_relaciones(conn) -> None:
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
        """CREATE OR REPLACE FUNCTION rechazar_mutacion_append_only() RETURNS trigger AS $$
            BEGIN RAISE EXCEPTION 'La tabla % es append-only', TG_TABLE_NAME USING ERRCODE = '55000'; END;
        $$ LANGUAGE plpgsql""",
    )
    for sentencia in sentencias:
        try:
            await conn.execute(text(sentencia))
        except Exception:
            logger.exception(
                "Fallo ejecutando DDL base de migracion horarios-relaciones: %.120s",
                sentencia,
            )
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
            await conn.execute(text(f"""DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conrelid = '{tabla}'::regclass AND conname = '{nombre}'
                ) THEN
                    ALTER TABLE {tabla} ADD CONSTRAINT {nombre} {definicion};
                END IF;
            END $$"""))
        except Exception:
            logger.exception(
                "Fallo creando constraint critica %s en %s", nombre, tabla
            )
            raise

    for tabla in (
        "nomina_plantillas_horario_historial",
        "nomina_aplicaciones_plantilla_horario",
        "nomina_aplicaciones_plantilla_empleados",
        "historial_relaciones_gestor_empleado",
    ):
        try:
            await conn.execute(text(f"""DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_{tabla}_append_only') THEN
                    CREATE TRIGGER trg_{tabla}_append_only BEFORE UPDATE OR DELETE ON {tabla}
                    FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_append_only();
                END IF;
            END $$"""))
        except Exception:
            logger.exception("Fallo creando trigger append-only critico en %s", tabla)
            raise
    logger.info("Migracion critica de horarios y relaciones aplicada")
