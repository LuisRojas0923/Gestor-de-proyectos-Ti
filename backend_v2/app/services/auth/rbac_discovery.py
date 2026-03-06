import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY

logger = logging.getLogger(__name__)


async def sincronizar_manifiesto_rbac(db: AsyncSession):
    """
    Auto-descubrimiento y sincronización de los módulos RBAC definidos
    en el manifiesto hacia la base de datos local en el arranque de FastAPI.

    Usa INSERT ... ON CONFLICT (upsert nativo PostgreSQL) para módulos,
    y SELECT + INSERT para permisos (sin constraint único en permisos_rol).
    100% inmune a colisiones entre workers concurrentes de Uvicorn.
    """
    logger.info("Iniciando Auto-Discovery de Módulos RBAC...")

    try:
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
        permisos_reparados = 0

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
                permisos_reparados += 1

        await db.commit()
        logger.info(
            f"Auto-Discovery exitoso (upsert nativo PG): "
            f"{modulos_sincronizados} módulos sincronizados, "
            f"{permisos_reparados} permisos de admin reparados."
        )

    except Exception as e:
        await db.rollback()
        logger.error(f"Error crítico durante el Auto-Discovery RBAC: {e}")
