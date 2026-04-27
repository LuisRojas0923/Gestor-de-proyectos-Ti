from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlmodel import Session
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.hdi_extractor import extraer_hdi
from ....services.novedades_nomina.medicina_prepagada_extractor import extraer_medicina_prepagada
from ....services.novedades_nomina.otros_gerencia_extractor import extraer_otros_gerencia
from ....services.novedades_nomina.polizas_vehiculos_extractor import extraer_polizas_vehiculos
from ....services.novedades_nomina.nomina_service import NominaService
from ....services.novedades_nomina.nomina_manual_service import NominaManualService
from ....services.erp.empleados_service import EmpleadosService

router = APIRouter(tags=["Otros"])

# SEGUROS HDI
@router.get("/hdi/datos")
async def datos_hdi(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "SEGUROS HDI", mes, anio)

@router.post("/hdi/preview")
async def preview_hdi(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "OTROS", "SEGUROS HDI", 
            extraer_hdi, "pdf", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Seguros HDI: {str(e)}")

# MEDICINA PREPAGADA
@router.get("/medicina_prepagada/datos")
async def datos_medicina(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "MEDICINA PREPAGADA", mes, anio)

@router.post("/medicina_prepagada/preview")
async def preview_medicina(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "OTROS", "MEDICINA PREPAGADA", 
            extraer_medicina_prepagada, "xls", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Medicina Prepagada: {str(e)}")

# OTROS GERENCIA
@router.get("/otros_gerencia/datos")
async def datos_otros_gerencia(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "OTROS GERENCIA", mes, anio)

@router.post("/otros_gerencia/preview")
async def preview_otros_gerencia(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "OTROS", "OTROS GERENCIA", 
            extraer_otros_gerencia, "xlsx", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Otros Gerencia: {str(e)}")

# OTROS GERENCIA - PROCESAMIENTO MANUAL
@router.post("/otros_gerencia/procesar-manual")
async def procesar_manual_otros_gerencia(
    payload: Dict = None,
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    if not payload:
        raise HTTPException(status_code=400, detail="Payload no proporcionado")
    
    mes = payload.get("mes")
    anio = payload.get("anio")
    data = payload.get("data")
    
    if not mes or not anio or data is None:
        raise HTTPException(status_code=400, detail="Faltan parámetros: mes, anio o data")
        
    try:
        return await NominaManualService.procesar_manual_otros_gerencia(
            session, db_erp, data, mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en procesamiento manual: {str(e)}")


@router.get("/otros_gerencia/empleado/{cedula}")
async def buscar_empleado_otros_gerencia(
    cedula: str, 
    db_erp = Depends(obtener_erp_db_opcional)
):
    if not db_erp:
        raise HTTPException(status_code=400, detail="Base de datos ERP no disponible")
    
    try:
        empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula, solo_activos=False)
        if not empleado:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        return empleado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando empleado: {str(e)}")


# POLIZAS VEHICULOS
@router.get("/polizas-vehiculos/datos")
async def datos_polizas(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "POLIZAS VEHICULOS", mes, anio)

@router.post("/polizas-vehiculos/preview")
async def preview_polizas(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "OTROS", "POLIZAS VEHICULOS", 
            extraer_polizas_vehiculos, "xlsx", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Pólizas Vehículos: {str(e)}")
