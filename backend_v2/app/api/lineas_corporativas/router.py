from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from sqlmodel import select
from typing import List

from app.database import obtener_db, obtener_erp_db_opcional
from app.models.linea_corporativa import LineaCorporativa, EquipoMovil, EmpleadoLinea
from .schemas import (
    LineaCorporativaCreate, LineaCorporativaUpdate, LineaCorporativaOut,
    EquipoMovilCreate, EquipoMovilOut,
    EmpleadoLineaCreate, EmpleadoLineaOut
)
from datetime import datetime

router = APIRouter()

# --- ENDPOINTS EQUIPOS ---
@router.get("/equipos", response_model=List[EquipoMovilOut])
async def listar_equipos(db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(EquipoMovil))
    return result.scalars().all()

@router.post("/equipos", response_model=EquipoMovilOut)
async def crear_equipo(equipo_in: EquipoMovilCreate, db: AsyncSession = Depends(obtener_db)):
    db_obj = EquipoMovil(**equipo_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# --- ENDPOINTS PERSONAS ---
@router.get("/personas", response_model=List[EmpleadoLineaOut])
async def listar_personas(db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(EmpleadoLinea))
    return result.scalars().all()

@router.post("/personas", response_model=EmpleadoLineaOut)
async def crear_persona(persona_in: EmpleadoLineaCreate, db: AsyncSession = Depends(obtener_db)):
    db_obj = EmpleadoLinea(**persona_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# --- ENDPOINTS LINEAS ---
@router.get("/", response_model=List[LineaCorporativaOut])
async def listar_lineas(db: AsyncSession = Depends(obtener_db)):
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).order_by(LineaCorporativa.id.desc())
    result = await db.execute(query)
    return result.scalars().unique().all()

@router.get("/alertas-empleados")
async def obtener_alertas_empleados(db_erp: Session = Depends(obtener_erp_db_opcional), db_local: AsyncSession = Depends(obtener_db)):
    if db_erp is None:
        return {"error": "ERP no disponible", "alertas": {}}
    
    result = await db_local.execute(select(EmpleadoLinea.documento))
    cedulas = [str(c) for c in result.scalars().all() if c]
    
    if not cedulas:
        return {"alertas": {}}

    alertas = {}
    query = text("""
        SELECT DISTINCT ON (E.nrocedula)
            E.nrocedula AS nrocedula,
            C.estado AS estado,
            C.fecharetiro AS fecharetiro
        FROM establecimiento E
        LEFT JOIN contrato C ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
        WHERE TRIM(CAST(E.nrocedula AS TEXT)) IN :cedulas
        ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
    """)
    
    erp_result = db_erp.execute(query, {"cedulas": tuple(cedulas)}).fetchall()
    
    for row in erp_result:
        cedula = str(row.nrocedula).strip()
        estado = str(row.estado).strip()
        fecha_retiro = row.fecharetiro
        
        has_alert = False
        reasons = []
        if estado.lower() != 'activo':
            has_alert = True
            reasons.append(f"Estado: {estado}")
        if fecha_retiro and str(fecha_retiro)[:10] != '1900-01-01':
            has_alert = True
            reasons.append(f"Retiro: {fecha_retiro}")
            
        if has_alert:
            alertas[cedula] = {"inactivo": True, "motivos": ", ".join(reasons)}
            
    return {"alertas": alertas}

@router.post("/", response_model=LineaCorporativaOut, status_code=status.HTTP_201_CREATED)
async def crear_linea(linea_in: LineaCorporativaCreate, db: AsyncSession = Depends(obtener_db)):
    existing = await db.execute(select(LineaCorporativa).where(LineaCorporativa.linea == linea_in.linea))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="La linea corporativa ya se encuentra registrada.")
        
    db_linea = LineaCorporativa(**linea_in.model_dump())
    db.add(db_linea)
    await db.commit()
    await db.refresh(db_linea)
    
    # Reload with relationships
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).where(LineaCorporativa.id == db_linea.id)
    result = await db.execute(query)
    return result.scalar_one()

@router.get("/{id}", response_model=LineaCorporativaOut)
async def obtener_linea(id: int, db: AsyncSession = Depends(obtener_db)):
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).where(LineaCorporativa.id == id)
    result = await db.execute(query)
    linea = result.scalar_one_or_none()
    if not linea:
        raise HTTPException(status_code=404, detail="Linea no encontrada")
    return linea

@router.put("/{id}", response_model=LineaCorporativaOut)
async def actualizar_linea(id: int, linea_in: LineaCorporativaUpdate, db: AsyncSession = Depends(obtener_db)):
    db_linea = await db.get(LineaCorporativa, id)
    if not db_linea:
        raise HTTPException(status_code=404, detail="Linea no encontrada")
        
    update_data = linea_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_linea, key, value)
        
    db_linea.updated_at = datetime.utcnow()
    db.add(db_linea)
    await db.commit()
    
    # Reload with relationships
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).where(LineaCorporativa.id == id)
    result = await db.execute(query)
    return result.scalar_one()

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_linea(id: int, db: AsyncSession = Depends(obtener_db)):
    db_linea = await db.get(LineaCorporativa, id)
    if not db_linea:
        raise HTTPException(status_code=404, detail="Linea no encontrada")
    
    await db.delete(db_linea)
    await db.commit()
