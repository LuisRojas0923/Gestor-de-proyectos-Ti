import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select, delete
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, NominaExcepcion
)
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.hdi_extractor import extraer_hdi
from ....services.novedades_nomina.excepcion_service import ExcepcionService
from ..dependencies import requiere_permiso_nomina_novedades
from ....core.rate_limiter import limiter

MAX_FILES = 5
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB por archivo
MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB total acumulado

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
    db_erp = Depends(obtener_erp_db_opcional)
):
    if not files:
        raise HTTPException(status_code=400, detail="Debe adjuntar al menos un archivo.")

    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Exceso de archivos: Se permite un máximo de {MAX_FILES} archivos por solicitud."
        )

    valid_exts = (".xlsx", ".xls")
    total_size = 0

    for f in files:
        filename = f.filename or ""
        ext = f".{filename.split('.')[-1].lower()}" if "." in filename else ""
        if ext not in valid_exts:
            raise HTTPException(
                status_code=415,
                detail=f"Formato no permitido para Seguros HDI: '{filename}'. Únicamente se aceptan archivos Excel (.xlsx, .xls)."
            )
        
        # Validar tamaño del archivo sin cargar todo en RAM desmedidamente
        f.file.seek(0, 2)
        file_size = f.file.tell()
        f.file.seek(0)

        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"El archivo '{filename}' ({round(file_size/(1024*1024), 2)} MB) supera el tamaño máximo permitido de 10 MB."
            )

        total_size += file_size
        if total_size > MAX_TOTAL_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"El tamaño total combinado de los archivos ({round(total_size/(1024*1024), 2)} MB) supera el límite de 25 MB."
            )
        
        # Validar magic bytes/firma binaria
        header = await f.read(1024)
        await f.seek(0)
        
        if header.startswith(b"%PDF"):
            raise HTTPException(
                status_code=415,
                detail="Formato rechazado: El archivo subido es un PDF. El módulo de Seguros HDI exige archivos Excel (.xlsx, .xls)."
            )
        
        is_zip = header.startswith(b"PK\x03\x04")
        is_ole = header.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
        if not (is_zip or is_ole):
            raise HTTPException(
                status_code=415,
                detail=f"El archivo '{filename}' no tiene una estructura binaria de Excel válida (.xlsx o .xls)."
            )

    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.procesar_flujo(
        session=session,
        db_erp=db_erp,
        files=files,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        extractor_fn=extraer_hdi,
        extension="xlsx",
        mes=mes,
        anio=anio
    )

@router.get("/hdi/datos")
async def obtener_datos_hdi(mes: int = Query(...), anio: int = Query(...), session: AsyncSession = Depends(obtener_db)):
    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.obtener_datos_periodo(
        session=session,
        subcategoria="SEGUROS HDI",
        mes=mes,
        anio=anio
    )
