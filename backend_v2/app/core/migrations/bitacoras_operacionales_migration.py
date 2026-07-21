"""Migracion critica e idempotente de Bitacoras Operacionales."""
import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)

BITACORA_PARENT_IMMUTABLE_BODY = """
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las bitacoras no se eliminan' USING ERRCODE = '55000';
    END IF;
    IF NEW.creado_por_id IS DISTINCT FROM OLD.creado_por_id THEN
        RAISE EXCEPTION 'El propietario de la bitacora es inmutable'
            USING ERRCODE = '55000';
    END IF;
    IF OLD.estado = 'FINALIZADA' THEN
        RAISE EXCEPTION 'La bitacora finalizada es inmutable' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
"""

BITACORA_CHILD_IMMUTABLE_BODY = """
DECLARE
    objetivo UUID;
    estado_padre TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        objetivo := OLD.bitacora_id;
    ELSE
        objetivo := NEW.bitacora_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.bitacora_id IS DISTINCT FROM NEW.bitacora_id THEN
        RAISE EXCEPTION 'No se permite cambiar la bitacora de un registro'
            USING ERRCODE = '55000';
    END IF;
    SELECT estado INTO estado_padre
    FROM public.bitacoras_operacionales
    WHERE id = objetivo
    FOR UPDATE;
    IF estado_padre = 'FINALIZADA' THEN
        RAISE EXCEPTION 'Los datos de una bitacora finalizada son inmutables'
            USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
"""

BITACORA_COMPLETE_BODY = """
BEGIN
    IF NEW.estado = 'FINALIZADA' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.bitacora_operacional_actividades
            WHERE bitacora_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'La bitacora finalizada requiere una actividad'
                USING ERRCODE = '23514';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.bitacora_operacional_fotografias
            WHERE bitacora_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'La bitacora finalizada requiere una fotografia'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
"""

BITACORA_DATE_BODY = """
BEGIN
    IF NEW.fecha_elaboracion > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date THEN
        RAISE EXCEPTION 'La fecha de elaboracion no puede ser futura'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
"""

BITACORA_FUNCTIONS = {
    "proteger_bitacora_operacional_inmutable": BITACORA_PARENT_IMMUTABLE_BODY,
    "proteger_hijo_bitacora_operacional_inmutable": BITACORA_CHILD_IMMUTABLE_BODY,
    "validar_bitacora_operacional_completa": BITACORA_COMPLETE_BODY,
    "validar_fecha_bitacora_operacional": BITACORA_DATE_BODY,
}


async def migrar_bitacoras_operacionales(conn) -> None:
    sentencias = (
        """CREATE TABLE IF NOT EXISTS public.bitacoras_operacionales (
            id UUID PRIMARY KEY,
            fecha_elaboracion DATE NOT NULL,
            orden_trabajo VARCHAR(50) NOT NULL,
            nombre_obra VARCHAR(255) NOT NULL,
            ciudad VARCHAR(120) NOT NULL,
            ingeniero_responsable VARCHAR(255) NOT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
            version INTEGER NOT NULL DEFAULT 1,
            novedades_dia TEXT,
            sin_novedad BOOLEAN NOT NULL DEFAULT FALSE,
            creado_por_id VARCHAR(50) NOT NULL REFERENCES public.usuarios(id),
            finalizado_por_id VARCHAR(50) REFERENCES public.usuarios(id),
            firma_ruta VARCHAR(500), firma_hash VARCHAR(64),
            pdf_ruta VARCHAR(500), pdf_hash VARCHAR(64),
            nombre_firmante VARCHAR(255), version_constancia VARCHAR(50),
            codigo_formato VARCHAR(30) NOT NULL,
            fecha_formato DATE NOT NULL,
            version_formato VARCHAR(20) NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            finalizado_en TIMESTAMPTZ
        )""",
        """CREATE TABLE IF NOT EXISTS public.bitacora_operacional_actividades (
            id BIGSERIAL PRIMARY KEY,
            bitacora_id UUID NOT NULL REFERENCES public.bitacoras_operacionales(id) ON DELETE RESTRICT,
            orden SMALLINT NOT NULL,
            descripcion TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS public.bitacora_operacional_fotografias (
            id UUID PRIMARY KEY,
            bitacora_id UUID NOT NULL REFERENCES public.bitacoras_operacionales(id) ON DELETE RESTRICT,
            orden SMALLINT NOT NULL,
            ruta_relativa VARCHAR(500) NOT NULL,
            nombre_original VARCHAR(255) NOT NULL,
            tipo_mime VARCHAR(100) NOT NULL,
            tamano_bytes INTEGER NOT NULL,
            ancho INTEGER NOT NULL,
            alto INTEGER NOT NULL,
            hash_sha256 VARCHAR(64) NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )""",
        "CREATE INDEX IF NOT EXISTS idx_bitacoras_propietario_fecha ON public.bitacoras_operacionales (creado_por_id, fecha_elaboracion)",
        "CREATE INDEX IF NOT EXISTS idx_bitacoras_ot_fecha ON public.bitacoras_operacionales (orden_trabajo, fecha_elaboracion)",
        "CREATE INDEX IF NOT EXISTS idx_bitacoras_estado_fecha ON public.bitacoras_operacionales (estado, fecha_elaboracion)",
        "ALTER TABLE public.bitacoras_operacionales ALTER COLUMN id SET DEFAULT gen_random_uuid()",
        "ALTER TABLE public.bitacora_operacional_fotografias ALTER COLUMN id SET DEFAULT gen_random_uuid()",
        "ALTER TABLE public.bitacoras_operacionales ALTER COLUMN estado SET DEFAULT 'BORRADOR'",
        "ALTER TABLE public.bitacoras_operacionales ALTER COLUMN version SET DEFAULT 1",
        "ALTER TABLE public.bitacoras_operacionales ALTER COLUMN sin_novedad SET DEFAULT FALSE",
        "ALTER TABLE public.bitacoras_operacionales ALTER COLUMN creado_en SET DEFAULT now()",
        "ALTER TABLE public.bitacoras_operacionales ALTER COLUMN actualizado_en SET DEFAULT now()",
        "ALTER TABLE public.bitacora_operacional_fotografias ALTER COLUMN creado_en SET DEFAULT now()",
        "ALTER TABLE public.bitacoras_operacionales DROP CONSTRAINT IF EXISTS bitacoras_operacionales_creado_por_id_fkey",
        "ALTER TABLE public.bitacoras_operacionales DROP CONSTRAINT IF EXISTS bitacoras_operacionales_finalizado_por_id_fkey",
        "ALTER TABLE public.bitacora_operacional_actividades DROP CONSTRAINT IF EXISTS bitacora_operacional_actividades_bitacora_id_fkey",
        "ALTER TABLE public.bitacora_operacional_fotografias DROP CONSTRAINT IF EXISTS bitacora_operacional_fotografias_bitacora_id_fkey",
    )
    for sentencia in sentencias:
        await conn.execute(text(sentencia))  # @audit-ok: migracion DDL fail-fast

    constraints = (
        ("bitacoras_operacionales", "ck_bitacora_estado_valido", "CHECK (estado IN ('BORRADOR', 'FINALIZADA'))"),
        ("bitacoras_operacionales", "ck_bitacora_version_positiva", "CHECK (version > 0)"),
        ("bitacoras_operacionales", "ck_bitacora_snapshots_no_vacios", "CHECK (btrim(orden_trabajo) <> '' AND btrim(nombre_obra) <> '' AND btrim(ciudad) <> '' AND btrim(ingeniero_responsable) <> '')"),
        ("bitacoras_operacionales", "ck_bitacora_novedad_no_vacia", "CHECK (novedades_dia IS NULL OR btrim(novedades_dia) <> '')"),
        ("bitacoras_operacionales", "ck_bitacora_formato_no_vacio", "CHECK (btrim(codigo_formato) <> '' AND btrim(version_formato) <> '')"),
        ("bitacoras_operacionales", "ck_bitacora_novedad_coherente", "CHECK (NOT sin_novedad OR novedades_dia IS NULL)"),
        ("bitacoras_operacionales", "ck_bitacora_hashes_sha256", "CHECK ((firma_hash IS NULL OR firma_hash ~ '^[0-9a-f]{64}$') AND (pdf_hash IS NULL OR pdf_hash ~ '^[0-9a-f]{64}$'))"),
        ("bitacoras_operacionales", "ck_bitacora_estado_artefactos", "CHECK ((estado = 'BORRADOR' AND finalizado_por_id IS NULL AND firma_ruta IS NULL AND firma_hash IS NULL AND pdf_ruta IS NULL AND pdf_hash IS NULL AND nombre_firmante IS NULL AND version_constancia IS NULL AND finalizado_en IS NULL) OR (estado = 'FINALIZADA' AND finalizado_por_id IS NOT NULL AND finalizado_por_id = creado_por_id AND firma_ruta IS NOT NULL AND firma_hash IS NOT NULL AND pdf_ruta IS NOT NULL AND pdf_hash IS NOT NULL AND nombre_firmante IS NOT NULL AND version_constancia IS NOT NULL AND btrim(firma_ruta) <> '' AND btrim(pdf_ruta) <> '' AND btrim(nombre_firmante) <> '' AND btrim(version_constancia) <> '' AND finalizado_en IS NOT NULL AND (sin_novedad OR COALESCE(btrim(novedades_dia), '') <> '')))"),
        ("bitacoras_operacionales", "fk_bitacora_creador", "FOREIGN KEY (creado_por_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT"),
        ("bitacoras_operacionales", "fk_bitacora_finalizador", "FOREIGN KEY (finalizado_por_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT"),
        ("bitacora_operacional_actividades", "ck_bitacora_actividad_orden_positivo", "CHECK (orden > 0)"),
        ("bitacora_operacional_actividades", "ck_bitacora_actividad_descripcion_no_vacia", "CHECK (btrim(descripcion) <> '')"),
        ("bitacora_operacional_actividades", "uq_bitacora_actividad_orden", "UNIQUE (bitacora_id, orden) DEFERRABLE INITIALLY DEFERRED"),
        ("bitacora_operacional_actividades", "fk_bitacora_actividad_padre", "FOREIGN KEY (bitacora_id) REFERENCES public.bitacoras_operacionales(id) ON DELETE RESTRICT"),
        ("bitacora_operacional_fotografias", "ck_bitacora_fotografia_orden_positivo", "CHECK (orden > 0)"),
        ("bitacora_operacional_fotografias", "ck_bitacora_fotografia_dimensiones_positivas", "CHECK (tamano_bytes > 0 AND ancho > 0 AND alto > 0)"),
        ("bitacora_operacional_fotografias", "ck_bitacora_fotografia_metadatos_no_vacios", "CHECK (btrim(ruta_relativa) <> '' AND btrim(nombre_original) <> '' AND btrim(tipo_mime) <> '')"),
        ("bitacora_operacional_fotografias", "ck_bitacora_fotografia_hash_sha256", "CHECK (hash_sha256 ~ '^[0-9a-f]{64}$')"),
        ("bitacora_operacional_fotografias", "uq_bitacora_fotografia_orden", "UNIQUE (bitacora_id, orden) DEFERRABLE INITIALLY DEFERRED"),
        ("bitacora_operacional_fotografias", "uq_bitacora_fotografia_ruta", "UNIQUE (ruta_relativa)"),
        ("bitacora_operacional_fotografias", "fk_bitacora_fotografia_padre", "FOREIGN KEY (bitacora_id) REFERENCES public.bitacoras_operacionales(id) ON DELETE RESTRICT"),
    )
    for tabla, nombre, definicion in constraints:
        await conn.execute(  # @audit-ok: migracion DDL fail-fast
            text(f"ALTER TABLE public.{tabla} DROP CONSTRAINT IF EXISTS {nombre}")
        )
        await conn.execute(  # @audit-ok: migracion DDL fail-fast
            text(f"ALTER TABLE public.{tabla} ADD CONSTRAINT {nombre} {definicion}")
        )

    for nombre, cuerpo in BITACORA_FUNCTIONS.items():
        await conn.execute(  # @audit-ok: migracion DDL fail-fast
            text(f"""
                CREATE OR REPLACE FUNCTION public.{nombre}() RETURNS trigger AS $$
                    {cuerpo}
                $$ LANGUAGE plpgsql
            """)
        )
        await conn.execute(  # @audit-ok: migracion DDL fail-fast
            text(f"REVOKE ALL ON FUNCTION public.{nombre}() FROM PUBLIC")
        )

    triggers = (
        ("bitacoras_operacionales", "trg_bitacora_operacional_inmutable", "BEFORE UPDATE OR DELETE", "proteger_bitacora_operacional_inmutable", ""),
        ("bitacora_operacional_actividades", "trg_bitacora_actividad_inmutable", "BEFORE INSERT OR UPDATE OR DELETE", "proteger_hijo_bitacora_operacional_inmutable", ""),
        ("bitacora_operacional_fotografias", "trg_bitacora_fotografia_inmutable", "BEFORE INSERT OR UPDATE OR DELETE", "proteger_hijo_bitacora_operacional_inmutable", ""),
        ("bitacoras_operacionales", "trg_bitacora_operacional_completa", "AFTER INSERT OR UPDATE", "validar_bitacora_operacional_completa", "DEFERRABLE INITIALLY DEFERRED"),
        ("bitacoras_operacionales", "trg_bitacora_fecha_bogota", "BEFORE INSERT OR UPDATE", "validar_fecha_bitacora_operacional", ""),
    )
    for tabla, nombre, evento, funcion, constraint in triggers:
        await conn.execute(  # @audit-ok: migracion DDL fail-fast
            text(f"DROP TRIGGER IF EXISTS {nombre} ON public.{tabla}")
        )
        prefijo = "CREATE CONSTRAINT TRIGGER" if constraint else "CREATE TRIGGER"
        await conn.execute(  # @audit-ok: migracion DDL fail-fast
            text(
                f"{prefijo} {nombre} {evento} ON public.{tabla} "
                f"{constraint} FOR EACH ROW EXECUTE FUNCTION public.{funcion}()"
            )
        )
    logger.info("Migracion critica de Bitacoras Operacionales aplicada")
