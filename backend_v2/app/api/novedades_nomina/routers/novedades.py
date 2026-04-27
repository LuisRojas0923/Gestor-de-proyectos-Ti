from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlmodel import Session
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.planillas_regionales_1q_extractor import extraer_planillas_regionales_1q
from ....services.novedades_nomina.planillas_regionales_2q_extractor import extraer_planillas_regionales_2q
from ....services.novedades_nomina.nomina_service import NominaService

router = APIRouter(tags=["Novedades"])

# PLANILLAS REGIONALES 1Q
@router.get("/planillas_regionales_1q/datos")
async def datos_planillas_1q(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "PLANILLAS REGIONALES 1Q", mes, anio)

@router.post("/planillas_regionales_1q/preview")
async def preview_planillas_1q(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "NOVEDADES", "PLANILLAS REGIONALES 1Q", 
            extraer_planillas_regionales_1q, "xlsm", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Planillas Regionales 1Q: {str(e)}")

# PLANILLAS REGIONALES 2Q
@router.get("/planillas_regionales_2q/datos")
async def datos_planillas_2q(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "PLANILLAS REGIONALES 2Q", mes, anio)

@router.post("/planillas_regionales_2q/preview")
async def preview_planillas_2q(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "NOVEDADES", "PLANILLAS REGIONALES 2Q", 
            extraer_planillas_regionales_2q, "xlsm", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Planillas Regionales 2Q: {str(e)}")

# Aquí se pueden agregar COMISIONES en el futuro
