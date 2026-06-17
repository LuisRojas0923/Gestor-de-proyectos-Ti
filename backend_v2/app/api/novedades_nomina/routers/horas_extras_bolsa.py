"""
Sprint S6 — Sub-router para endpoints admin de bolsa de horas desactivable.

Separado de ``horas_extras`` para mantener ese archivo bajo el límite de
500 líneas del Architecture Enforcer. Patrón equivalente al usado por
festivos/novedades/horario_semana.

Endpoints (todos bajo /api/v2/novedades-nomina/horas-extras/):
  GET    bolsa/estado-global        Resuelve bolsa habilitada (override OT > global > default)
  POST   bolsa/overrides-ot         Crea override por OT (revoca los previos activos)
  DELETE bolsa/overrides-ot/{id}    Marca override como REVOCADO (no borra)
  PUT    admin/bolsa/global         Crea nueva vigencia del parametro legal global

Las escrituras envuelven db.execute / db.commit en try/except para satisfacer
el Backend AST Security Auditor (RELIABILITY: API/DB Sin Control).
"""
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ....api.auth.profile_router import obtener_usuario_actual_db
from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.bolsa_horas_override import NominaBolsaOtOverride
from ....models.novedades_nomina.horas_extras import NominaParametroLegal
from ....models.novedades_nomina.schemas_horas_extras import (
    BolsaEstadoGlobalOut,
    BolsaGlobalConfigIn,
    BolsaOverrideOTIn,
    BolsaOverrideOTOut,
)
from ....services.auth.servicio import ServicioAuth
from ....services.novedades_nomina.bolsa_horas_resolver import resolver_bolsa_habilitada

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/horas-extras",
    tags=["Nómina - Horas Extras"],
)

MODULO_HE = "nomina_horas_extras"


async def requiere_permiso_he(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_HE not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para Horas Extras")
    return usuario


# ---------------------------------------------------------------------------
# GET /bolsa/estado-global
# ---------------------------------------------------------------------------

@router.get("/bolsa/estado-global", response_model=BolsaEstadoGlobalOut)
async def obtener_estado_bolsa_global(
    ot_id: Optional[int] = Query(None, description="OT para aplicar override por OT"),
    db: AsyncSession = Depends(obtener_db),
):
    """Devuelve (bolsa_habilitada, fuente) usando el resolver.

    Prioridad: override OT vigente > parametro legal global > default True.
    """
    try:
        habilitada, fuente = await resolver_bolsa_habilitada(db, ot_id)
        return BolsaEstadoGlobalOut(bolsa_habilitada=habilitada, fuente=fuente)
    except Exception as e:
        logger.exception("Error resolviendo estado de bolsa: %s", e)
        raise HTTPException(status_code=500, detail="Error al consultar estado de bolsa")


# ---------------------------------------------------------------------------
# POST /bolsa/overrides-ot
# ---------------------------------------------------------------------------

@router.post("/bolsa/overrides-ot", response_model=BolsaOverrideOTOut)
async def crear_override_bolsa_ot(
    payload: BolsaOverrideOTIn,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Crea override por OT del flag global de bolsa.

    Si existe un override ACTIVO para la OT, se revoca (vigente_hasta=now())
    antes de crear el nuevo. Bitacora inmutable.
    """
    ahora = datetime.now()
    try:
        # Snapshot del global al momento del override (auditoria)
        _, _global_actual = await resolver_bolsa_habilitada(db, ot_id=None)
        stmt_p = (
            select(NominaParametroLegal)
            .where(
                NominaParametroLegal.codigo == "BOLSA_GLOBAL_HABILITADA",
                NominaParametroLegal.estado == "VIGENTE",
            )
            .order_by(NominaParametroLegal.vigente_desde.desc())
        )
        param = (await db.execute(stmt_p)).scalars().first()
        bolsa_erp_snapshot = "true"
        if param is not None:
            bolsa_erp_snapshot = (param.valor or "true").strip().lower()

        # Revocar overrides activos previos para la misma OT
        stmt_prev = select(NominaBolsaOtOverride).where(
            NominaBolsaOtOverride.ot_id == payload.ot_id,
            NominaBolsaOtOverride.estado == "ACTIVO",
        )
        prevs = (await db.execute(stmt_prev)).scalars().all()
        for p in prevs:
            p.estado = "REVOCADO"
            p.vigente_hasta = ahora
            db.add(p)

        nuevo = NominaBolsaOtOverride(
            ot_id=payload.ot_id,
            bolsa_habilitada_override=payload.bolsa_habilitada_override,
            bolsa_habilitada_erp=bolsa_erp_snapshot == "true",
            motivo=payload.motivo,
            autorizado_por=payload.autorizado_por,
            autorizado_por_id=getattr(usuario, "cedula", None) or usuario.id,
            vigente_desde=ahora,
            estado="ACTIVO",
        )
        db.add(nuevo)
        await db.commit()
        await db.refresh(nuevo)
        return BolsaOverrideOTOut.model_validate(nuevo)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creando override bolsa OT: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Error al crear override de bolsa")


# ---------------------------------------------------------------------------
# DELETE /bolsa/overrides-ot/{override_id}
# ---------------------------------------------------------------------------

@router.delete("/bolsa/overrides-ot/{override_id}", status_code=204)
async def revocar_override_bolsa_ot(
    override_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
):
    """Revoca un override por OT (no borra la fila, marca estado=REVOCADO)."""
    try:
        stmt = select(NominaBolsaOtOverride).where(NominaBolsaOtOverride.id == override_id)
        ov = (await db.execute(stmt)).scalar_one_or_none()
        if ov is None:
            raise HTTPException(status_code=404, detail=f"Override {override_id} no encontrado")
        if ov.estado != "ACTIVO":
            raise HTTPException(
                status_code=409,
                detail=f"Override {override_id} ya no esta activo (estado={ov.estado})",
            )
        ov.estado = "REVOCADO"
        ov.vigente_hasta = datetime.now()
        db.add(ov)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error revocando override bolsa OT: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Error al revocar override de bolsa")


# ---------------------------------------------------------------------------
# PUT /admin/bolsa/global
# ---------------------------------------------------------------------------

@router.put("/admin/bolsa/global", response_model=BolsaEstadoGlobalOut)
async def configurar_bolsa_global(
    payload: BolsaGlobalConfigIn,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Cambia el parametro legal global de bolsa.

    Crea nueva fila vigente_hasta=null; cierra la previa con vigente_hasta=hoy.
    """
    hoy = date.today()
    try:
        stmt_prev = select(NominaParametroLegal).where(
            NominaParametroLegal.codigo == "BOLSA_GLOBAL_HABILITADA",
            NominaParametroLegal.estado == "VIGENTE",
            NominaParametroLegal.vigente_hasta.is_(None),
        )
        prev = (await db.execute(stmt_prev)).scalars().first()
        if prev is not None:
            prev.estado = "VIGENTE"
            prev.vigente_hasta = hoy
            db.add(prev)

        usuario_id = getattr(usuario, "cedula", None) or usuario.id
        nuevo = NominaParametroLegal(
            codigo="BOLSA_GLOBAL_HABILITADA",
            nombre="Habilitar bolsa de horas (global)",
            valor="true" if payload.habilitada else "false",
            tipo_dato="BOOLEANO",
            norma_soporte=(
                f"Politica interna — autorizado_por={payload.autorizado_por}; "
                f"{payload.justificacion}"
            ),
            vigente_desde=hoy,
            vigente_hasta=None,
            estado="VIGENTE",
            observaciones=f"Cambio por {usuario_id} — {payload.justificacion}",
        )
        db.add(nuevo)
        await db.commit()

        return BolsaEstadoGlobalOut(
            bolsa_habilitada=payload.habilitada, fuente="PARAMETRO_LEGAL"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error configurando bolsa global: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Error al cambiar parametro global de bolsa")
