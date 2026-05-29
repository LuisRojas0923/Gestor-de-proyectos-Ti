from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.nomina_service import NominaService
from ....services.novedades_nomina.nomina_manual_service import NominaManualService
from ....services.erp.empleados_service import EmpleadosService
from ....api.auth.router import obtener_usuario_actual_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.nomina import NominaFavorito

router = APIRouter(tags=["Comisiones"])

@router.get("/datos")
async def datos_comisiones(
    mes: int, 
    anio: int, 
    session: AsyncSession = Depends(obtener_db),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    """Obtiene los registros de comisiones para un periodo dado, incluyendo favoritos."""
    res = await NominaService.obtener_datos_periodo(session, "COMISIONES", mes, anio)
    
    # Obtener favoritos del usuario
    try:
        stmt = select(NominaFavorito.cedula).where(
            NominaFavorito.usuario_id == user.id,
            NominaFavorito.subcategoria == "COMISIONES"
        )
        result = await session.execute(stmt)
        favs = result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar favoritos: {str(e)}")
    fav_set = set(favs)
    
    # Marcar filas como favoritas
    for row in res.get("rows", []):
        row["is_favorite"] = row.get("cedula") in fav_set or row.get("CEDULA") in fav_set
        
    return res

@router.get("/favoritos")
async def listar_favoritos_comisiones(
    session: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    """Lista los asociados favoritos del usuario con su información actual del ERP."""
    stmt = select(NominaFavorito.cedula).where(
        NominaFavorito.usuario_id == user.id,
        NominaFavorito.subcategoria == "COMISIONES"
    )
    try:
        result = await session.execute(stmt)
        cedulas = result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar favoritos del usuario: {str(e)}")
    
    if not cedulas:
        return []
        
    if not db_erp:
        return [{"cedula": c, "nombre": "ERP No Disponible", "estado": "N/A", "empresa": "N/A", "is_favorite": True} for c in cedulas]

    mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, list(cedulas))
    
    favoritos = []
    for ced in cedulas:
        info = mapa_erp.get(ced, {"nombre": "No Encontrado", "estado": "N/A", "empresa": "N/A"})
        favoritos.append({
            "cedula": ced,
            "nombre": info["nombre"],
            "estado": info["estado"],
            "empresa": info["empresa"],
            "is_favorite": True,
            "valor": 0
        })
        
    return favoritos

@router.post("/favoritos/toggle")
async def toggle_favorito_comisiones(
    cedula: str,
    session: AsyncSession = Depends(obtener_db),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    """Agrega o quita un asociado de los favoritos del usuario."""
    stmt = select(NominaFavorito).where(
        NominaFavorito.usuario_id == user.id,
        NominaFavorito.cedula == cedula,
        NominaFavorito.subcategoria == "COMISIONES"
    )
    try:
        result = await session.execute(stmt)
        fav = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al verificar estado de favorito: {str(e)}")
    
    try:
        if fav:
            await session.delete(fav)
            await session.commit()
            return {"status": "removed", "cedula": cedula}
        else:
            nuevo_fav = NominaFavorito(
                usuario_id=user.id,
                cedula=cedula,
                subcategoria="COMISIONES"
            )
            session.add(nuevo_fav)
            await session.commit()
            return {"status": "added", "cedula": cedula}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar favorito: {str(e)}")

@router.post("/procesar-manual")
async def procesar_manual_comisiones(
    payload: Dict = None,
    session: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    """Procesa los datos de comisiones ingresados manualmente desde el frontend."""
    if not payload:
        raise HTTPException(status_code=400, detail="Payload no proporcionado")
    
    mes = payload.get("mes")
    anio = payload.get("anio")
    data = payload.get("data")
    
    if not mes or not anio or data is None:
        raise HTTPException(status_code=400, detail="Faltan parámetros: mes, anio o data")
        
    try:
        return await NominaManualService.procesar_manual_comisiones(
            session, db_erp, data, mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en procesamiento manual: {str(e)}")

@router.get("/empleado/{cedula}")
async def buscar_empleado_comisiones(
    cedula: str, 
    session: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
    user: Usuario = Depends(obtener_usuario_actual_db)
):
    """Busca un empleado en el ERP para autocompletar el formulario e incluye si es favorito."""
    if not db_erp:
        raise HTTPException(status_code=400, detail="Base de datos ERP no disponible")
    
    try:
        empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula, solo_activos=False)
        if not empleado:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        
        # Verificar si es favorito
        stmt = select(NominaFavorito).where(
            NominaFavorito.usuario_id == user.id,
            NominaFavorito.cedula == cedula,
            NominaFavorito.subcategoria == "COMISIONES"
        )
        fav = (await session.execute(stmt)).scalar_one_or_none()
        
        empleado["is_favorite"] = fav is not None
        return empleado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando empleado: {str(e)}")
