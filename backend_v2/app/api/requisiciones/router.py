"""
Router de Requisiciones de Personal - Backend V2
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...database import obtener_db
from ...models.requisiciones.modelo import RequisicionPersonal
from .schemas import RequisicionCrear, RequisicionPublica

router = APIRouter()

@router.post("/", response_model=RequisicionPublica, status_code=status.HTTP_201_CREATED)
async def crear_requisicion(
    requisicion: RequisicionCrear,
    db: AsyncSession = Depends(obtener_db)
):
    """
    Crea una nueva requisición de personal.
    """
    try:
        nueva_requisicion = RequisicionPersonal(**requisicion.model_dump())
        db.add(nueva_requisicion)
        await db.commit()
        await db.refresh(nueva_requisicion)
        return nueva_requisicion
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la requisición: {str(e)}"
        )

@router.get("/", response_model=List[RequisicionPublica])
async def listar_requisiciones(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(obtener_db)
):
    """
    Lista las requisiciones de personal.
    """
    try:
        statement = select(RequisicionPersonal).offset(skip).limit(limit).order_by(RequisicionPersonal.fecha_creacion.desc())
        results = await db.execute(statement)
        return results.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener las requisiciones: {str(e)}"
        )

@router.get("/{requisicion_id}", response_model=RequisicionPublica)
async def obtener_requisicion(
    requisicion_id: int,
    db: AsyncSession = Depends(obtener_db)
):
    """
    Obtiene una requisición específica por su ID.
    """
    requisicion = await db.get(RequisicionPersonal, requisicion_id)
    if not requisicion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requisición no encontrada"
        )
    return requisicion
