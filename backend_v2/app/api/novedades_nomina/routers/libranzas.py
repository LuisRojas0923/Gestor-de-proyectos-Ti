from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlmodel import Session
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.bogota_extractor import extraer_bogota_libranza
from ....services.novedades_nomina.davivienda_extractor import extraer_davivienda_libranza
from ....services.novedades_nomina.occidente_extractor import extraer_occidente_libranza
from ....services.novedades_nomina.nomina_service import NominaService

router = APIRouter(tags=["Libranzas"])

# BOGOTA LIBRANZA
@router.get("/bogota_libranza/datos")
async def datos_bogota(
    mes: int = Query(...), 
    anio: int = Query(...),
    session: Session = Depends(obtener_db)
):
    return await NominaService.obtener_datos_periodo(session, "BOGOTA LIBRANZA", mes, anio)

@router.post("/bogota_libranza/preview")
async def preview_bogota(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    return await NominaService.procesar_flujo(
        session, db_erp, files, "LIBRANZAS", "BOGOTA LIBRANZA", 
        extraer_bogota_libranza, "xlsx", mes, anio
    )

# DAVIVIENDA LIBRANZA
@router.get("/l_davivienda/datos")
async def datos_davivienda(
    mes: int = Query(...), 
    anio: int = Query(...),
    session: Session = Depends(obtener_db)
):
    return await NominaService.obtener_datos_periodo(session, "DAVIVIENDA LIBRANZA", mes, anio)

@router.post("/l_davivienda/preview")
async def preview_davivienda(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    return await NominaService.procesar_flujo(
        session, db_erp, files, "LIBRANZAS", "DAVIVIENDA LIBRANZA", 
        extraer_davivienda_libranza, "xlsx", mes, anio
    )

# OCCIDENTE LIBRANZA
@router.get("/occidente_libranza/datos")
async def datos_occidente(
    mes: int = Query(...), 
    anio: int = Query(...),
    session: Session = Depends(obtener_db)
):
    return await NominaService.obtener_datos_periodo(session, "OCCIDENTE LIBRANZA", mes, anio)

@router.post("/occidente_libranza/preview")
async def preview_occidente(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    return await NominaService.procesar_flujo(
        session, db_erp, files, "LIBRANZAS", "OCCIDENTE LIBRANZA", 
        extraer_occidente_libranza, "xlsx", mes, anio
    )
