import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY
from app.models.auth.usuario import ModuloSistema, PermisoRol

logger = logging.getLogger(__name__)


async def sincronizar_manifiesto_rbac(db: AsyncSession):
    """
    Auto-descubrimiento y sincronización de los módulos RBAC definidos
    en el manifiesto hacia la base de datos local en el arranque de FastAPI.
    """
    logger.info("Iniciando Auto-Discovery de Módulos RBAC...")

    try:
        # Obtenemos todos los módulos que ya existen en la DB actual
        stmt = select(ModuloSistema)
        result = await db.execute(stmt)
        modulos_existentes = {m.id for m in result.scalars().all()}

        # Obtenemos todos los permisos del rol 'admin' existentes
        stmt_permisos = select(PermisoRol).where(PermisoRol.rol == "admin")
        result_permisos = await db.execute(stmt_permisos)
        permisos_admin_existentes = {p.modulo for p in result_permisos.scalars().all()}

        nuevos_insertados = 0
        permisos_admin_reparados = 0

        # Iteramos sobre la SSOT (Manifiesto) para agregar los faltantes
        for modulo_definido in SYSTEM_MODULES_REGISTRY:
            mod_id = modulo_definido["id"]

            if mod_id not in modulos_existentes:
                logger.info(
                    f"Nuevo módulo detectado en el código: '{mod_id}'. Registrando en DB..."
                )

                # Crear el nuevo Módulo en la DB
                nuevo_mod = ModuloSistema(
                    id=mod_id,
                    nombre=modulo_definido["nombre"],
                    categoria=modulo_definido["categoria"],
                    descripcion=modulo_definido["descripcion"],
                    es_critico=modulo_definido["es_critico"],
                    esta_activo=True,
                )
                db.add(nuevo_mod)
                nuevos_insertados += 1

            # Garantizar que el rol "admin" SIEMPRE tenga permiso para los módulos del manifiesto
            if mod_id not in permisos_admin_existentes:
                logger.info(
                    f"Asignando permiso huérfano a 'admin' para el módulo: '{mod_id}'"
                )
                permiso_admin = PermisoRol(rol="admin", modulo=mod_id, permitido=True)
                db.add(permiso_admin)
                permisos_admin_reparados += 1

        if nuevos_insertados > 0 or permisos_admin_reparados > 0:
            try:
                await db.commit()
                logger.info(
                    f"Auto-Discovery exitoso: {nuevos_insertados} módulos nuevos, {permisos_admin_reparados} permisos de admin recuperados/asignados."
                )
            except Exception as commit_error:
                await db.rollback()
                logger.warning(
                    f"Error de concurrencia al guardar manifiesto RBAC (ignorado, otro worker lo insertó): {commit_error}"
                )
        else:
            logger.info(
                "Auto-Discovery finalizado: Ningún módulo nuevo detectado. DB está al día."
            )

    except Exception as e:
        await db.rollback()
        logger.error(f"Error crítico durante el Auto-Discovery RBAC: {e}")
