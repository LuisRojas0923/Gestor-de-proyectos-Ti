import logging
from collections import Counter
from typing import Any, Mapping, Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY

logger = logging.getLogger(__name__)


def validar_manifiesto_rbac(
    modulos: Sequence[Mapping[str, Any]] | None = None,
) -> None:
    """Falla antes de tocar la DB si el manifiesto contiene IDs repetidos."""
    registro = SYSTEM_MODULES_REGISTRY if modulos is None else modulos
    conteos = Counter(modulo["id"] for modulo in registro)
    duplicados = sorted(modulo_id for modulo_id, total in conteos.items() if total > 1)
    if duplicados:
        raise ValueError(f"IDs RBAC duplicados: {duplicados}")


async def sincronizar_manifiesto_rbac(db: AsyncSession):
    """
    Auto-descubrimiento y sincronización de los módulos RBAC definidos
    en el manifiesto hacia la base de datos local en el arranque de FastAPI.

    Usa INSERT ... ON CONFLICT (upsert nativo PostgreSQL) para módulos y
    serializa con advisory lock el SELECT + INSERT de permisos_rol.
    """
    validar_manifiesto_rbac()
    logger.info("Iniciando Auto-Discovery de Módulos RBAC...")

    try:
        # Serializa el check+insert entre workers sin exigir una migración nueva.
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtext('rbac_manifest_sync'))")
        )

        upsert_modulo = text("""
            INSERT INTO modulos_sistema (id, nombre, categoria, descripcion, esta_activo, es_critico)
            VALUES (:id, :nombre, :categoria, :descripcion, TRUE, :es_critico)
            ON CONFLICT (id) DO UPDATE SET
                nombre      = EXCLUDED.nombre,
                categoria   = EXCLUDED.categoria,
                descripcion = COALESCE(EXCLUDED.descripcion, modulos_sistema.descripcion),
                es_critico  = EXCLUDED.es_critico,
                esta_activo = TRUE
        """)

        check_permiso = text("""
            SELECT 1 FROM permisos_rol WHERE rol = :rol AND modulo = :modulo LIMIT 1
        """)

        insert_permiso = text("""
            INSERT INTO permisos_rol (rol, modulo, permitido) VALUES (:rol, :modulo, TRUE)
        """)

        modulos_sincronizados = 0
        permisos_creados = 0

        for modulo_definido in SYSTEM_MODULES_REGISTRY:
            mod_id = modulo_definido["id"]

            # Upsert del módulo (inmune a concurrencia)
            await db.execute(
                upsert_modulo,
                {
                    "id": mod_id,
                    "nombre": modulo_definido["nombre"],
                    "categoria": modulo_definido["categoria"],
                    "descripcion": modulo_definido.get("descripcion"),
                    "es_critico": modulo_definido["es_critico"],
                },
            )
            modulos_sincronizados += 1

            # Garantizar permiso de admin (check + insert)
            existe = await db.execute(check_permiso, {"rol": "admin", "modulo": mod_id})
            if existe.first() is None:
                await db.execute(insert_permiso, {"rol": "admin", "modulo": mod_id})
                permisos_creados += 1

        await db.commit()
        logger.info(
            f"Auto-Discovery exitoso (upsert nativo PG): "
            f"{modulos_sincronizados} módulos sincronizados, "
            f"{permisos_creados} permisos de admin creados."
        )

    except Exception:
        await db.rollback()
        logger.error("Error crítico durante el Auto-Discovery RBAC")
        raise
