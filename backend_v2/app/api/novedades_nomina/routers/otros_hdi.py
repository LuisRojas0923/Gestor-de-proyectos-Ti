import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select, delete
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, NominaExcepcion
)
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.hdi_extractor import extraer_hdi
from ....services.novedades_nomina.excepcion_service import ExcepcionService

router = APIRouter(tags=["Otros - HDI"])

@router.post("/hdi/preview")
async def preview_hdi(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.procesar_flujo(
        session=session,
        db_erp=db_erp,
        files=files,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        extractor_fn=extraer_hdi,
        extension="pdf",
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
