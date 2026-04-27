from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.novedades_nomina.nomina import NominaExcepcion, NominaExcepcionHistorial
from ....services.novedades_nomina.excepcion_service import ExcepcionService
from ....services.erp.empleados_service import EmpleadosService
from sqlalchemy.orm import Session
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/excepciones", tags=["Nómina - Excepciones"])

@router.get("/", response_model=List[NominaExcepcion])
async def listar_excepciones(
    subcategoria: Optional[str] = None,
    estado: Optional[str] = None,
    session: AsyncSession = Depends(obtener_db)
):
    stmt = select(NominaExcepcion)
    if subcategoria:
        stmt = stmt.where(NominaExcepcion.subcategoria == subcategoria)
    if estado:
        stmt = stmt.where(NominaExcepcion.estado == estado)
    
    try:
        result = await session.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Error al listar excepciones: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al consultar las excepciones")

@router.post("/")
async def crear_excepcion(
    excepcion: NominaExcepcion,
    session: AsyncSession = Depends(obtener_db)
):
    # Asegurar conversión manual si el validador fue omitido por SQLModel
    try:
        if isinstance(excepcion.fecha_inicio, str):
            excepcion.fecha_inicio = NominaExcepcion.parse_dates(excepcion.fecha_inicio)
        if isinstance(excepcion.fecha_fin, str):
            excepcion.fecha_fin = NominaExcepcion.parse_dates(excepcion.fecha_fin)
    except:
        pass

    # Validar que no exista otra excepción activa incompatible
    try:
        existing = await session.execute(
            select(NominaExcepcion).where(
                NominaExcepcion.cedula == excepcion.cedula,
                NominaExcepcion.subcategoria == excepcion.subcategoria,
                NominaExcepcion.estado == "ACTIVO"
            )
        )
    except Exception as e:
        logger.error(f"Error al verificar excepciones activas previas: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al consultar la base de datos")
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Ya existe una excepción activa para este colaborador y subcategoría.")

    if excepcion.tipo == 'SALDO_FAVOR' and excepcion.saldo_actual <= 0:
        excepcion.saldo_actual = excepcion.valor_configurado

    excepcion.creado_en = datetime.now()
    session.add(excepcion)
    await session.commit()
    await session.refresh(excepcion)
    return excepcion

@router.patch("/{excepcion_id}/estado")
async def cambiar_estado(
    excepcion_id: int,
    nuevo_estado: str,
    session: AsyncSession = Depends(obtener_db)
):
    ex = await session.get(NominaExcepcion, excepcion_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Excepción no encontrada")
    
    ex.estado = nuevo_estado
    ex.actualizado_en = datetime.now()
    session.add(ex)
    await session.commit()
    return ex

@router.get("/{excepcion_id}/historial", response_model=List[NominaExcepcionHistorial])
async def ver_historial(
    excepcion_id: int,
    session: AsyncSession = Depends(obtener_db)
):
    stmt = select(NominaExcepcionHistorial).where(NominaExcepcionHistorial.excepcion_id == excepcion_id).order_by(NominaExcepcionHistorial.creado_en.desc())
    try:
        result = await session.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Error al listar el historial de la excepción {excepcion_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al consultar el historial")

@router.delete("/{excepcion_id}")
async def eliminar_excepcion(
    excepcion_id: int,
    session: AsyncSession = Depends(obtener_db)
):
    try:
        ex = await session.get(NominaExcepcion, excepcion_id)
        if not ex:
            raise HTTPException(status_code=404, detail="Excepción no encontrada")
        
        # Eliminar historial relacionado primero para evitar errores de integridad
        from sqlalchemy import delete as sql_delete
        await session.execute(sql_delete(NominaExcepcionHistorial).where(NominaExcepcionHistorial.excepcion_id == excepcion_id))
        
        await session.delete(ex)
        await session.commit()
        return {"message": "Excepción eliminada"}
    except Exception as e:
        await session.rollback()
        logger.error(f"Error al eliminar excepción {excepcion_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar: {str(e)}")
@router.get("/validar-colaborador/{cedula}")
async def validar_colaborador(
    cedula: str,
    db_erp: Session = Depends(obtener_erp_db_opcional)
):
    if not db_erp:
        return {"nombre": None, "error": "ERP no disponible"}
    
    empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula, solo_activos=False)
    if empleado:
        return {
            "nombre": empleado["nombre"],
            "estado": empleado["estado"]
        }
    return {"nombre": None}
