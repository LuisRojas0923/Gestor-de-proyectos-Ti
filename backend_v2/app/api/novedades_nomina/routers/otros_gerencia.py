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
from ....services.novedades_nomina.otros_gerencia_extractor import extraer_otros_gerencia
from ....services.novedades_nomina.nomina_manual_service import NominaManualService
from ....services.novedades_nomina.excepcion_service import ExcepcionService

from ....api.auth.router import obtener_usuario_actual_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.nomina import NominaFavorito

router = APIRouter(tags=["Otros - Gerencia"])

@router.post("/preview")
async def preview_otros_gerencia(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    from ....services.novedades_nomina.nomina_service import NominaService
    return await NominaService.procesar_flujo(
        session=session,
        db_erp=db_erp,
        files=files,
        categoria="OTROS",
        subcategoria="OTROS GERENCIA",
        extractor_fn=extraer_otros_gerencia,
        extension="xlsx",
        mes=mes,
        anio=anio
    )

@router.get("/datos")
async def obtener_datos_otros_gerencia(
    mes: int = Query(...), 
    anio: int = Query(...), 
    session: AsyncSession = Depends(obtener_db),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    from ....services.novedades_nomina.nomina_service import NominaService
    res = await NominaService.obtener_datos_periodo(
        session=session,
        subcategoria="OTROS GERENCIA",
        mes=mes,
        anio=anio
    )
    
    # Marcar favoritos
    stmt = select(NominaFavorito.cedula).where(
        NominaFavorito.usuario_id == user.id,
        NominaFavorito.subcategoria == "OTROS GERENCIA"
    )
    favs = (await session.execute(stmt)).scalars().all()
    fav_set = set(favs)
    
    for row in res.get("rows", []):
        row["is_favorite"] = row.get("cedula") in fav_set
        
    return res

@router.get("/favoritos")
async def listar_favoritos_otros_gerencia(
    session: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    stmt = select(NominaFavorito.cedula).where(
        NominaFavorito.usuario_id == user.id,
        NominaFavorito.subcategoria == "OTROS GERENCIA"
    )
    cedulas = (await session.execute(stmt)).scalars().all()
    if not cedulas: return []
    
    if not db_erp:
        return [{"cedula": c, "nombre": "ERP No Disponible", "estado": "N/A", "empresa": "N/A", "is_favorite": True} for c in cedulas]

    mapa_erp = await EmpleadosService.consultar_empleados_bulk(db_erp, list(cedulas))
    return [{
        "cedula": c,
        "nombre": mapa_erp.get(c, {}).get("nombre", "No Encontrado"),
        "estado": mapa_erp.get(c, {}).get("estado", "N/A"),
        "empresa": mapa_erp.get(c, {}).get("empresa", "N/A"),
        "is_favorite": True,
        "fondo_comun": 0,
        "descuento_empleadas": 0,
        "pago_empleadas": 0
    } for c in cedulas]

@router.post("/favoritos/toggle")
async def toggle_favorito_otros_gerencia(
    cedula: str,
    session: AsyncSession = Depends(obtener_db),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    stmt = select(NominaFavorito).where(
        NominaFavorito.usuario_id == user.id,
        NominaFavorito.cedula == cedula,
        NominaFavorito.subcategoria == "OTROS GERENCIA"
    )
    fav = (await session.execute(stmt)).scalar_one_or_none()
    
    if fav:
        await session.delete(fav)
        await session.commit()
        return {"status": "removed", "cedula": cedula}
    else:
        nuevo_fav = NominaFavorito(usuario_id=user.id, cedula=cedula, subcategoria="OTROS GERENCIA")
        session.add(nuevo_fav)
        await session.commit()
        return {"status": "added", "cedula": cedula}

@router.post("/procesar-manual")
async def procesar_manual_otros_gerencia(payload: Dict = None, session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    if not payload: raise HTTPException(status_code=400, detail="Payload no proporcionado")
    mes, anio, data = payload.get("mes"), payload.get("anio"), payload.get("data")
    if not mes or not anio or data is None: raise HTTPException(status_code=400, detail="Faltan parámetros")
    try:
        return await NominaManualService.procesar_manual_otros_gerencia(session, db_erp, data, mes, anio)
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/empleado/{cedula}")
async def buscar_empleado_otros_gerencia(
    cedula: str, 
    session: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    if not db_erp: raise HTTPException(status_code=400, detail="ERP no disponible")
    empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula, solo_activos=False)
    if not empleado: raise HTTPException(status_code=404, detail="No encontrado")
    
    stmt = select(NominaFavorito).where(
        NominaFavorito.usuario_id == user.id,
        NominaFavorito.cedula == cedula,
        NominaFavorito.subcategoria == "OTROS GERENCIA"
    )
    fav = (await session.execute(stmt)).scalar_one_or_none()
    empleado["is_favorite"] = fav is not None
    return empleado
