"""
Sprint S6 — Resolver del flag de bolsa de horas.

Replica el patron de resolver_autorizacion_he:
  override vigente por OT > parametro legal global > default seguro.

Devuelve (bolsa_habilitada, fuente) donde fuente ∈
  {'OVERRIDE_OT', 'PARAMETRO_LEGAL', 'DEFAULT'}.
"""
import logging
from datetime import date, datetime
from typing import Optional, Tuple

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.bolsa_horas_override import NominaBolsaOtOverride
from ...models.novedades_nomina.horas_extras import NominaParametroLegal

logger = logging.getLogger(__name__)

CODIGO_PARAMETRO_BOLSA_GLOBAL = "BOLSA_GLOBAL_HABILITADA"


async def resolver_bolsa_habilitada(
    session: AsyncSession,
    ot_id: Optional[int],
) -> Tuple[bool, str]:
    """
    Devuelve (bolsa_habilitada, fuente).

    Prioridad:
      1. Override vigente por OT (estado=ACTIVO, vigente_hasta nulo o futuro).
      2. Parametro legal global vigente (codigo=BOLSA_GLOBAL_HABILITADA).
      3. Default seguro False: bolsa desactivada sin politica formal.
    """
    ahora = datetime.now()

    # 1. Override por OT
    if ot_id is not None:
        stmt_ov = select(NominaBolsaOtOverride).where(
            NominaBolsaOtOverride.ot_id == ot_id,
            NominaBolsaOtOverride.estado == "ACTIVO",
            NominaBolsaOtOverride.vigente_desde <= ahora,
        )
        overrides = (await session.execute(stmt_ov)).scalars().all()
        vigente = next(
            (o for o in overrides if o.vigente_hasta is None or o.vigente_hasta > ahora),
            None,
        )
        if vigente is not None:
            return vigente.bolsa_habilitada_override, "OVERRIDE_OT"

    # 2. Parametro legal global
    hoy = date.today()
    stmt_p = (
        select(NominaParametroLegal)
        .where(
            NominaParametroLegal.codigo == CODIGO_PARAMETRO_BOLSA_GLOBAL,
            NominaParametroLegal.estado == "VIGENTE",
            NominaParametroLegal.vigente_desde <= hoy,
        )
        .order_by(NominaParametroLegal.vigente_desde.desc())
    )
    param = (await session.execute(stmt_p)).scalars().first()
    if param is not None and (param.vigente_hasta is None or param.vigente_hasta >= hoy):
        return (param.valor or "").strip().lower() == "true", "PARAMETRO_LEGAL"

    # 3. Default seguro: inactiva hasta confirmacion formal de Nomina/GH.
    return False, "DEFAULT"
