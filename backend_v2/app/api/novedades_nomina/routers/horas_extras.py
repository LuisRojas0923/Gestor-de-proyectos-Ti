"""Router principal de Horas Extras; parsea, valida y delega a servicios."""
import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras import (
    NovedadCatalogoRead,
    NovedadCatalogoCreate,
    FactorPrestacionalRead,
    HorarioPactadoRead,
    HorarioPactadoEfectivoRead,
    OverrideAutorizaHECreate,
    OverrideAutorizaHERead,
    PreLiquidacionInput,
    PreLiquidacionResultado,
    PreLiquidacionConfirmar,
    PreLiquidacionConfirmada,
)
from ....services.novedades_nomina.horas_extras_service import (
    crear_novedad_catalogo,
    actualizar_novedad_catalogo,
    listar_catalogo_vigente,
    listar_factores_arl_todos,
    obtener_horario_pactado,
    crear_override_autoriza_he,
    listar_overrides_cedula,
    resolver_autorizacion_he,
    ejecutar_pre_liquidacion,
    obtener_bolsa_horas,
)
from ....services.novedades_nomina.horas_extras_erp_validacion import (
    firmar_pre_liquidacion,
    resolver_parametros_empleado_erp,
    validar_importes_confirmacion,
)
from ....services.novedades_nomina.horas_extras_confirmacion import (
    confirmar_pre_liquidacion,
)
from ....services.novedades_nomina.horas_extras_trazabilidad import construir_detalle_diario_preliquidacion
from ....services.auth.alcance_empleados_service import (
    autorizar_cedula,
)
from .horas_extras_festivos import router as festivos_subrouter
from .horas_extras_novedades import router as novedades_subrouter
from .horas_extras_horario_semana import router as horario_semana_subrouter
from .horas_extras_bolsa import router as bolsa_subrouter
from .horas_extras_planificador import router as planificador_subrouter
from .horas_extras_parametros import router as parametros_subrouter
from .horas_extras_plantillas import router as plantillas_subrouter
from .horas_extras_workflow import router as workflow_subrouter
from .horas_extras_consultas import (
    listar_calculos_endpoint,
    listar_costos_ot_endpoint,
    listar_historial_endpoint,
    obtener_calculo_endpoint,
    router as consultas_subrouter,
)
from .horas_extras_permisos import (
    requiere_permiso_he_admin,
    requiere_permiso_he_confirmar,
    requiere_permiso_he_leer,
    requiere_permiso_he_planificar,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/horas-extras",
    tags=["Nómina - Horas Extras"],
)

# S5' — Sub-router de festivos (mantiene este archivo bajo el límite de 500 líneas)
router.include_router(festivos_subrouter)
# S5 — Sub-router de novedades
router.include_router(novedades_subrouter)
# S6 — Sub-router de bolsa desactivable
router.include_router(bolsa_subrouter)
# S7 — Sub-router de planificador semanal
router.include_router(planificador_subrouter)
# S5'' — Horario semanal editable
router.include_router(horario_semana_subrouter)
# Catalogo de plantillas semanales
router.include_router(plantillas_subrouter)
# S9 — Sub-router de parámetros de cálculo editables
router.include_router(parametros_subrouter)
# Consultas de calculos, costos e historial
router.include_router(consultas_subrouter)
# Workflow de autorización, estados y compensación
router.include_router(workflow_subrouter)


# Catálogo de novedades
# ---------------------------------------------------------------------------
@router.get("/catalogo", response_model=List[NovedadCatalogoRead])
async def listar_catalogo(
    categoria: Optional[str] = Query(None, description="HORA_EXTRA, AUSENCIA, LICENCIA, ..."),
    solo_acreditan_bolsa: bool = Query(False),
    fecha: Optional[date] = Query(None, description="Fecha de referencia para vigencia"),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    return await listar_catalogo_vigente(
        db, categoria=categoria, solo_acreditan_bolsa=solo_acreditan_bolsa, fecha_referencia=fecha
    )


@router.post("/catalogo", response_model=NovedadCatalogoRead)
async def crear_novedad(
    payload: NovedadCatalogoCreate,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_admin),
):
    try:
        return await crear_novedad_catalogo(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/catalogo/{codigo}", response_model=NovedadCatalogoRead)
async def actualizar_novedad(
    codigo: str = Path(..., max_length=20),
    payload: NovedadCatalogoCreate = ...,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_admin),
):
    try:
        return await actualizar_novedad_catalogo(db, codigo, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------------------------------------------------------
# Factores prestacionales ARL
# ---------------------------------------------------------------------------
@router.get("/factores-arl", response_model=List[FactorPrestacionalRead])
async def listar_factores_arl(
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    return await listar_factores_arl_todos(db)


# ---------------------------------------------------------------------------
# Horario pactado
# ---------------------------------------------------------------------------
@router.get("/horario/{cedula}", response_model=Optional[HorarioPactadoRead])
async def obtener_horario(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    try:
        cedula = await autorizar_cedula(db, usuario, cedula)
    except (ValueError, PermissionError) as exc:
        raise HTTPException(404, "Empleado no encontrado") from exc
    return await obtener_horario_pactado(db, cedula)


@router.get("/autorizacion/{cedula}", response_model=HorarioPactadoEfectivoRead)
async def obtener_autorizacion_efectiva(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    try:
        cedula = await autorizar_cedula(db, usuario, cedula)
    except (ValueError, PermissionError) as exc:
        raise HTTPException(404, "Empleado no encontrado") from exc
    horario = await obtener_horario_pactado(db, cedula)
    if horario is None:
        return HorarioPactadoEfectivoRead(
            cedula=cedula,
            autoriza_he=False,
            fuente="SIN_DATOS",
            horas_semana_ordinaria=42.0,
            minutos_jornada_ordinaria=480,
            es_jornada_nocturna=False,
        )
    autoriza, fuente = await resolver_autorizacion_he(db, cedula)
    return HorarioPactadoEfectivoRead(
        cedula=cedula,
        autoriza_he=autoriza,
        fuente=fuente,
        horas_semana_ordinaria=horario.horas_semana_ordinaria,
        minutos_jornada_ordinaria=horario.minutos_jornada_ordinaria,
        es_jornada_nocturna=horario.es_jornada_nocturna,
    )


# ---------------------------------------------------------------------------
# Overrides de autorización HE
# ---------------------------------------------------------------------------
@router.post("/overrides", response_model=OverrideAutorizaHERead)
async def crear_override(
    payload: OverrideAutorizaHECreate,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_admin),
):
    try:
        payload.cedula = await autorizar_cedula(db, usuario, payload.cedula)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="Empleado no encontrado") from exc
    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        return await crear_override_autoriza_he(db, payload, usuario_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/overrides/{cedula}", response_model=List[OverrideAutorizaHERead])
async def listar_overrides(
    response: Response,
    cedula: str = Path(..., min_length=1, max_length=50),
    estado: Optional[str] = Query(None, description="ACTIVO, REVOCADO, EXPIRADO"),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    try:
        cedula = await autorizar_cedula(db, usuario, cedula)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="Empleado no encontrado") from exc
    resultado = await listar_overrides_cedula(db, cedula, estado)
    response.headers["Cache-Control"] = "no-store, private"
    return resultado


# ---------------------------------------------------------------------------
# Pre-liquidación
# ---------------------------------------------------------------------------
@router.post("/pre-liquidacion", response_model=PreLiquidacionResultado)
async def ejecutar_pre_liquidacion_endpoint(
    payload: PreLiquidacionInput,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_planificar),
):
    try:
        payload.cedula = await autorizar_cedula(db, usuario, payload.cedula)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(404, "Empleado no encontrado") from exc
    if len(payload.horas_por_dia) != 7:
        raise HTTPException(status_code=400, detail="horas_por_dia debe tener 7 valores (L-D)")

    if payload.codigos_por_dia and len(payload.codigos_por_dia) != 7:
        raise HTTPException(
            status_code=400, detail="codigos_por_dia debe tener 7 sublistas (una por día)"
        )

    salario_erp, nivel_erp = await resolver_parametros_empleado_erp(payload.cedula, None)
    payload.salario_base_mensual = salario_erp
    payload.nivel_riesgo_arl = nivel_erp

    autoriza, fuente = await resolver_autorizacion_he(db, payload.cedula)
    if not autoriza:
        logger.warning("Pre-liquidación HE sin autorización vigente (fuente=%s)", fuente)

    try:
        resultado = await ejecutar_pre_liquidacion(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not autoriza:
        resultado.advertencias.insert(
            0,
            f"Empleado SIN autorización HE vigente (fuente={fuente}). "
            f"El cálculo se entrega como referencia, no como liquidación.",
        )
    resultado.fecha_inicio = date.fromisocalendar(payload.anio, payload.semana_iso, 1)
    resultado.fecha_fin = date.fromisocalendar(payload.anio, payload.semana_iso, 7)
    resultado.ot_id = payload.ot_id
    resultado.ot_codigo = payload.ot_codigo
    resultado.observaciones = None
    resultado.detalle_diario = await construir_detalle_diario_preliquidacion(db, payload, resultado)
    resultado.firma_calculo = firmar_pre_liquidacion(resultado)
    return resultado


# ---------------------------------------------------------------------------
# Bolsa de horas
# ---------------------------------------------------------------------------
@router.get("/bolsa/{cedula}")
async def obtener_bolsa(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    try:
        cedula = await autorizar_cedula(db, usuario, cedula)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(404, "Empleado no encontrado") from exc
    bolsa = await obtener_bolsa_horas(db, cedula)
    if bolsa is None:
        return {
            "cedula": cedula,
            "horas_acreditadas": 0.0,
            "horas_consumidas": 0.0,
            "horas_pagadas": 0.0,
            "horas_disponibles": 0.0,
        }
    disponibles = bolsa.horas_acreditadas - bolsa.horas_consumidas - bolsa.horas_pagadas
    return {
        "cedula": bolsa.cedula,
        "horas_acreditadas": bolsa.horas_acreditadas,
        "horas_consumidas": bolsa.horas_consumidas,
        "horas_pagadas": bolsa.horas_pagadas,
        "horas_disponibles": disponibles,
    }


# ---------------------------------------------------------------------------
# Engine de confirmación (S2)
# ---------------------------------------------------------------------------
@router.post("/pre-liquidacion/confirmar", response_model=PreLiquidacionConfirmada)
async def confirmar_pre_liquidacion_endpoint(
    payload: PreLiquidacionConfirmar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_confirmar),
):
    """
    Persiste un cálculo y sus efectos colaterales.

    Decisión C1: la bolsa se acredita al confirmar, no al cargar.
    Decisión H7: nomina_costo_ot se actualiza en tiempo real (UPSERT).
    Decisión H8: la bolsa es siempre del empleado (cedula), nunca de la OT.

    Idempotente sobre (cedula, anio, semana_iso): si ya existe, retorna 409.
    """
    try:
        payload.cedula = await autorizar_cedula(db, usuario, payload.cedula)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(404, "Empleado no encontrado") from exc

    if not payload.detalles:
        raise HTTPException(status_code=400, detail="detalles no puede estar vacío")

    salario_erp, nivel_erp = await resolver_parametros_empleado_erp(payload.cedula, None)
    if abs(float(payload.salario_base_mensual) - salario_erp) > 0.01 or payload.nivel_riesgo_arl != nivel_erp:
        raise HTTPException(
            status_code=400,
            detail="El salario o nivel ARL no coincide con el empleado ERP vigente; recalcula la pre-liquidación",
        )
    await validar_importes_confirmacion(db, payload, salario_erp, nivel_erp)

    payload.usuario_confirma = str(getattr(usuario, "cedula", None) or usuario.id)

    try:
        autoriza_he, _ = await resolver_autorizacion_he(db, payload.cedula)
        resultado = await confirmar_pre_liquidacion(
            db, payload, autorizacion_he=autoriza_he
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return PreLiquidacionConfirmada(
        calculo_id=resultado["calculo_id"],
        bolsa_id=resultado["bolsa_id"],
        horas_acreditadas_bolsa=resultado["horas_acreditadas_bolsa"],
        movimientos_bolsa=resultado["movimientos_bolsa"],
        costo_ot_id=resultado["costo_ot_id"],
        estado=resultado["estado"],
        mensaje=(
            "Cálculo pendiente de autorización"
            if resultado["estado"] == "PENDIENTE_AUTORIZACION"
            else "Cálculo confirmado y persistido"
        ),
    )


# Los endpoints de festivos (/festivos/{anio} y /festivos/{anio}/sincronizar)
# viven en el sub-router horas_extras_festivos.py, incluido arriba.


# Los endpoints S6 de bolsa desactivable (GET estado-global, POST/DELETE
# overrides-ot, PUT admin/bolsa/global) viven en horas_extras_bolsa.py.
