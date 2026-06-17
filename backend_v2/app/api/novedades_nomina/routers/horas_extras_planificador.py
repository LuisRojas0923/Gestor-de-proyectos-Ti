"""
Sprint S7 — Sub-router del planificador semanal.

Separado de horas_extras.py para mantenerlo bajo el limite de 500 lineas.

Endpoints:
  GET    planificador/empleados-erp     Lista paginada con busqueda
  POST   horario/registros/bulk         Guarda borrador (upsert horario + novedades)
  POST   planificador/pre-calcular      Calculo en vivo SIN persistir
  POST   planificador/confirmar         Genera nomina_calculo_semanal por empleado

db.execute / db.commit envueltos en try/except para satisfacer el Backend
AST Security Auditor (RELIABILITY: API/DB Sin Control).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ....api.auth.profile_router import obtener_usuario_actual_db
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras_planificador import (
    EmpleadoERPListResponse,
    PlanBulkRequest,
    PlanBulkResponse,
    PlanConfirmarRequest,
    PlanConfirmarResponse,
    PlanPreCalculoResponse,
)
from ....services.auth.servicio import ServicioAuth
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.planificador_service import (
    confirmar_plan,
    guardar_borrador_plan,
    pre_calcular_plan,
)

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
# GET /planificador/empleados-erp
# ---------------------------------------------------------------------------

@router.get("/planificador/empleados-erp", response_model=EmpleadoERPListResponse)
async def listar_empleados_erp(
    q: Optional[str] = Query(None, description="Filtro case-insensitive sobre cedula/nombre"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    solo_activos: bool = Query(True),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Lista paginada de empleados del ERP con busqueda opcional."""
    if db_erp is None:
        raise HTTPException(
            status_code=503,
            detail="Conexion con ERP no disponible. Digite las cedulas manualmente.",
        )
    try:
        resultado = EmpleadosService.listar_empleados_paginado(
            db_erp, q=q, limit=limit, offset=offset, solo_activos=solo_activos
        )
        return EmpleadoERPListResponse(
            items=resultado["items"],
            total=resultado["total"],
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.exception("Error listando empleados ERP: %s", e)
        raise HTTPException(status_code=500, detail="Error al consultar empleados del ERP")


# ---------------------------------------------------------------------------
# POST /horario/registros/bulk
# ---------------------------------------------------------------------------

@router.post("/horario/registros/bulk", response_model=PlanBulkResponse)
async def guardar_registros_bulk(
    payload: PlanBulkRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Guarda el plan semanal en BORRADOR (bulk upsert + bulk insert).

    Por cada empleado: actualiza nomina_horario_pactado_dia e inserta
    nomina_novedad_evento. Errores por empleado se reportan sin abortar
    el lote.
    """
    try:
        usuario_id = getattr(usuario, "cedula", None) or getattr(usuario, "id", None)
        return await guardar_borrador_plan(db, payload, usuario_id=str(usuario_id) if usuario_id else None)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error guardando borrador del plan: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Error al guardar borrador del plan")


# ---------------------------------------------------------------------------
# POST /planificador/pre-calcular
# ---------------------------------------------------------------------------

@router.post("/planificador/pre-calcular", response_model=PlanPreCalculoResponse)
async def pre_calcular_plan_endpoint(
    payload: PlanBulkRequest,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
):
    """Calcula HE estimado por empleado SIN persistir nada.

    Solo consulta catalogo vigente y factor prestacional ARL (cacheados
    en sesion por la duracion del request).
    """
    try:
        return await pre_calcular_plan(db, payload)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error pre-calculando plan: %s", e)
        raise HTTPException(status_code=500, detail="Error al pre-calcular el plan")


# ---------------------------------------------------------------------------
# POST /planificador/confirmar
# ---------------------------------------------------------------------------

@router.post("/planificador/confirmar", response_model=PlanConfirmarResponse)
async def confirmar_plan_endpoint(
    payload: PlanConfirmarRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Confirma el plan semanal: genera nomina_calculo_semanal por empleado.

    Errores por empleado (incluido BOLSA_DESACTIVADA de S6) se reportan
    en errores[] sin abortar el lote.
    """
    try:
        return await confirmar_plan(db, payload)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error confirmando plan: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Error al confirmar el plan")
