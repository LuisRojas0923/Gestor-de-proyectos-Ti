"""
Router principal del módulo de Horas Extras y Pre-liquidación.

Endpoints:
  /api/v2/novedades-nomina/horas-extras/
    ├── catalogo/                    GET    Lista catálogo vigente
    ├── catalogo/                    POST   Crea novedad (admin)
    ├── catalogo/{codigo}            PUT    Actualiza novedad
    ├── factores-arl/                GET    Lista 5 niveles ARL
    ├── horario/{cedula}             GET    Horario cacheado del empleado
    ├── autorizacion/{cedula}        GET    Resolución efectiva (override > ERP)
    ├── overrides/                   POST   Registra override de autorización
    ├── overrides/{cedula}           GET    Historial de overrides
    ├── pre-liquidacion/             POST   Ejecuta cálculo semanal
    ├── pre-liquidacion/confirmar    POST   Persiste cálculo + acredita bolsa + UPSERT costo_ot
    ├── calculos/                    GET    Historial de cálculos confirmados
    ├── calculos/{id}                GET    Detalle de un cálculo
    ├── costos-ot/                   GET    Costos consolidados por OT
    └── bolsa/{cedula}               GET    Saldo actual de bolsa

Patrón: el router solo parsea, valida y delega al service.
La lógica de negocio y el acceso a DB viven en horas_extras_service.py.
"""
import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....api.auth.profile_router import obtener_usuario_actual_db
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
)
from ....services.auth.servicio import ServicioAuth
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
from ....services.novedades_nomina.horas_extras_confirmacion import (
    confirmar_pre_liquidacion,
    listar_calculos,
    obtener_calculo_completo,
    listar_costos_ot,
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
# Catálogo de novedades
# ---------------------------------------------------------------------------

@router.get("/catalogo", response_model=List[NovedadCatalogoRead])
async def listar_catalogo(
    categoria: Optional[str] = Query(None, description="HORA_EXTRA, AUSENCIA, LICENCIA, ..."),
    solo_acreditan_bolsa: bool = Query(False),
    fecha: Optional[date] = Query(None, description="Fecha de referencia para vigencia"),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
):
    return await listar_catalogo_vigente(
        db, categoria=categoria, solo_acreditan_bolsa=solo_acreditan_bolsa, fecha_referencia=fecha
    )


@router.post("/catalogo", response_model=NovedadCatalogoRead)
async def crear_novedad(
    payload: NovedadCatalogoCreate,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
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
    _: Usuario = Depends(requiere_permiso_he),
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
    _: Usuario = Depends(requiere_permiso_he),
):
    return await listar_factores_arl_todos(db)


# ---------------------------------------------------------------------------
# Horario pactado
# ---------------------------------------------------------------------------

@router.get("/horario/{cedula}", response_model=Optional[HorarioPactadoRead])
async def obtener_horario(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
):
    return await obtener_horario_pactado(db, cedula)


@router.get("/autorizacion/{cedula}", response_model=HorarioPactadoEfectivoRead)
async def obtener_autorizacion_efectiva(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
):
    horario = await obtener_horario_pactado(db, cedula)
    if horario is None:
        return HorarioPactadoEfectivoRead(
            cedula=cedula,
            autoriza_he=False,
            fuente="SIN_DATOS",
            horas_semana_ordinaria=48.0,
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
    usuario: Usuario = Depends(requiere_permiso_he),
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
    _: Usuario = Depends(requiere_permiso_he),
):
    return await listar_overrides_cedula(db, cedula, estado)


# ---------------------------------------------------------------------------
# Pre-liquidación
# ---------------------------------------------------------------------------

@router.post("/pre-liquidacion", response_model=PreLiquidacionResultado)
async def ejecutar_pre_liquidacion_endpoint(
    payload: PreLiquidacionInput,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
):
    if len(payload.horas_por_dia) != 7:
        raise HTTPException(status_code=400, detail="horas_por_dia debe tener 7 valores (L-D)")

    if payload.codigos_por_dia and len(payload.codigos_por_dia) != 7:
        raise HTTPException(
            status_code=400, detail="codigos_por_dia debe tener 7 sublistas (una por día)"
        )

    autoriza, fuente = await resolver_autorizacion_he(db, payload.cedula)
    if not autoriza:
        logger.warning(
            f"Pre-liquidación para {payload.cedula} sin autorización vigente (fuente={fuente})"
        )

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
    return resultado


# ---------------------------------------------------------------------------
# Bolsa de horas
# ---------------------------------------------------------------------------

@router.get("/bolsa/{cedula}")
async def obtener_bolsa(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he),
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
    usuario: Usuario = Depends(requiere_permiso_he),
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

    # Si el usuario no se especifica en payload, usar el del token
    if not payload.usuario_confirma:
        payload.usuario_confirma = getattr(usuario, "cedula", None) or usuario.id

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
    _: Usuario = Depends(requiere_permiso_he),
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
    _: Usuario = Depends(requiere_permiso_he),
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
    _: Usuario = Depends(requiere_permiso_he),
):
    return await listar_costos_ot(
        db,
        ot_id=ot_id,
        ot_codigo=ot_codigo,
        anio=anio,
        semana_iso=semana_iso,
        limit=limit,
    )
