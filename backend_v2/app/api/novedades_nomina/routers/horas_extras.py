"""Router principal de Horas Extras; parsea, valida y delega a servicios."""
import logging
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from ....database import obtener_db, obtener_erp_db_opcional
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
    CalculoSemanalRead,
    CostoOtRead,
    WorkflowTransicionRequest,
    WorkflowTransicionResult,
    WorkflowEventoRead,
    CompensarBolsaRequest,
    CompensarBolsaResponse,
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
    listar_calculos,
    obtener_calculo_completo,
    listar_costos_ot,
)
from ....services.novedades_nomina.horas_extras_trazabilidad import construir_detalle_diario_preliquidacion
from ....services.novedades_nomina.horas_extras_workflow import (
    transicionar_calculo,
    listar_eventos_calculo,
    compensar_bolsa,
)
from .horas_extras_festivos import router as festivos_subrouter
from .horas_extras_novedades import router as novedades_subrouter
from .horas_extras_horario_semana import router as horario_semana_subrouter
from .horas_extras_bolsa import router as bolsa_subrouter
from .horas_extras_planificador import router as planificador_subrouter
from .horas_extras_parametros import router as parametros_subrouter
from .horas_extras_permisos import (
    PERMISO_HE_COMPENSAR,
    requiere_permiso_he_admin,
    requiere_permiso_he_compensar,
    requiere_permiso_he_confirmar,
    requiere_permiso_he_leer,
    requiere_permiso_he_planificar,
    validar_permiso_he,
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
# S9 — Sub-router de parámetros de cálculo editables
router.include_router(parametros_subrouter)


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
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    return await obtener_horario_pactado(db, cedula)


@router.get("/autorizacion/{cedula}", response_model=HorarioPactadoEfectivoRead)
async def obtener_autorizacion_efectiva(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
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
    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        return await crear_override_autoriza_he(db, payload, usuario_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/overrides/{cedula}", response_model=List[OverrideAutorizaHERead])
async def listar_overrides(
    cedula: str = Path(..., min_length=1, max_length=50),
    estado: Optional[str] = Query(None, description="ACTIVO, REVOCADO, EXPIRADO"),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    return await listar_overrides_cedula(db, cedula, estado)


# ---------------------------------------------------------------------------
# Pre-liquidación
# ---------------------------------------------------------------------------
@router.post("/pre-liquidacion", response_model=PreLiquidacionResultado)
async def ejecutar_pre_liquidacion_endpoint(
    payload: PreLiquidacionInput,
    db: AsyncSession = Depends(obtener_db),
    db_erp: Optional[Session] = Depends(obtener_erp_db_opcional),
    _: Usuario = Depends(requiere_permiso_he_planificar),
):
    if len(payload.horas_por_dia) != 7:
        raise HTTPException(status_code=400, detail="horas_por_dia debe tener 7 valores (L-D)")

    if payload.codigos_por_dia and len(payload.codigos_por_dia) != 7:
        raise HTTPException(
            status_code=400, detail="codigos_por_dia debe tener 7 sublistas (una por día)"
        )

    salario_erp, nivel_erp = await resolver_parametros_empleado_erp(payload.cedula, db_erp)
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
    _: Usuario = Depends(requiere_permiso_he_leer),
):
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
    db_erp: Optional[Session] = Depends(obtener_erp_db_opcional),
    usuario: Usuario = Depends(requiere_permiso_he_confirmar),
):
    """
    Persiste un cálculo y sus efectos colaterales.

    Decisión C1: la bolsa se acredita al confirmar, no al cargar.
    Decisión H7: nomina_costo_ot se actualiza en tiempo real (UPSERT).
    Decisión H8: la bolsa es siempre del empleado (cedula), nunca de la OT.

    Idempotente sobre (cedula, anio, semana_iso): si ya existe, retorna 409.
    """
    if not payload.detalles:
        raise HTTPException(status_code=400, detail="detalles no puede estar vacío")

    salario_erp, nivel_erp = await resolver_parametros_empleado_erp(payload.cedula, db_erp)
    if abs(float(payload.salario_base_mensual) - salario_erp) > 0.01 or payload.nivel_riesgo_arl != nivel_erp:
        raise HTTPException(
            status_code=400,
            detail="El salario o nivel ARL no coincide con el empleado ERP vigente; recalcula la pre-liquidación",
        )
    await validar_importes_confirmacion(db, payload, salario_erp, nivel_erp)

    payload.usuario_confirma = str(getattr(usuario, "cedula", None) or usuario.id)

    try:
        resultado = await confirmar_pre_liquidacion(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return PreLiquidacionConfirmada(
        calculo_id=resultado["calculo_id"],
        bolsa_id=resultado["bolsa_id"],
        horas_acreditadas_bolsa=resultado["horas_acreditadas_bolsa"],
        movimientos_bolsa=resultado["movimientos_bolsa"],
        costo_ot_id=resultado["costo_ot_id"],
    )


@router.get("/calculos", response_model=List[CalculoSemanalRead])
async def listar_calculos_endpoint(
    cedula: Optional[str] = Query(None),
    anio: Optional[int] = Query(None),
    semana_iso: Optional[int] = Query(None, ge=1, le=53),
    estado: Optional[str] = Query(None, description="BORRADOR, CONFIRMADO, PAGADO, COMPENSADO, ANULADO"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    return await listar_calculos(
        db,
        cedula=cedula,
        anio=anio,
        semana_iso=semana_iso,
        estado=estado,
        limit=limit,
        offset=offset,
    )


@router.get("/calculos/{calculo_id}", response_model=CalculoSemanalRead)
async def obtener_calculo_endpoint(
    calculo_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    calc = await obtener_calculo_completo(db, calculo_id)
    if calc is None:
        raise HTTPException(status_code=404, detail=f"Cálculo {calculo_id} no encontrado")
    return calc


@router.get("/costos-ot", response_model=List[CostoOtRead])
async def listar_costos_ot_endpoint(
    ot_id: Optional[int] = Query(None),
    ot_codigo: Optional[str] = Query(None, max_length=50),
    anio: Optional[int] = Query(None),
    semana_iso: Optional[int] = Query(None, ge=1, le=53),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    return await listar_costos_ot(
        db,
        ot_id=ot_id,
        ot_codigo=ot_codigo,
        anio=anio,
        semana_iso=semana_iso,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# S4 — Workflow de estados y compensación de bolsa
# ---------------------------------------------------------------------------

@router.post("/calculos/{calculo_id}/transicion", response_model=WorkflowTransicionResult)
async def transicionar_calculo_endpoint(
    calculo_id: int = Path(..., ge=1),
    payload: WorkflowTransicionRequest = ...,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_confirmar),
):
    """
    Aplica una transición de estado al cálculo.
    - CONFIRMADO → PAGADO: solo cambia estado.
    - CONFIRMADO → COMPENSADO: consume horas de la bolsa (parcial o total).
    - CONFIRMADO → ANULADO: revierte la ACREDITACION y resta del costo_ot.
    """
    if payload.estado_destino == "COMPENSADO":
        await validar_permiso_he(db, usuario, PERMISO_HE_COMPENSAR)

    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        resultado = await transicionar_calculo(
            db,
            calculo_id=calculo_id,
            estado_destino=payload.estado_destino,
            justificacion=payload.justificacion,
            usuario_id=usuario_id,
            horas_compensar=payload.horas,
            fecha_compensacion=payload.fecha,
        )
        await db.commit()
    except ValueError as e:
        msg = str(e)
        if "no encontrado" in msg:
            raise HTTPException(status_code=404, detail=msg)
        if msg.startswith("BOLSA_DESACTIVADA"):
            raise HTTPException(
                status_code=409,
                detail={"code": "BOLSA_DESACTIVADA", "message": msg},
            )
        raise HTTPException(status_code=409, detail=msg)

    return WorkflowTransicionResult(
        calculo_id=resultado["calculo_id"],
        estado_anterior=resultado["estado_anterior"],
        estado_nuevo=resultado["estado_nuevo"],
        evento_id=resultado["evento_id"],
        movimiento_bolsa_id=resultado["movimiento_bolsa_id"],
        horas_afectadas=resultado["horas_afectadas"],
        mensaje=f"Cálculo {calculo_id} pasó de {resultado['estado_anterior']} a {resultado['estado_nuevo']}.",
    )


@router.get("/calculos/{calculo_id}/historial", response_model=List[WorkflowEventoRead])
async def listar_historial_endpoint(
    calculo_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_leer),
):
    """Bitácora de transiciones del cálculo (CONFIRMADO inicial + cada cambio)."""
    return await listar_eventos_calculo(db, calculo_id)


@router.post("/bolsa/compensar", response_model=CompensarBolsaResponse)
async def compensar_bolsa_endpoint(
    payload: CompensarBolsaRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_compensar),
):
    """
    Consume horas de la bolsa del empleado. Crea movimiento CONSUMO_TIEMPO.
    No requiere cálculo de origen (compensaciones administrativas).
    """
    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        resultado = await compensar_bolsa(
            db,
            cedula=payload.cedula,
            horas=payload.horas,
            fecha=payload.fecha,
            usuario_id=usuario_id,
            calculo_id=payload.calculo_id,
            observaciones=payload.observaciones,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return CompensarBolsaResponse(
        cedula=payload.cedula,
        movimiento_id=resultado["movimiento_id"],
        horas_compensadas=resultado["horas_compensadas"],
        horas_disponibles_despues=resultado["horas_disponibles_despues"],
        mensaje=f"Se compensaron {resultado['horas_compensadas']}h de la bolsa de {payload.cedula}.",
    )
# Los endpoints de festivos (/festivos/{anio} y /festivos/{anio}/sincronizar)
# viven en el sub-router horas_extras_festivos.py, incluido arriba.


# Los endpoints S6 de bolsa desactivable (GET estado-global, POST/DELETE
# overrides-ot, PUT admin/bolsa/global) viven en horas_extras_bolsa.py.
