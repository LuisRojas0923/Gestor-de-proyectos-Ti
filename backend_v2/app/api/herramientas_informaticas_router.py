from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import obtener_db
from ..services.herramientas_informaticas_service import HerramientasInformaticasService
from ..models.herramientas_informaticas.maestro import HerramientaInformatica
from .auth.router import obtener_usuario_actual_db

router = APIRouter(prefix="/herramientas-informaticas", tags=["Herramientas Informaticas"])

@router.get("/export-excel")
async def get_excel(
    db: AsyncSession = Depends(obtener_db),
    current_user: dict = Depends(obtener_usuario_actual_db)
):
    from fastapi.responses import StreamingResponse
    output = await HerramientasInformaticasService.export_excel(db)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inventario_herramientas.xlsx"}
    )

@router.get("/", response_model=List[HerramientaInformatica])
async def get_herramientas(
    db: AsyncSession = Depends(obtener_db),
    current_user: dict = Depends(obtener_usuario_actual_db)
):
    return await HerramientasInformaticasService.get_all(db)

@router.get("/{id}", response_model=HerramientaInformatica)
async def get_herramienta(
    id: int,
    db: AsyncSession = Depends(obtener_db),
    current_user: dict = Depends(obtener_usuario_actual_db)
):
    herramienta = await HerramientasInformaticasService.get_by_id(id, db)
    if not herramienta:
        raise HTTPException(status_code=404, detail="Herramienta no encontrada")
    return herramienta

@router.post("/", response_model=HerramientaInformatica, status_code=status.HTTP_201_CREATED)
async def create_herramienta(
    data: dict,
    db: AsyncSession = Depends(obtener_db),
    current_user: dict = Depends(obtener_usuario_actual_db)
):
    # Validar permisos si es necesario (ej: solo admin)
    return await HerramientasInformaticasService.create(data, db)

@router.put("/{id}", response_model=HerramientaInformatica)
async def update_herramienta(
    id: int,
    data: dict,
    db: AsyncSession = Depends(obtener_db),
    current_user: dict = Depends(obtener_usuario_actual_db)
):
    herramienta = await HerramientasInformaticasService.update(id, data, db)
    if not herramienta:
        raise HTTPException(status_code=404, detail="Herramienta no encontrada")
    return herramienta

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_herramienta(
    id: int,
    db: AsyncSession = Depends(obtener_db),
    current_user: dict = Depends(obtener_usuario_actual_db)
):
    success = await HerramientasInformaticasService.delete(id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Herramienta no encontrada")
    return None
