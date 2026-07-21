"""Consultas de calculos, costos e historial de Horas Extras."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db, obtener_erp_db_opcional
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras import (
    CalculoSemanalRead,
    CostoOtRead,
    WorkflowEventoRead,
)
from ....models.novedades_nomina.schemas_horas_extras_planilla import CalculoPlanillaRead
from ....services.auth.alcance_empleados_service import (
    autorizar_calculo_id,
    autorizar_cedula,
    cedulas_permitidas,
)
from ....services.novedades_nomina.horas_extras_confirmacion import (
    listar_calculos,
    listar_costos_ot,
    obtener_calculo_completo,
)
from ....services.novedades_nomina.horas_extras_workflow import listar_eventos_calculo
from ....services.novedades_nomina.horas_extras_planilla import listar_calculos_planilla
from .horas_extras_permisos import requiere_permiso_he_leer

router = APIRouter()


@router.get("/calculos", response_model=List[CalculoSemanalRead])
async def listar_calculos_endpoint(
    cedula: Optional[str] = Query(None),
    anio: Optional[int] = Query(None),
    semana_iso: Optional[int] = Query(None, ge=1, le=53),
    estado: Optional[str] = Query(None, description="BORRADOR, CONFIRMADO, PAGADO, COMPENSADO, ANULADO"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    permitidas = await cedulas_permitidas(db, usuario)
    if cedula:
        try:
            cedula = await autorizar_cedula(db, usuario, cedula)
        except (PermissionError, ValueError) as exc:
            raise HTTPException(404, "Recurso no encontrado") from exc
    return await listar_calculos(
        db,
        cedula=cedula,
        anio=anio,
        semana_iso=semana_iso,
        estado=estado,
        limit=limit,
        offset=offset,
        cedulas_permitidas=permitidas,
    )


@router.get("/calculos/planilla", response_model=List[CalculoPlanillaRead])
async def listar_calculos_planilla_endpoint(
    response: Response,
    cedula: Optional[str] = Query(None),
    anio: Optional[int] = Query(None),
    semana_iso: Optional[int] = Query(None, ge=1, le=53),
    estado: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    response.headers["Cache-Control"] = "no-store, private"
    permitidas = await cedulas_permitidas(db, usuario)
    if cedula:
        try:
            cedula = await autorizar_cedula(db, usuario, cedula)
        except (PermissionError, ValueError) as exc:
            raise HTTPException(404, "Recurso no encontrado") from exc
    return await listar_calculos_planilla(
        db,
        db_erp=db_erp,
        cedula=cedula,
        anio=anio,
        semana_iso=semana_iso,
        estado=estado,
        limit=limit,
        offset=offset,
        cedulas_permitidas=permitidas,
    )


@router.get("/calculos/{calculo_id}", response_model=CalculoSemanalRead)
async def obtener_calculo_endpoint(
    calculo_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    try:
        await autorizar_calculo_id(db, usuario, calculo_id)
    except LookupError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
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


@router.get("/calculos/{calculo_id}/historial", response_model=List[WorkflowEventoRead])
async def listar_historial_endpoint(
    calculo_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    """Bitácora de transiciones del cálculo (CONFIRMADO inicial + cada cambio)."""
    try:
        await autorizar_calculo_id(db, usuario, calculo_id)
    except LookupError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
    return await listar_eventos_calculo(db, calculo_id)
