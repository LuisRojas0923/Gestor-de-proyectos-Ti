"""Flujos de Celulares, Retenciones y Embargos."""

import logging
from pathlib import PurePath
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ....api.auth.router import obtener_usuario_actual_db
from ....core.rate_limiter import limiter
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.auth.usuario import Usuario
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.celulares_extractor import extraer_celulares
from ....services.novedades_nomina.embargos_extractor import extraer_embargos
from ....services.novedades_nomina.nomina_manual_service import NominaManualService
from ....services.novedades_nomina.nomina_service import NominaService
from ....services.novedades_nomina.retenciones_extractor import extraer_retenciones


logger = logging.getLogger(__name__)
router = APIRouter(tags=["Descuentos - Otros"])


def _extension_excel(files: list[UploadFile]) -> str:
    if not files:
        return "xlsx"
    return PurePath(files[0].filename or "").suffix.lower().removeprefix(".")


async def _procesar_preview(
    session: AsyncSession,
    db_erp: Any,
    files: list[UploadFile],
    mes: int,
    anio: int,
    subcategoria: str,
    extractor,
):
    return await NominaService.procesar_flujo(
        session=session,
        db_erp=db_erp,
        files=files,
        categoria="DESCUENTOS",
        subcategoria=subcategoria,
        extractor_fn=extractor,
        extension=_extension_excel(files),
        mes=mes,
        anio=anio,
    )


@router.get("/celulares/datos")
async def datos_celulares(
    mes: int, anio: int, session: AsyncSession = Depends(obtener_db)
):
    return await NominaService.obtener_datos_periodo(session, "CELULARES", mes, anio)


@router.post("/celulares/preview")
@limiter.limit("5/minute")
async def preview_celulares(
    request: Request,
    mes: int = Form(...),
    anio: int = Form(...),
    files: list[UploadFile] = File(...),
    session: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    return await _procesar_preview(
        session, db_erp, files, mes, anio, "CELULARES", extraer_celulares
    )


@router.get("/retenciones/datos")
async def datos_retenciones(
    mes: int, anio: int, session: AsyncSession = Depends(obtener_db)
):
    return await NominaService.obtener_datos_periodo(session, "RETENCIONES", mes, anio)


@router.post("/retenciones/preview")
@limiter.limit("5/minute")
async def preview_retenciones(
    request: Request,
    mes: int = Form(...),
    anio: int = Form(...),
    files: list[UploadFile] = File(...),
    session: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    return await _procesar_preview(
        session, db_erp, files, mes, anio, "RETENCIONES", extraer_retenciones
    )


@router.get("/embargos/datos")
async def datos_embargos(
    mes: int, anio: int, session: AsyncSession = Depends(obtener_db)
):
    return await NominaService.obtener_datos_periodo(session, "EMBARGOS", mes, anio)


@router.post("/embargos/preview")
@limiter.limit("5/minute")
async def preview_embargos(
    request: Request,
    mes: int = Form(...),
    anio: int = Form(...),
    files: list[UploadFile] = File(...),
    session: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    return await _procesar_preview(
        session, db_erp, files, mes, anio, "EMBARGOS", extraer_embargos
    )


@router.post("/embargos/procesar-manual")
async def procesar_manual_embargos(
    payload: dict | None = None,
    session: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    if not payload:
        raise HTTPException(status_code=400, detail="Payload no proporcionado")
    mes, anio, rows_data = payload.get("mes"), payload.get("anio"), payload.get("rows")
    if not mes or not anio or rows_data is None:
        raise HTTPException(status_code=400, detail="Faltan parámetros")
    try:
        return await NominaManualService.procesar_manual_embargos(
            session, db_erp, rows_data, mes, anio
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error procesando Embargos manual")
        raise HTTPException(
            status_code=500, detail="No fue posible procesar Embargos."
        ) from exc


@router.get("/embargos/empleado/{cedula}")
async def buscar_empleado_embargos(
    cedula: str,
    session: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
    user: Usuario = Depends(obtener_usuario_actual_db),
):
    if not db_erp:
        raise HTTPException(status_code=400, detail="ERP no disponible")
    empleado = await EmpleadosService.obtener_empleado_por_cedula(
        db_erp, cedula, solo_activos=False
    )
    if not empleado:
        raise HTTPException(status_code=404, detail="No encontrado")
    return empleado
