"""
Router de Requisiciones de Personal - Backend V2
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlmodel import select

from ...database import obtener_db
from ...api.auth.router import obtener_usuario_actual_db
from ...models.auth.usuario import Usuario
from ...models.requisiciones.modelo import RequisicionPersonal
from .schemas import RequisicionCrear, RequisicionPublica

router = APIRouter()

@router.post("/", response_model=RequisicionPublica, status_code=status.HTTP_201_CREATED)
async def crear_requisicion(
    requisicion: RequisicionCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Crea una nueva requisición de personal.
    """
    try:
        # Generar ID secuencial manualmente (Formato: RP-0001)
        result_seq = await db.execute(text("SELECT nextval('requisiciones_personal_id_seq')"))
        next_val = result_seq.scalar()
        requisicion_id = f"RP-{next_val:04d}"

        nueva_requisicion = RequisicionPersonal(
            **requisicion.model_dump(),
            id=requisicion_id,
            id_creador=usuario_actual.id
        )
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
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Lista las requisiciones de personal del usuario actual.
    """
    try:
        statement = select(RequisicionPersonal).where(
            RequisicionPersonal.id_creador == usuario_actual.id
        ).offset(skip).limit(limit).order_by(RequisicionPersonal.fecha_creacion.desc())
        results = await db.execute(statement)
        return results.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener las requisiciones: {str(e)}"
        )

@router.get("/{requisicion_id}", response_model=RequisicionPublica)
async def obtener_requisicion(
    requisicion_id: str,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Obtiene una requisición específica por su ID, siempre que pertenezca al usuario.
    """
    requisicion = await db.get(RequisicionPersonal, requisicion_id)
    if not requisicion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requisición no encontrada"
        )
    
    # Verificar propiedad
    if requisicion.id_creador != usuario_actual.id and usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver esta requisición"
        )
        
    return requisicion
