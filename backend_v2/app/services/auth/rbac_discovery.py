import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY

logger = logging.getLogger(__name__)

PERMISOS_HE_GRANULARES = (
    "nomina_horas_extras.leer",
    "nomina_horas_extras.planificar",
    "nomina_horas_extras.confirmar",
    "nomina_horas_extras.compensar",
    "nomina_horas_extras.admin",
)


async def verificar_manifiesto_rbac(db: AsyncSession):
    """Valida módulos y permisos admin sin modificar la base de datos."""
    modulos_requeridos = {modulo["id"] for modulo in SYSTEM_MODULES_REGISTRY}
    modulos_result = await db.execute(
        text("""
            SELECT id
            FROM modulos_sistema
            WHERE id = ANY(:modulos)
        """),
        {"modulos": sorted(modulos_requeridos)},
    )
    modulos_existentes = set(modulos_result.scalars().all())

    permisos_result = await db.execute(
        text("""
            SELECT modulo
            FROM permisos_rol
            WHERE rol = 'admin' AND permitido = TRUE AND modulo = ANY(:modulos)
        """),
        {"modulos": sorted(modulos_requeridos)},
    )
    permisos_admin = set(permisos_result.scalars().all())
    faltantes = (
        (modulos_requeridos - modulos_existentes)
        | (modulos_requeridos - permisos_admin)
    )
    if faltantes:
        raise RuntimeError("RBAC incompleto: faltan módulos o permisos requeridos")


async def sincronizar_manifiesto_rbac(db: AsyncSession):
    """
    Auto-descubrimiento y sincronización de los módulos RBAC definidos
    en el manifiesto, ejecutada exclusivamente por el job migrador.

    Usa UPSERT nativo PostgreSQL bajo el advisory lock del job migrador.
    Conserva el estado de activación elegido por el administrador.
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
                es_critico  = EXCLUDED.es_critico
        """)

        upsert_permiso = text("""
            INSERT INTO permisos_rol (rol, modulo, permitido)
            VALUES (:rol, :modulo, TRUE)
            ON CONFLICT (rol, modulo) DO UPDATE SET permitido = TRUE
        """)

        roles_con_he_legacy = text("""
            SELECT DISTINCT rol
            FROM permisos_rol
            WHERE modulo = 'nomina_horas_extras' AND permitido = TRUE
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

            await db.execute(upsert_permiso, {"rol": "admin", "modulo": mod_id})
            permisos_reparados += 1

        permisos_he_migrados = 0
        roles_legacy = (await db.execute(roles_con_he_legacy)).scalars().all()
        for rol in roles_legacy:
            for modulo in PERMISOS_HE_GRANULARES:
                await db.execute(upsert_permiso, {"rol": rol, "modulo": modulo})
                permisos_he_migrados += 1

        await db.commit()
        logger.info(
            f"Auto-Discovery exitoso (upsert nativo PG): "
            f"{modulos_sincronizados} módulos sincronizados, "
            f"{permisos_reparados} permisos de admin reparados, "
            f"{permisos_he_migrados} permisos HE granulares migrados."
        )

    except Exception:
        await db.rollback()
        logger.error("Error crítico durante el Auto-Discovery RBAC")
        raise
