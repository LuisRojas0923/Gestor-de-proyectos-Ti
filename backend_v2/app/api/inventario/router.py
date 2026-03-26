from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from sqlmodel import select, and_
from ...database import obtener_db
from ...services.inventario.servicio import ServicioInventario
from ...models.inventario.conteo import ConteoInventario, AsignacionInventario, ConfiguracionInventario
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

router = APIRouter()

class ConteoUpdate(BaseModel):
    id: int
    cantidad: float
    observaciones: str = ""
    ronda: int # 1, 2, 3 o 4

class InventoryConfigUpdate(BaseModel):
    ronda_activa: int
    conteo_nombre: Optional[str] = None

@router.get("/config")
async def obtener_config_inventario(db: AsyncSession = Depends(obtener_db)):
    stmt = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        return {"ronda_activa": 1, "conteo_nombre": ""}
    return config

@router.post("/config")
async def actualizar_config_inventario(
    data: InventoryConfigUpdate, 
    db: AsyncSession = Depends(obtener_db)
):
    stmt = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        config = ConfiguracionInventario(id=1)
        db.add(config)
    
    config.ronda_activa = data.ronda_activa
    if data.conteo_nombre is not None:
        config.conteo_nombre = data.conteo_nombre
    config.ultima_actualizacion = datetime.now()
    
    await db.commit()
    await db.refresh(config)
    return config

@router.get("/mis-asignaciones")
async def obtener_mis_asignaciones(
    db: AsyncSession = Depends(obtener_db),
    # user: Any = Depends(get_current_user) # Descomentar cuando la auth esté lista
) -> List[Dict[str, Any]]:
    """
    Obtiene los productos que el usuario logueado tiene asignados según su ubicación.
    """
    # hardcoded para prueba o extraer de user.cedula
    cedula_usuario = "1107068093" 
    
    # 0. Obtener ronda activa
    stmt_config = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
    res_config = await db.execute(stmt_config)
    config = res_config.scalar_one_or_none()
    ronda_activa = config.ronda_activa if config else 1

    # 1. Buscar asignación
    stmt_asig = select(AsignacionInventario).where(AsignacionInventario.cedula == cedula_usuario)
    result_asig = await db.execute(stmt_asig)
    asignacion = result_asig.scalar_one_or_none()
    
    if not asignacion:
        return []
    
    # 2. Filtrar inventario por ubicación
    filtros = [
        ConteoInventario.bodega == asignacion.bodega,
        ConteoInventario.bloque == asignacion.bloque,
        ConteoInventario.estante == asignacion.estante
    ]
    
    if asignacion.nivel:
        filtros.append(ConteoInventario.nivel == asignacion.nivel)
        
    # 3. Lógica de Discrepancias (Conteo Ciego)
    if ronda_activa == 2:
        # Solo mostrar si hubo diferencia entre C1 y Sistema
        filtros.append(ConteoInventario.cant_c1 != ConteoInventario.cantidad_sistema)
    elif ronda_activa == 3:
        # Solo mostrar si hubo diferencia entre C1 y C2
        filtros.append(ConteoInventario.cant_c2 != ConteoInventario.cant_c1)
    elif ronda_activa == 4:
        # Solo mostrar si hubo diferencia entre C2 y C3
        filtros.append(ConteoInventario.cant_c3 != ConteoInventario.cant_c2)

    stmt_inv = select(ConteoInventario).where(and_(*filtros))
    result_inv = await db.execute(stmt_inv)
    productos = result_inv.scalars().all()
    
    return [p.dict() for p in productos]

@router.post("/guardar-conteo")
async def guardar_conteo(
    actualizacion: ConteoUpdate,
    db: AsyncSession = Depends(obtener_db)
) -> Dict[str, Any]:
    """
    Guarda el resultado de un conteo para una ronda específica.
    """
    stmt = select(ConteoInventario).where(ConteoInventario.id == actualizacion.id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    r = actualizacion.ronda
    if r == 1:
        item.cant_c1 = actualizacion.cantidad
        item.obs_c1 = actualizacion.observaciones
        item.user_c1 = "1107068093" # user.cedula
    elif r == 2:
        item.cant_c2 = actualizacion.cantidad
        item.obs_c2 = actualizacion.observaciones
        item.user_c2 = "1107068093"
    elif r == 3:
        item.cant_c3 = actualizacion.cantidad
        item.obs_c3 = actualizacion.observaciones
        item.user_c3 = "1107068093"
    elif r == 4:
        item.cant_c4 = actualizacion.cantidad
        item.obs_c4 = actualizacion.observaciones
        item.user_c4 = "1107068093"
    else:
        raise HTTPException(status_code=400, detail="Ronda inválida (1-4)")
    
    await db.commit()
    return {"exito": True, "mensaje": "Conteo guardado correctamente"}

@router.post("/cargar-excel")
async def cargar_excel(
    file: UploadFile = File(...),
    conteo: str = Form(...), # Nombre o identificador del conteo (ej: "Inventario_2026_Final")
    db: AsyncSession = Depends(obtener_db)
) -> Dict[str, Any]:
    """
    Sube un archivo Excel para cargar datos masivamente en la tabla de conteo.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xlsx o .xls)")
    
    try:
        content = await file.read()
        resultado = await ServicioInventario.importar_conteo_excel(content, conteo, db)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

@router.get("/health")
async def health_check():
    return {"status": "ok", "module": "inventario_2026"}
