"""Comandos operativos que no deben ejecutarse desde el runtime web."""
import argparse
import asyncio
import logging
import os
import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool


def obtener_url_migracion() -> str:
    """Obtiene exclusivamente la credencial destinada al job migrador."""
    url = os.getenv("MIGRATION_DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("MIGRATION_DATABASE_URL es obligatoria para ejecutar migraciones")
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def obtener_rol_owner() -> str:
    """Valida el rol owner NOLOGIN al que el migrador debe cambiar."""
    role = os.getenv("MIGRATION_SCHEMA_OWNER_ROLE", "").strip()
    if not role:
        raise RuntimeError("MIGRATION_SCHEMA_OWNER_ROLE es obligatorio")
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", role) is None:
        raise RuntimeError("MIGRATION_SCHEMA_OWNER_ROLE no es un identificador valido")
    return role


def obtener_rol_migrador() -> str:
    role = os.getenv("MIGRATION_DATABASE_ROLE", "").strip()
    if not role:
        raise RuntimeError("MIGRATION_DATABASE_ROLE es obligatorio")
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", role) is None:
        raise RuntimeError("MIGRATION_DATABASE_ROLE no es un identificador valido")
    return role


async def verificar_identidad_migrador(engine, migrator_role: str, owner_role: str) -> None:
    async with engine.connect() as conn:
        identidad = (
            await conn.execute(  # @audit-ok: el job propaga cualquier fallo
                text("""
                    SELECT
                        session_user = :migrator_role AS sesion_migrador,
                        current_user = :owner_role AS owner_activo
                """),
                {"migrator_role": migrator_role, "owner_role": owner_role},
            )
        ).mappings().one()
    if not identidad["sesion_migrador"] or not identidad["owner_activo"]:
        raise RuntimeError("La identidad PostgreSQL del job migrador no es valida")


async def ejecutar_migrate() -> None:
    """Ejecuta migraciones, seeds y sincronizacion RBAC en orden."""
    os.environ["APP_PROCESS_ROLE"] = "migrate"
    from app.models.registry import cargar_modelos
    from app.core.migrations.manager import ejecutar_migraciones

    cargar_modelos()

    owner_role = obtener_rol_owner()
    migrator_role = obtener_rol_migrador()
    connect_args = {
        "server_settings": {
            "role": owner_role,
            "search_path": "public,pg_catalog",
        }
    }
    engine = create_async_engine(
        obtener_url_migracion(),
        poolclass=NullPool,
        connect_args=connect_args,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    try:
        await verificar_identidad_migrador(engine, migrator_role, owner_role)
        await ejecutar_migraciones(engine, session_factory)
    finally:
        await engine.dispose()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Administracion del backend")
    parser.add_argument("comando", choices=("migrate",))
    args = parser.parse_args(argv)
    if args.comando == "migrate":
        try:
            asyncio.run(ejecutar_migrate())
        except Exception:
            logging.error("El job de migración falló; revise la bitácora operativa")
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
