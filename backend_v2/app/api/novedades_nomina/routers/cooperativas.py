from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlmodel import Session
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.grancoop_extractor import extraer_grancoop
from ....services.novedades_nomina.beneficiar_extractor import extraer_beneficiar
from ....services.novedades_nomina.nomina_service import NominaService

router = APIRouter(tags=["Cooperativas"])

# GRANCOOP
@router.get("/grancoop/datos")
async def datos_grancoop(mes: int = Query(...), anio: int = Query(...), session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "GRANCOOP", mes, anio)

@router.post("/grancoop/preview")
async def preview_grancoop(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    return await NominaService.procesar_flujo(
        session, db_erp, files, "COOPERATIVAS", "GRANCOOP", 
        extraer_grancoop, "pdf", mes, anio
    )

# BENEFICIAR
@router.get("/beneficiar/datos")
async def datos_beneficiar(mes: int = Query(...), anio: int = Query(...), session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "BENEFICIAR", mes, anio)

@router.post("/beneficiar/preview")
async def preview_beneficiar(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    return await NominaService.procesar_flujo(
        session, db_erp, files, "COOPERATIVAS", "BENEFICIAR", 
        extraer_beneficiar, "pdf", mes, anio
    )
