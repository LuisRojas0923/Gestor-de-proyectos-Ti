"""
API de Plantillas de Actividades (WBS) - Backend V2
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import obtener_db
from app.models.desarrollo.plantilla_actividad import (
    PlantillaActividad,
    PlantillaActividadCrear,
    PlantillaActividadActualizar,
    PlantillaActividadLeer,
    PlantillaActividadArbol,
    AplicarPlantillaRequest,
)
from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo

router = APIRouter()


@router.post("/", response_model=PlantillaActividadLeer)
async def crear_plantilla_actividad(
    plantilla_in: PlantillaActividadCrear, db: AsyncSession = Depends(obtener_db)
):
    try:
        nueva_plantilla_data = plantilla_in.model_dump()
        nueva_plantilla = PlantillaActividad(**nueva_plantilla_data)
        db.add(nueva_plantilla)
        await db.commit()
        await db.refresh(nueva_plantilla)
        return nueva_plantilla
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al crear plantilla: {str(e)}"
        )


@router.get("/raices", response_model=List[PlantillaActividadLeer])
async def obtener_plantillas_raices(db: AsyncSession = Depends(obtener_db)):
    """Obtiene solo las plantillas principales (raíces) para listar"""
    try:
        stmt = select(PlantillaActividad).where(PlantillaActividad.parent_id == None)
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al listar plantillas: {str(e)}"
        )


@router.get("/{raiz_id}/arbol", response_model=PlantillaActividadArbol)
async def obtener_arbol_plantilla(raiz_id: int, db: AsyncSession = Depends(obtener_db)):
    """Obtiene el árbol completo de una plantilla."""
    try:
        # Recursive CTE o carga eager (aquí simulamos carga de todas con el mismo nombre_plantilla)
        # Para simplificar, asumimos que todas las de la misma raíz tienen el mismo nombre (o buscamos iterativamente)
        # Una forma mejor es traer la base y buscar recursivamente o cargar todo y filtrar

        # Obtenemos la raíz primero
        stmt_raiz = select(PlantillaActividad).where(PlantillaActividad.id == raiz_id)
        raiz = (await db.execute(stmt_raiz)).scalar_one_or_none()

        if not raiz:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")

        # Obtenemos todos los nodos con ese nombre de plantilla
        stmt_todos = select(PlantillaActividad).where(
            PlantillaActividad.nombre_plantilla == raiz.nombre_plantilla
        )
        todos = (await db.execute(stmt_todos)).scalars().all()

        nodos_dict = {
            p.id: PlantillaActividadArbol(
                id=p.id,
                nombre_plantilla=p.nombre_plantilla,
                parent_id=p.parent_id,
                titulo=p.titulo,
                descripcion=p.descripcion,
                horas_estimadas=p.horas_estimadas,
                creado_en=p.creado_en,
                actualizado_en=p.actualizado_en,
                subactividades=[],
            )
            for p in todos
        }

        for p in todos:
            p_dto = nodos_dict[p.id]
            if p.parent_id is not None:
                padre = nodos_dict.get(p.parent_id)
                if padre:
                    padre.subactividades.append(p_dto)

        return nodos_dict[raiz_id]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener árbol de plantilla: {str(e)}"
        )


@router.patch("/{plantilla_id}", response_model=PlantillaActividadLeer)
async def actualizar_plantilla(
    plantilla_id: int,
    plantilla_in: PlantillaActividadActualizar,
    db: AsyncSession = Depends(obtener_db),
):
    try:
        stmt = select(PlantillaActividad).where(PlantillaActividad.id == plantilla_id)
        result = await db.execute(stmt)
        plantilla_db = result.scalar_one_or_none()

        if not plantilla_db:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")

        data = plantilla_in.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(plantilla_db, key, value)

        await db.commit()
        await db.refresh(plantilla_db)
        return plantilla_db
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar plantilla: {str(e)}"
        )


@router.post("/aplicar", response_model=dict)
async def aplicar_plantilla_a_desarrollo(
    request: AplicarPlantillaRequest, db: AsyncSession = Depends(obtener_db)
):
    """Aplica una plantilla clonando su árbol como actividades de un desarrollo"""
    try:
        # Verificar desarrollo
        stmt_dev = select(Desarrollo).where(Desarrollo.id == request.desarrollo_id)
        dev = (await db.execute(stmt_dev)).scalar_one_or_none()
        if not dev:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")

        # Cargar árbol de plantilla
        stmt_raiz = select(PlantillaActividad).where(
            PlantillaActividad.id == request.plantilla_raiz_id
        )
        raiz = (await db.execute(stmt_raiz)).scalar_one_or_none()
        if not raiz:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")

        stmt_todos = select(PlantillaActividad).where(
            PlantillaActividad.nombre_plantilla == raiz.nombre_plantilla
        )
        todos_plantilla = (await db.execute(stmt_todos)).scalars().all()

        if not todos_plantilla:
            return {"message": "Plantilla vacía"}

        # Diccionario para mapear ID antiguo -> Nivel en arbol/nodo original (para reconstruir)
        # Insertaremos en orden asegurando que los padres se inserten primero.
        # Orden topológico o por jerarquía:
        nodos_por_id = {p.id: p for p in todos_plantilla}
        id_map = {}  # old_id -> new_actividad_id

        # Encontrar la raíz
        def recursividad_crear_actividad(plantilla_nodo, parent_id_nuevo=None):
            # Crear nueva actividad
            nueva_act = Actividad(
                desarrollo_id=request.desarrollo_id,
                parent_id=parent_id_nuevo,
                titulo=plantilla_nodo.titulo,
                descripcion=plantilla_nodo.descripcion,
                horas_estimadas=plantilla_nodo.horas_estimadas,
                estado="Pendiente",
                porcentaje_avance=0,
            )
            return nueva_act

        # Vamos a simular un grafo para insertar padres primero
        pendientes = [p for p in todos_plantilla if p.parent_id is None]
        nuevas_actividades = []

        while pendientes:
            nodo = pendientes.pop(0)
            nuevo_padre_id = id_map.get(nodo.parent_id) if nodo.parent_id else None

            nueva_act = recursividad_crear_actividad(nodo, nuevo_padre_id)
            db.add(nueva_act)
            await db.flush()  # Para generar el ID inmediatamente

            id_map[nodo.id] = nueva_act.id
            nuevas_actividades.append(nueva_act)

            # Agregar hijos a pendientes
            hijos = [p for p in todos_plantilla if p.parent_id == nodo.id]
            pendientes.extend(hijos)

        await db.commit()
        return {
            "success": True,
            "message": f"{len(nuevas_actividades)} actividades creadas.",
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error clonando plantilla: {str(e)}"
        )
