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
from ....services.novedades_nomina.medicina_prepagada_extractor import extraer_medicina_prepagada
from ....services.novedades_nomina.excepcion_service import ExcepcionService

router = APIRouter(tags=["Otros - Medicina Prepagada"])

@router.post("/medicina_prepagada/preview")
async def preview_medicina_prepagada(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.procesar_flujo(
        session=session,
        db_erp=db_erp,
        files=files,
        categoria="OTROS",
        subcategoria="MEDICINA PREPAGADA",
        extractor_fn=extraer_medicina_prepagada,
        extension="xlsx",
        mes=mes,
        anio=anio
    )

@router.get("/medicina_prepagada/datos")
async def obtener_datos_medicina_prepagada(mes: int = Query(...), anio: int = Query(...), session: AsyncSession = Depends(obtener_db)):
    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.obtener_datos_periodo(
        session=session,
        subcategoria="MEDICINA PREPAGADA",
        mes=mes,
        anio=anio
    )
