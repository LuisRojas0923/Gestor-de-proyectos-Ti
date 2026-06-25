from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.novedades_nomina.nomina import NominaExcepcion, NominaExcepcionHistorial, NominaRegistroNormalizado
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
    # Asegurar que todas las fechas sean naive (sin zona horaria) para PostgreSQL
    try:
        if excepcion.fecha_inicio:
            if isinstance(excepcion.fecha_inicio, str):
                excepcion.fecha_inicio = NominaExcepcion.parse_dates(excepcion.fecha_inicio)
            elif isinstance(excepcion.fecha_inicio, datetime) and excepcion.fecha_inicio.tzinfo:
                excepcion.fecha_inicio = excepcion.fecha_inicio.replace(tzinfo=None)
        
        if excepcion.fecha_fin:
            if isinstance(excepcion.fecha_fin, str):
                excepcion.fecha_fin = NominaExcepcion.parse_dates(excepcion.fecha_fin)
            elif isinstance(excepcion.fecha_fin, datetime) and excepcion.fecha_fin.tzinfo:
                excepcion.fecha_fin = excepcion.fecha_fin.replace(tzinfo=None)
    except Exception as e:
        logger.warning(f"Error normalizando fechas de excepción: {e}")

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


@router.post("/registros/{registro_id}/vincular")
async def vincular_excepcion_a_registro(
    registro_id: int,
    excepcion_id: int,
    session: AsyncSession = Depends(obtener_db)
):
    """Vincula una excepción existente a una línea específica de factura."""
    registro = await session.get(NominaRegistroNormalizado, registro_id)
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    excepcion = await session.get(NominaExcepcion, excepcion_id)
    if not excepcion:
        raise HTTPException(status_code=404, detail="Excepción no encontrada")

    registro.excepcion_aplicada_id = excepcion_id
    registro.estado_validacion = "EXCEPTUADO"
    session.add(registro)

    historial = NominaExcepcionHistorial(
        excepcion_id=excepcion_id,
        mes=registro.mes_fact,
        anio=registro.año_fact,
        valor_aplicado=registro.valor,
        mensaje=f"Aplicada a registro #{registro_id} (Cédula: {registro.cedula}, Concepto: {registro.concepto})",
    )
    session.add(historial)

    await session.commit()
    await session.refresh(registro)
    return {"message": "Excepción vinculada", "registro_id": registro_id, "excepcion_id": excepcion_id}


@router.delete("/registros/{registro_id}/vincular")
async def desvincular_excepcion_de_registro(
    registro_id: int,
    session: AsyncSession = Depends(obtener_db)
):
    """Remueve la excepción aplicada a una línea de factura."""
    registro = await session.get(NominaRegistroNormalizado, registro_id)
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    if not registro.excepcion_aplicada_id:
        raise HTTPException(status_code=400, detail="Este registro no tiene excepción vinculada")

    registro.excepcion_aplicada_id = None
    registro.estado_validacion = "OK"
    session.add(registro)
    await session.commit()
    await session.refresh(registro)
    return {"message": "Excepción removida", "registro_id": registro_id}


class PeticionVincularDinamica(BaseModel):
    cedula: str
    concepto: str
    subcategoria: str
    mes: int
    anio: int
    excepcion_id: Optional[int] = None


@router.post("/vincular-dinamico")
async def vincular_excepcion_dinamico(
    pet: PeticionVincularDinamica,
    session: AsyncSession = Depends(obtener_db)
):
    """Vincula una excepción buscando la fila dinámicamente."""
    if not pet.excepcion_id:
        raise HTTPException(status_code=400, detail="excepcion_id es requerido")
        
    excepcion = await session.get(NominaExcepcion, pet.excepcion_id)
    if not excepcion:
        raise HTTPException(status_code=404, detail="Excepción no encontrada")

    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.cedula == pet.cedula,
        NominaRegistroNormalizado.concepto == pet.concepto,
        NominaRegistroNormalizado.mes_fact == pet.mes,
        NominaRegistroNormalizado.año_fact == pet.anio,
        NominaRegistroNormalizado.subcategoria_final.ilike(f"%{pet.subcategoria}%")
    )
    result = await session.execute(stmt)
    registro = result.scalars().first()

    if not registro:
        raise HTTPException(status_code=404, detail="El registro facturado no existe en base de datos. Por favor, asegúrese de Procesar Archivos primero.")

    registro.excepcion_aplicada_id = pet.excepcion_id
    registro.estado_validacion = "EXCEPTUADO"
    session.add(registro)

    historial = NominaExcepcionHistorial(
        excepcion_id=pet.excepcion_id,
        mes=registro.mes_fact,
        anio=registro.año_fact,
        valor_aplicado=registro.valor,
        mensaje=f"Aplicada a registro dinámico #{registro.id} (Cédula: {registro.cedula}, Concepto: {registro.concepto})",
    )
    session.add(historial)

    await session.commit()
    await session.refresh(registro)
    return {"message": "Excepción vinculada dinámicamente", "registro_id": registro.id, "excepcion_id": pet.excepcion_id}


@router.delete("/vincular-dinamico")
async def desvincular_excepcion_dinamico(
    pet: PeticionVincularDinamica,
    session: AsyncSession = Depends(obtener_db)
):
    """Remueve una excepción buscando la fila dinámicamente."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.cedula == pet.cedula,
        NominaRegistroNormalizado.concepto == pet.concepto,
        NominaRegistroNormalizado.mes_fact == pet.mes,
        NominaRegistroNormalizado.año_fact == pet.anio,
        NominaRegistroNormalizado.subcategoria_final.ilike(f"%{pet.subcategoria}%")
    )
    result = await session.execute(stmt)
    registro = result.scalars().first()

    if not registro:
        raise HTTPException(status_code=404, detail="Registro facturado no encontrado")

    if not registro.excepcion_aplicada_id:
        raise HTTPException(status_code=400, detail="Este registro no tiene excepción vinculada")

    excepcion_id = registro.excepcion_aplicada_id
    registro.excepcion_aplicada_id = None
    registro.estado_validacion = "OK"
    session.add(registro)

    # Si la excepción fue creada de manera "inline" (por línea), la eliminamos por completo
    if excepcion_id:
        ex = await session.get(NominaExcepcion, excepcion_id)
        if ex and ex.creado_por == 'INLINE':
            from sqlalchemy import delete as sql_delete
            await session.execute(sql_delete(NominaExcepcionHistorial).where(NominaExcepcionHistorial.excepcion_id == excepcion_id))
            await session.delete(ex)

    await session.commit()
    await session.refresh(registro)
    return {"message": "Excepción removida dinámicamente y regla eliminada si era inline", "registro_id": registro.id}


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
