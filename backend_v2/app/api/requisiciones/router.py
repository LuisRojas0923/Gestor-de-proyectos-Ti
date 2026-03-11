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
from .schemas import (
    RequisicionCrear, 
    RequisicionPublica, 
    RequisicionRevisionJefe, 
    RequisicionRevisionGH
)
import json
from datetime import datetime
from sqlalchemy import or_

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
    Lista las requisiciones de personal. Filtra según el rol y áreas asignadas.
    """
    try:
        if usuario_actual.rol == "admin":
            statement = select(RequisicionPersonal).offset(skip).limit(limit).order_by(RequisicionPersonal.fecha_creacion.desc())
        else:
            conditions = [RequisicionPersonal.id_creador == usuario_actual.id]
            
            # 1. Si es Jefe de Área, puede ver las de sus áreas asignadas
            areas = []
            if getattr(usuario_actual, "areas_asignadas", None):
                try:
                    areas = json.loads(usuario_actual.areas_asignadas)
                except:
                    pass
            if areas:
                conditions.append(RequisicionPersonal.area_destino.in_(areas))
                
            # 2. Si es de Gestión Humana, puede ver las que ya pasaron el primer filtro
            especialidades = []
            if getattr(usuario_actual, "especialidades", None):
                try:
                    especialidades = json.loads(usuario_actual.especialidades)
                except:
                    pass
            if "gestion_humana" in especialidades:
                conditions.append(RequisicionPersonal.estado.in_(["Pendiente de GH", "Aprobada", "Rechazada"]))
                
            statement = select(RequisicionPersonal).where(or_(*conditions)).offset(skip).limit(limit).order_by(RequisicionPersonal.fecha_creacion.desc())
            
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
    Obtiene una requisición específica por su ID.
    """
    requisicion = await db.get(RequisicionPersonal, requisicion_id)
    if not requisicion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requisición no encontrada"
        )
    
    # Verificar propiedad o permisos
    if requisicion.id_creador != usuario_actual.id and usuario_actual.rol != "admin":
        areas = []
        if getattr(usuario_actual, "areas_asignadas", None):
            try: areas = json.loads(usuario_actual.areas_asignadas)
            except: pass
            
        especialidades = []
        if getattr(usuario_actual, "especialidades", None):
            try: especialidades = json.loads(usuario_actual.especialidades)
            except: pass
            
        is_jefe = requisicion.area_destino in areas
        is_gh = "gestion_humana" in especialidades and requisicion.estado in ["Pendiente de GH", "Aprobada", "Rechazada"]
        
        if not is_jefe and not is_gh:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver esta requisición"
            )
        
    return requisicion

@router.patch("/{requisicion_id}/revision-jefe", response_model=RequisicionPublica)
async def revision_jefe(
    requisicion_id: str,
    revision: RequisicionRevisionJefe,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Registra la aprobación o rechazo de un Jefe de Área (Nivel 1).
    """
    requisicion = await db.get(RequisicionPersonal, requisicion_id)
    if not requisicion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisición no encontrada")
        
    if requisicion.estado != "Pendiente de Jefe":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La requisición no está pendiente de revisión por el jefe")
        
    areas = []
    if getattr(usuario_actual, "areas_asignadas", None):
        try: areas = json.loads(usuario_actual.areas_asignadas)
        except: pass
            
    if requisicion.area_destino not in areas and usuario_actual.rol != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para aprobar en esta área")
        
    requisicion.id_jefe_aprobador = usuario_actual.id
    requisicion.nombre_jefe_aprobador = usuario_actual.nombre
    requisicion.fecha_revision_jefe = datetime.now()
    requisicion.comentario_revision_jefe = revision.comentario
    
    if revision.aprobado:
        requisicion.estado = "Pendiente de GH"
    else:
        requisicion.estado = "Rechazada"
        
    try:
        await db.commit()
        await db.refresh(requisicion)
        return requisicion
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al procesar la revisión: {str(e)}")

@router.patch("/{requisicion_id}/revision-gh", response_model=RequisicionPublica)
async def revision_gh(
    requisicion_id: str,
    revision: RequisicionRevisionGH,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Registra la aprobación o rechazo de Gestión Humana (Nivel 2).
    """
    requisicion = await db.get(RequisicionPersonal, requisicion_id)
    if not requisicion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisición no encontrada")
        
    if requisicion.estado != "Pendiente de GH":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La requisición no está pendiente de revisión por GH")
        
    especialidades = []
    if getattr(usuario_actual, "especialidades", None):
        try: especialidades = json.loads(usuario_actual.especialidades)
        except: pass
            
    if "gestion_humana" not in especialidades and usuario_actual.rol != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso de Gestión Humana")
        
    requisicion.id_gh_aprobador = usuario_actual.id
    requisicion.nombre_gh_aprobador = usuario_actual.nombre
    requisicion.fecha_revision_gh = datetime.now()
    requisicion.comentario_revision_gh = revision.comentario
    
    if revision.aprobado:
        requisicion.estado = "Aprobada"
    else:
        requisicion.estado = "Rechazada"
        
    try:
        await db.commit()
        await db.refresh(requisicion)
        return requisicion
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al procesar la revisión: {str(e)}")
