import asyncio
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.rate_limiter import limiter
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.hdi_extractor import extraer_hdi
from ....services.novedades_nomina.validacion_excel_hdi import (
    ArchivoHdiInvalido,
    MAX_FILE_SIZE_BYTES,
    validar_excel_hdi,
)
from ..dependencies import requiere_permiso_nomina_novedades


router = APIRouter(
    tags=["Otros - HDI"],
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)


@router.post("/hdi/preview")
@limiter.limit("5/minute")
async def preview_hdi(
    request: Request,
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_db_opcional),
):
    if len(files) != 1:
        raise HTTPException(
            status_code=400,
            detail="Seguros HDI requiere exactamente un archivo Excel por operación.",
        )

    archivo = files[0]
    contenido = await archivo.read(MAX_FILE_SIZE_BYTES + 1)
    await archivo.seek(0)
    try:
        extension = await asyncio.to_thread(
            validar_excel_hdi,
            contenido,
            archivo.filename or "",
            archivo.content_type,
        )
    except ArchivoHdiInvalido as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    from ....services.novedades_nomina.nomina_service import NominaService

    return await NominaService.procesar_flujo(
        session=session,
        db_erp=db_erp,
        files=files,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        extractor_fn=extraer_hdi,
        extension=extension,
        mes=mes,
        anio=anio,
    )


@router.get("/hdi/datos")
async def obtener_datos_hdi(
    mes: int = Query(...),
    anio: int = Query(...),
    session: AsyncSession = Depends(obtener_db),
):
    from ....services.novedades_nomina.nomina_service import NominaService

    return await NominaService.obtener_datos_periodo(
        session=session,
        subcategoria="SEGUROS HDI",
        mes=mes,
        anio=anio,
    )
