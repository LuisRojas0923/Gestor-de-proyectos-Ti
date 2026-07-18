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

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras_planificador import (
    EmpleadoERPListResponse,
    OtManoObraListResponse,
    PlanBulkRequest,
    PlanBulkResponse,
    PlanConfirmarRequest,
    PlanConfirmarResponse,
    PlanPreCalculoResponse,
)
from ....services.auth.alcance_empleados_service import (
    autorizar_lote, cedulas_visibles_planificador, normalizar_cedula,
)
from ....services.erp.empleados_horarios_service import (
    agregar_disponibilidad_semanal,
    consultar_empleados_erp_worker,
    filtrar_paginar_empleados,
    validar_semana_iso,
)
from ....services.erp.ordenes_trabajo_service import consultar_ots_mano_obra_worker
from ....services.novedades_nomina.planificador_service import (
    confirmar_plan,
    guardar_borrador_plan,
    pre_calcular_plan,
)
from .horas_extras_permisos import (
    requiere_permiso_he_confirmar,
    requiere_permiso_he_planificar,
)
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Nómina - Horas Extras"],
)


def _aplicar_cedulas_canonicas(empleados, canonicas: list[str]) -> None:
    por_normalizada = {cedula: cedula for cedula in canonicas}
    for empleado in empleados:
        empleado.cedula = por_normalizada[normalizar_cedula(empleado.cedula)]


def _auditar_bulk_sin_pii(request: Request, cantidad: int) -> None:
    request.state.auditoria_modulo = "nomina_horas_extras.planificar"
    request.state.auditoria_entidad_tipo = "lote_horarios"
    request.state.auditoria_datos_nuevos = {"cantidad_empleados": cantidad}
    request.state.auditoria_metadatos = {"cantidad_empleados": cantidad}

# ---------------------------------------------------------------------------
# GET /planificador/empleados-erp
# ---------------------------------------------------------------------------

@router.get("/planificador/empleados-erp", response_model=EmpleadoERPListResponse)
async def listar_empleados_erp(
    response: Response,
    q: Optional[str] = Query(None, description="Filtro case-insensitive sobre cedula/nombre"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    solo_activos: bool = Query(True),
    anio: int = Query(default_factory=lambda: date.today().isocalendar().year),
    semana_iso: int = Query(default_factory=lambda: date.today().isocalendar().week),
    cargos: list[str] = Query(default_factory=list),
    areas: list[str] = Query(default_factory=list),
    ciudades: list[str] = Query(default_factory=list),
    jefes: list[str] = Query(default_factory=list),
    autoriza_he: bool | None = None, disponible_semana: bool | None = None,
    orden: str = Query("cedula", pattern=r"^(cedula|nombre|cargo|area|ciudad|jefe)$"),
    direccion: str = Query("asc", pattern=r"^(asc|desc)$"),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Lista paginada de empleados del ERP con busqueda opcional."""
    try:
        validar_semana_iso(anio, semana_iso)
        permitidas = await cedulas_visibles_planificador(db, usuario)
        resultado = await run_in_threadpool(
            consultar_empleados_erp_worker, q, limit, offset, solo_activos,
            sorted(permitidas) if permitidas is not None else None, True,
        )
        items = await agregar_disponibilidad_semanal(
            db, resultado["items"], anio, semana_iso
        )
        pagina = filtrar_paginar_empleados(
            items,
            cargos=cargos,
            areas=areas,
            ciudades=ciudades,
            jefes=jefes,
            autoriza_he=autoriza_he,
            disponible_semana=disponible_semana,
            relacionado=None,
            orden=orden,
            direccion=direccion,
            limit=limit,
            offset=offset,
        )
        response.headers["Cache-Control"] = "no-store, private"
        return EmpleadoERPListResponse(**pagina)
    except ValueError as e:
        raise HTTPException(status_code=422, detail="Semana ISO invalida") from e
    except Exception:
        logger.error("Error consultando empleados disponibles para el planificador")
        raise HTTPException(status_code=503, detail="No fue posible consultar empleados")


# ---------------------------------------------------------------------------
# GET /planificador/ots-mano-obra
# ---------------------------------------------------------------------------

@router.get("/planificador/ots-mano-obra", response_model=OtManoObraListResponse)
async def listar_ots_mano_obra(
    q: Optional[str] = Query(None, description="Filtro sobre orden, descripcion, CC, SCC, subindice o cliente"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Lista combinaciones OT/CC del ERP clasificadas como mano de obra."""
    try:
        resultado = await run_in_threadpool(
            consultar_ots_mano_obra_worker, q, limit, offset
        )
        return OtManoObraListResponse(**resultado)
    except Exception:
        logger.error("Error consultando OT/CC del ERP")
        raise HTTPException(status_code=503, detail="ERP no disponible")


# ---------------------------------------------------------------------------
# POST /horario/registros/bulk
# ---------------------------------------------------------------------------

@router.post("/horario/registros/bulk", response_model=PlanBulkResponse)
async def guardar_registros_bulk(
    payload: PlanBulkRequest, request: Request,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Guarda el plan semanal en BORRADOR (bulk upsert + bulk insert).

    Por cada empleado: actualiza nomina_horario_pactado_dia e inserta
    nomina_novedad_evento. Errores por empleado se reportan sin abortar
    el lote.
    """
    _auditar_bulk_sin_pii(request, len(payload.empleados))
    try:
        canonicas = await autorizar_lote(
            db, usuario, [empleado.cedula for empleado in payload.empleados]
        )
        _aplicar_cedulas_canonicas(payload.empleados, canonicas)
        usuario_id = getattr(usuario, "cedula", None) or getattr(usuario, "id", None)
        return await guardar_borrador_plan(db, payload, usuario_id=str(usuario_id) if usuario_id else None)
    except PermissionError as exc:
        raise HTTPException(status_code=404, detail="Empleado no encontrado") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception:
        logger.error("Error guardando borrador del plan")
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
    payload: PlanBulkRequest, request: Request,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Calcula HE estimado por empleado SIN persistir nada.

    Solo consulta catalogo vigente y factor prestacional ARL (cacheados
    en sesion por la duracion del request).
    """
    _auditar_bulk_sin_pii(request, len(payload.empleados))
    try:
        canonicas = await autorizar_lote(
            db, usuario, [empleado.cedula for empleado in payload.empleados]
        )
        _aplicar_cedulas_canonicas(payload.empleados, canonicas)
        return await pre_calcular_plan(db, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=404, detail="Empleado no encontrado") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception:
        logger.error("Error pre-calculando plan")
        raise HTTPException(status_code=500, detail="Error al pre-calcular el plan")


# ---------------------------------------------------------------------------
# POST /planificador/confirmar
# ---------------------------------------------------------------------------

@router.post("/planificador/confirmar", response_model=PlanConfirmarResponse)
async def confirmar_plan_endpoint(
    payload: PlanConfirmarRequest, request: Request,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_confirmar),
):
    """Confirma el plan semanal: genera nomina_calculo_semanal por empleado.

    Errores por empleado (incluido BOLSA_DESACTIVADA de S6) se reportan
    en errores[] sin abortar el lote.
    """
    payload.usuario_confirma = str(getattr(usuario, "cedula", None) or usuario.id)
    _auditar_bulk_sin_pii(request, len(payload.empleados))
    try:
        canonicas = await autorizar_lote(
            db, usuario, [empleado.cedula for empleado in payload.empleados]
        )
        _aplicar_cedulas_canonicas(payload.empleados, canonicas)
        return await confirmar_plan(db, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=404, detail="Empleado no encontrado") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception:
        logger.error("Error confirmando plan")
        try:
            await db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Error al confirmar el plan")
