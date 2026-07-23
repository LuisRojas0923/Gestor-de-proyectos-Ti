"""Blindaje idempotente de la identidad de archivos de nómina."""

from sqlalchemy import text


_CONSTRAINT_EXISTE = text("""
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_nomina_archivo_identidad_periodo'
          AND conrelid = 'nomina_archivos'::regclass
    )
""")


async def asegurar_identidad_archivo_nomina(conn) -> None:
    """Consolida duplicados y garantiza una metadata por archivo y período."""
    resultado = await conn.execute(_CONSTRAINT_EXISTE)
    if resultado.scalar_one():
        return

    await conn.execute(text("""
        SELECT pg_advisory_xact_lock(
            hashtextextended('migration:uq_nomina_archivo_identidad_periodo', 0)
        )
    """))
    resultado = await conn.execute(_CONSTRAINT_EXISTE)
    if resultado.scalar_one():
        return

    await conn.execute(text("SET LOCAL lock_timeout = '5s'"))
    await conn.execute(text("""
        LOCK TABLE nomina_archivos IN SHARE ROW EXCLUSIVE MODE
    """))
    for tabla in ("nomina_registros_crudos", "nomina_registros_normalizados"):
        await conn.execute(text(f"""
            WITH identidades AS (
                SELECT
                    id,
                    FIRST_VALUE(id) OVER (
                        PARTITION BY hash_archivo, subcategoria, mes_fact, año_fact
                        ORDER BY id DESC
                    ) AS id_conservado
                FROM nomina_archivos
            )
            UPDATE {tabla} registro
            SET archivo_id = identidad.id_conservado
            FROM identidades identidad
            WHERE registro.archivo_id = identidad.id
              AND identidad.id <> identidad.id_conservado
        """))
    await conn.execute(text("""
        DELETE FROM nomina_archivos duplicado
        USING nomina_archivos conservado
        WHERE duplicado.hash_archivo = conservado.hash_archivo
          AND duplicado.subcategoria = conservado.subcategoria
          AND duplicado.mes_fact = conservado.mes_fact
          AND duplicado.año_fact = conservado.año_fact
          AND duplicado.id < conservado.id
    """))
    await conn.execute(text("""
        ALTER TABLE nomina_archivos
        ADD CONSTRAINT uq_nomina_archivo_identidad_periodo
        UNIQUE (hash_archivo, subcategoria, mes_fact, año_fact)
    """))
