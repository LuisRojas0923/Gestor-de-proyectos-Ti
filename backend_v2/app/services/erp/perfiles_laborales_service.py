import asyncio
import logging
from typing import Iterable

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import text

from app.config import config
from app.database import SessionErpLectura
from app.models.auth.sincronizacion_perfil import (
    EstadoPerfilERP,
    PerfilLaboralERP,
    ResultadoPerfilERP,
)


logger = logging.getLogger(__name__)


_CONSULTA_PERFILES = text("""
    SELECT
        E.nrocedula::text AS cedula,
        E.nombre::text AS nombre,
        E.viaticante,
        E.baseviaticos,
        E.correocorporativo::text AS correo,
        CA.cargo::text AS cargo,
        CA.area::text AS area,
        CA.ciudadcontratacion::text AS sede,
        CA.centrocosto::text AS centrocosto,
        COALESCE(CA.cantidad_activos, 0)::int AS cantidad_activos
    FROM establecimiento E
    LEFT JOIN LATERAL (
        SELECT
            C.cargo,
            C.area,
            C.ciudadcontratacion,
            C.centrocosto,
            COUNT(*) OVER () AS cantidad_activos
        FROM contrato C
        WHERE TRIM(CAST(C.establecimiento AS TEXT)) =
              TRIM(CAST(E.nrocedula AS TEXT))
          AND C.estado = 'Activo'
        ORDER BY C.fechainicio DESC NULLS LAST,
                 C.numerocontrato DESC NULLS LAST
        LIMIT 1
    ) CA ON TRUE
    WHERE TRIM(CAST(E.nrocedula AS TEXT)) = ANY(:cedulas)
""")


def _normalizar_cedulas(cedulas: Iterable[str]) -> list[str]:
    normalizadas = list(dict.fromkeys(str(c).strip() for c in cedulas if str(c).strip()))
    if len(normalizadas) > 100:
        raise ValueError("El lote ERP no puede superar 100 usuarios")
    return normalizadas


def consultar_perfiles_laborales_worker(
    cedulas: list[str],
    *,
    timeout_ms: int = 15_000,
) -> dict[str, ResultadoPerfilERP]:
    cedulas = _normalizar_cedulas(cedulas)
    resultados = {
        cedula: ResultadoPerfilERP(estado=EstadoPerfilERP.NO_ENCONTRADO)
        for cedula in cedulas
    }
    if not cedulas:
        return resultados

    db_erp = SessionErpLectura()
    multiples = 0
    try:
        db_erp.execute(text("SET TRANSACTION READ ONLY"))
        db_erp.execute(text("SET LOCAL statement_timeout = :timeout"), {"timeout": timeout_ms})
        db_erp.execute(text("SET LOCAL lock_timeout = '2s'"))
        origen = db_erp.execute(
            text("SELECT current_database(), current_setting('transaction_read_only')")
        ).one()
        if origen[0] != config.erp_read_expected_database or origen[1] != "on":
            raise RuntimeError("La fuente ERP de lectura no esta autorizada")

        for fila in db_erp.execute(_CONSULTA_PERFILES, {"cedulas": cedulas}).mappings():
            cedula = str(fila["cedula"]).strip()
            cantidad = int(fila["cantidad_activos"] or 0)
            if cantidad == 0:
                resultados[cedula] = ResultadoPerfilERP(
                    estado=EstadoPerfilERP.SIN_CONTRATO_ACTIVO,
                )
                continue
            multiples += int(cantidad > 1)
            resultados[cedula] = ResultadoPerfilERP(
                estado=EstadoPerfilERP.ENCONTRADO_ACTIVO,
                cantidad_contratos_activos=cantidad,
                perfil=PerfilLaboralERP(
                    cedula=cedula,
                    nombre=fila["nombre"],
                    cargo=fila["cargo"],
                    area=fila["area"],
                    sede=fila["sede"],
                    centrocosto=fila["centrocosto"],
                    viaticante=fila["viaticante"],
                    baseviaticos=fila["baseviaticos"],
                    correo=fila["correo"],
                ),
            )
        if multiples:
            logger.warning("ERP_PERFILES_MULTIPLES_CONTRATOS | cantidad=%s", multiples)
        return resultados
    finally:
        try:
            db_erp.rollback()
        finally:
            db_erp.close()


async def consultar_perfiles_laborales_bulk_async(
    cedulas: list[str],
    *,
    timeout_ms: int = 15_000,
    espera_maxima_segundos: float = 20.0,
) -> dict[str, ResultadoPerfilERP]:
    return await asyncio.wait_for(
        run_in_threadpool(
            consultar_perfiles_laborales_worker,
            cedulas,
            timeout_ms=timeout_ms,
        ),
        timeout=espera_maxima_segundos,
    )


async def obtener_perfil_laboral_por_cedula(
    cedula: str,
    *,
    timeout_ms: int = 5_000,
    espera_maxima_segundos: float = 8.0,
) -> ResultadoPerfilERP:
    resultados = await consultar_perfiles_laborales_bulk_async(
        [cedula],
        timeout_ms=timeout_ms,
        espera_maxima_segundos=espera_maxima_segundos,
    )
    return resultados.get(
        cedula.strip(),
        ResultadoPerfilERP(estado=EstadoPerfilERP.NO_ENCONTRADO),
    )


async def verificar_fuente_perfiles_erp() -> bool:
    """Health check degradable; valida fuente/lectura sin exponer configuracion."""
    try:
        await consultar_perfiles_laborales_bulk_async(
            ["__healthcheck__"],
            timeout_ms=3_000,
            espera_maxima_segundos=5.0,
        )
        logger.info("ERP_PERFILES_LECTURA_SALUDABLE")
        return True
    except Exception:
        logger.warning("ERP_PERFILES_LECTURA_DEGRADADA")
        return False
