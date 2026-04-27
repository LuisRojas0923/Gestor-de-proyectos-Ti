from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlmodel import Session
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.camposanto_extractor import extraer_camposanto
from ....services.novedades_nomina.recordar_extractor import extraer_recordar
from ....services.novedades_nomina.nomina_service import NominaService

router = APIRouter(tags=["Funebres"])

# CAMPOSANTO
@router.get("/camposanto/datos")
async def datos_camposanto(mes: int = Query(...), anio: int = Query(...), session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "CAMPOSANTO", mes, anio)

@router.post("/camposanto/preview")
async def preview_camposanto(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    return await NominaService.procesar_flujo(
        session, db_erp, files, "FUNEBRES", "CAMPOSANTO", 
        extraer_camposanto, "xlsx", mes, anio
    )

# RECORDAR
@router.get("/recordar/datos")
async def datos_recordar(mes: int = Query(...), anio: int = Query(...), session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "RECORDAR", mes, anio)

@router.post("/recordar/preview")
async def preview_recordar(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    return await NominaService.procesar_flujo(
        session, db_erp, files, "FUNEBRES", "RECORDAR", 
        extraer_recordar, "xlsx", mes, anio
    )
