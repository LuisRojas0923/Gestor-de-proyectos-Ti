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
from ....services.novedades_nomina.polizas_vehiculos_extractor import extraer_polizas_vehiculos
from ....services.novedades_nomina.excepcion_service import ExcepcionService

router = APIRouter(tags=["Otros - Pólizas Vehículos"])

@router.post("/polizas-vehiculos/preview")
async def preview_polizas_vehiculos(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.procesar_flujo(
        session=session,
        db_erp=db_erp,
        files=files,
        categoria="OTROS",
        subcategoria="POLIZAS VEHICULOS",
        extractor_fn=extraer_polizas_vehiculos,
        extension="xlsx",
        mes=mes,
        anio=anio
    )

@router.get("/polizas-vehiculos/datos")
async def obtener_datos_polizas(mes: int = Query(...), anio: int = Query(...), session: AsyncSession = Depends(obtener_db)):
    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.obtener_datos_periodo(
        session=session,
        subcategoria="POLIZAS VEHICULOS",
        mes=mes,
        anio=anio
    )
