"""Contrato fisico verificable de Bitacoras Operacionales."""
import re

from sqlalchemy import text


TABLAS_BITACORAS = (
    "bitacoras_operacionales",
    "bitacora_operacional_actividades",
    "bitacora_operacional_fotografias",
)

# tipo information_schema, longitud, nullable, default PostgreSQL
COLUMNAS_BITACORAS = {
    "bitacoras_operacionales": {
        "id": ("uuid", None, False, "gen_random_uuid()"),
        "fecha_elaboracion": ("date", None, False, None),
        "orden_trabajo": ("character varying", 50, False, None),
        "nombre_obra": ("character varying", 255, False, None),
        "ciudad": ("character varying", 120, False, None),
        "ingeniero_responsable": ("character varying", 255, False, None),
        "estado": ("character varying", 20, False, "'BORRADOR'::character varying"),
        "version": ("integer", None, False, "1"),
        "novedades_dia": ("text", None, True, None),
        "sin_novedad": ("boolean", None, False, "false"),
        "creado_por_id": ("character varying", 50, False, None),
        "finalizado_por_id": ("character varying", 50, True, None),
        "firma_ruta": ("character varying", 500, True, None),
        "firma_hash": ("character varying", 64, True, None),
        "pdf_ruta": ("character varying", 500, True, None),
        "pdf_hash": ("character varying", 64, True, None),
        "nombre_firmante": ("character varying", 255, True, None),
        "version_constancia": ("character varying", 50, True, None),
        "codigo_formato": ("character varying", 30, False, None),
        "fecha_formato": ("date", None, False, None),
        "version_formato": ("character varying", 20, False, None),
        "creado_en": ("timestamp with time zone", None, False, "now()"),
        "actualizado_en": ("timestamp with time zone", None, False, "now()"),
        "finalizado_en": ("timestamp with time zone", None, True, None),
    },
    "bitacora_operacional_actividades": {
        "id": (
            "bigint", None, False,
            "nextval('bitacora_operacional_actividades_id_seq'::regclass)",
        ),
        "bitacora_id": ("uuid", None, False, None),
        "orden": ("smallint", None, False, None),
        "descripcion": ("text", None, False, None),
    },
    "bitacora_operacional_fotografias": {
        "id": ("uuid", None, False, "gen_random_uuid()"),
        "bitacora_id": ("uuid", None, False, None),
        "orden": ("smallint", None, False, None),
        "ruta_relativa": ("character varying", 500, False, None),
        "nombre_original": ("character varying", 255, False, None),
        "tipo_mime": ("character varying", 100, False, None),
        "tamano_bytes": ("integer", None, False, None),
        "ancho": ("integer", None, False, None),
        "alto": ("integer", None, False, None),
        "hash_sha256": ("character varying", 64, False, None),
        "creado_en": ("timestamp with time zone", None, False, "now()"),
    },
}

CONSTRAINTS_BITACORAS = {
    "bitacoras_operacionales_pkey": ("bitacoras_operacionales", ("primary key (id)",)),
    "bitacora_operacional_actividades_pkey": (
        "bitacora_operacional_actividades", ("primary key (id)",),
    ),
    "bitacora_operacional_fotografias_pkey": (
        "bitacora_operacional_fotografias", ("primary key (id)",),
    ),
    "fk_bitacora_creador": (
        "bitacoras_operacionales",
        ("foreign key (creado_por_id)", "references usuarios(id)", "on delete restrict"),
    ),
    "fk_bitacora_finalizador": (
        "bitacoras_operacionales",
        ("foreign key (finalizado_por_id)", "references usuarios(id)", "on delete restrict"),
    ),
    "fk_bitacora_actividad_padre": (
        "bitacora_operacional_actividades",
        ("foreign key (bitacora_id)", "references bitacoras_operacionales(id)", "on delete restrict"),
    ),
    "fk_bitacora_fotografia_padre": (
        "bitacora_operacional_fotografias",
        ("foreign key (bitacora_id)", "references bitacoras_operacionales(id)", "on delete restrict"),
    ),
    "ck_bitacora_estado_valido": ("bitacoras_operacionales", ("borrador", "finalizada")),
    "ck_bitacora_version_positiva": ("bitacoras_operacionales", ("version > 0",)),
    "ck_bitacora_snapshots_no_vacios": (
        "bitacoras_operacionales", ("orden_trabajo", "nombre_obra", "ciudad", "ingeniero_responsable"),
    ),
    "ck_bitacora_novedad_no_vacia": ("bitacoras_operacionales", ("novedades_dia is null", "btrim(novedades_dia)")),
    "ck_bitacora_formato_no_vacio": ("bitacoras_operacionales", ("btrim((codigo_formato)", "btrim((version_formato)")),
    "ck_bitacora_novedad_coherente": ("bitacoras_operacionales", ("not sin_novedad", "novedades_dia is null")),
    "ck_bitacora_hashes_sha256": ("bitacoras_operacionales", ("firma_hash", "pdf_hash", "^[0-9a-f]{64}$")),
    "ck_bitacora_estado_artefactos": (
        "bitacoras_operacionales",
        ("finalizado_por_id", "firma_ruta", "pdf_ruta", "nombre_firmante", "version_constancia", "btrim"),
    ),
    "ck_bitacora_actividad_orden_positivo": ("bitacora_operacional_actividades", ("orden > 0",)),
    "ck_bitacora_actividad_descripcion_no_vacia": ("bitacora_operacional_actividades", ("btrim(descripcion)",)),
    "uq_bitacora_actividad_orden": ("bitacora_operacional_actividades", ("unique (bitacora_id, orden)", "deferrable initially deferred")),
    "ck_bitacora_fotografia_orden_positivo": ("bitacora_operacional_fotografias", ("orden > 0",)),
    "ck_bitacora_fotografia_dimensiones_positivas": ("bitacora_operacional_fotografias", ("tamano_bytes > 0", "ancho > 0", "alto > 0")),
    "ck_bitacora_fotografia_metadatos_no_vacios": ("bitacora_operacional_fotografias", ("ruta_relativa", "nombre_original", "tipo_mime", "btrim")),
    "ck_bitacora_fotografia_hash_sha256": ("bitacora_operacional_fotografias", ("hash_sha256", "^[0-9a-f]{64}$")),
    "uq_bitacora_fotografia_orden": ("bitacora_operacional_fotografias", ("unique (bitacora_id, orden)", "deferrable initially deferred")),
    "uq_bitacora_fotografia_ruta": ("bitacora_operacional_fotografias", ("unique (ruta_relativa)",)),
    "trg_bitacora_operacional_completa": (
        "bitacoras_operacionales", ("trigger deferrable initially deferred",),
    ),
}


def _normalizar(valor: str | None) -> str | None:
    return re.sub(r"\s+", " ", valor).strip().lower() if valor is not None else None


def _normalizar_default(valor: str | None) -> str | None:
    normalizado = _normalizar(valor)
    if normalizado == "public.gen_random_uuid()":
        return "gen_random_uuid()"
    return normalizado


async def validar_estructura_bitacoras(conn, owner_role: str, runtime_role: str) -> bool:
    columnas = (await conn.execute(text(  # @audit-ok: verificacion read-only
        """
        SELECT table_name, column_name, data_type, character_maximum_length,
               is_nullable = 'YES' AS nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY(:tablas)
        """
    ), {"tablas": list(TABLAS_BITACORAS)})).mappings().all()
    actuales = {
        (row["table_name"], row["column_name"]): (
            row["data_type"], row["character_maximum_length"], row["nullable"],
            _normalizar_default(row["column_default"]),
        )
        for row in columnas
    }
    esperadas = {
        (tabla, columna): (tipo, longitud, nullable, _normalizar_default(default))
        for tabla, definiciones in COLUMNAS_BITACORAS.items()
        for columna, (tipo, longitud, nullable, default) in definiciones.items()
    }
    if actuales != esperadas:
        return False

    constraints = (await conn.execute(text(  # @audit-ok: verificacion read-only
        """
        SELECT c.conname AS nombre, t.relname AS tabla,
               pg_get_constraintdef(c.oid) AS definicion, c.convalidated AS validado
        FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' AND t.relname = ANY(:tablas)
        """
    ), {"tablas": list(TABLAS_BITACORAS)})).mappings().all()
    por_nombre = {row["nombre"]: row for row in constraints}
    if set(por_nombre) != set(CONSTRAINTS_BITACORAS):
        return False
    for nombre, (tabla, fragmentos) in CONSTRAINTS_BITACORAS.items():
        row = por_nombre[nombre]
        definicion = _normalizar(row["definicion"])
        if row["tabla"] != tabla or not row["validado"]:
            return False
        if "or true" in definicion or "and false" in definicion:
            return False
        if not all(_normalizar(fragmento) in definicion for fragmento in fragmentos):
            return False

    objetos = (await conn.execute(text(  # @audit-ok: verificacion read-only
        """
        SELECT c.relname AS nombre, c.relkind AS tipo, r.rolname AS owner,
               CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
               acl.privilege_type AS privilegio, acl.is_grantable AS grantable
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles r ON r.oid = c.relowner
        CROSS JOIN LATERAL aclexplode(
            CASE WHEN c.relkind = 'S'
                THEN COALESCE(c.relacl, acldefault('S', c.relowner))
                ELSE COALESCE(c.relacl, acldefault('r', c.relowner))
            END
        ) acl
        LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
        WHERE n.nspname = 'public' AND c.relname = ANY(:objetos)
        """
    ), {"objetos": [*TABLAS_BITACORAS, "bitacora_operacional_actividades_id_seq"]})).mappings().all()
    por_objeto = {}
    for row in objetos:
        por_objeto.setdefault(row["nombre"], []).append(row)
    if set(por_objeto) != {*TABLAS_BITACORAS, "bitacora_operacional_actividades_id_seq"}:
        return False
    serial = (await conn.execute(text(  # @audit-ok: verificacion read-only
        "SELECT pg_get_serial_sequence('public.bitacora_operacional_actividades', 'id')"
    ))).scalar_one_or_none()
    if serial != "public.bitacora_operacional_actividades_id_seq":
        return False
    for nombre, rows in por_objeto.items():
        if {row["owner"] for row in rows} != {owner_role}:
            return False
        if any(row["grantee"] not in {owner_role, runtime_role} for row in rows):
            return False
        runtime = {row["privilegio"] for row in rows if row["grantee"] == runtime_role}
        esperados = {"SELECT", "USAGE"} if nombre.endswith("_seq") else {"SELECT", "INSERT", "UPDATE", "DELETE"}
        if runtime != esperados:
            return False
        if any(row["grantable"] and row["grantee"] != owner_role for row in rows):
            return False
    return True
