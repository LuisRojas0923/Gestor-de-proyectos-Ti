"""
API de Desarrollos - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_
from app.database import obtener_db
from app.models.desarrollo.desarrollo import (
    Desarrollo,
    DesarrolloActualizar,
    DesarrolloCrear,
    TipoDesarrollo,
    ValidacionAsignacion,
)
from app.models.desarrollo.actividad import Actividad
from app.models.auth.usuario import Usuario
from app.api.auth.profile_router import obtener_usuario_actual_opcional

router = APIRouter()


@router.get("/", response_model=List[Desarrollo])
async def listar_desarrollos(
    skip: int = 0,
    limit: int = 100,
    estado: Optional[str] = None,
    solo_mios: bool = False,
    db: AsyncSession = Depends(obtener_db),
    usuario: Optional[Usuario] = Depends(obtener_usuario_actual_opcional),
):
    """Lista desarrollos. Con solo_mios=true filtra los que involucran al usuario autenticado."""
    try:
        query = select(Desarrollo).offset(skip).limit(limit)

        if estado:
            query = query.where(Desarrollo.estado_general == estado)

        if solo_mios and usuario:
            uid = usuario.id
            nombre = usuario.nombre
            query = query.where(
                or_(
                    Desarrollo.creado_por_id == uid,
                    Desarrollo.responsable_id == uid,
                    Desarrollo.analista == uid,
                    Desarrollo.analista == nombre,
                    Desarrollo.autoridad == uid,
                    Desarrollo.autoridad == nombre,
                    Desarrollo.responsable == uid,
                    Desarrollo.responsable == nombre,
                )
            )

        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar desarrollos: {str(e)}")


@router.post("/", response_model=Desarrollo)
async def crear_desarrollo(
    desarrollo_in: DesarrolloCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario: Optional[Usuario] = Depends(obtener_usuario_actual_opcional),
):
    """Crea un nuevo desarrollo con ID autogenerado (ACT-XXXXX)."""
    try:
        nueva_data = desarrollo_in.model_dump()
        
        # Generar ID consecutivo con prefijo ACT-
        query_max = select(Desarrollo.id).where(Desarrollo.id.like("ACT-%")).order_by(Desarrollo.id.desc()).limit(1)
        result_max = await db.execute(query_max)
        ultimo_id = result_max.scalar_one_or_none()
        
        if ultimo_id:
            try:
                # Extraer número del final (asumiendo formato ACT-XXXXX)
                numero = int(ultimo_id.split("-")[1])
                nuevo_numero = numero + 1
            except (ValueError, IndexError):
                # Si falla el parseo, buscamos el total de registros ACT-
                query_count = select(Desarrollo).where(Desarrollo.id.like("ACT-%"))
                result_count = await db.execute(query_count)
                nuevo_numero = len(result_count.scalars().all()) + 1
        else:
            nuevo_numero = 1
            
        nueva_data["id"] = f"ACT-{nuevo_numero:05d}"

        if usuario and not nueva_data.get("creado_por_id"):
            nueva_data["creado_por_id"] = usuario.id
            
        nuevo_desarrollo = Desarrollo(**nueva_data)
        db.add(nuevo_desarrollo)
        await db.commit()
        await db.refresh(nuevo_desarrollo)
        return nuevo_desarrollo
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear desarrollo: {str(e)}")


@router.get("/informe-detallado-casos-portal")
async def informe_detallado_casos_portal(
    db: AsyncSession = Depends(obtener_db)
):
    """Retorna el informe detallado de casos para el portal"""
    try:
        # Mock data compatible con usePortalReport.ts
        return {
            "total_casos": 2,
            "summary": {
                "status_distribution": {"En Desarrollo": 1, "Pruebas": 1},
                "provider_distribution": {"TI Interno": 2}
            },
            "casos": [
                {
                    "desarrollo_id": 101,
                    "nombre_desarrollo": "Mejora Login",
                    "notas_actividad": "En proceso de pruebas de integración",
                    "tipo_actividad": "Desarrollo",
                    "estado_actividad": "En Pruebas",
                    "nombre_etapa": "Pruebas QA",
                    "fecha_inicio_actividad": "2024-01-20",
                    "fecha_fin_actividad": "2024-01-25",
                    "tipo_actor": "Analista",
                    "proveedor": "TI Interno"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener informe de casos: {str(e)}")


@router.get("/tipos", response_model=List[TipoDesarrollo])
async def listar_tipos_desarrollo(
    incluir_inactivos: bool = False,
    db: AsyncSession = Depends(obtener_db),
):
    """Lista los tipos de desarrollo configurados"""
    try:
        query = select(TipoDesarrollo).order_by(TipoDesarrollo.orden, TipoDesarrollo.etiqueta)

        if not incluir_inactivos:
            query = query.where(TipoDesarrollo.esta_activo.is_(True))

        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar tipos de desarrollo: {str(e)}")


@router.get("/{desarrollo_id}", response_model=Desarrollo)
async def obtener_desarrollo(
    desarrollo_id: str, 
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene un desarrollo por su ID"""
    try:
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(query)
        desarrollo = result.scalar_one_or_none()
        
        if not desarrollo:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")
            
        return desarrollo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener desarrollo: {str(e)}")


@router.delete("/{desarrollo_id}", status_code=204)
async def eliminar_desarrollo(
    desarrollo_id: str,
    db: AsyncSession = Depends(obtener_db)
):
    """Elimina un desarrollo y todas sus actividades asociadas"""
    try:
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(query)
        db_desarrollo = result.scalar_one_or_none()

        if not db_desarrollo:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")

        # 1. Eliminar validaciones de asignación relacionadas al desarrollo o sus actividades
        # Esto previene errores de llave foránea (IntegrityError)
        actividades_ids_q = select(Actividad.id).where(Actividad.desarrollo_id == desarrollo_id)
        await db.execute(
            delete(ValidacionAsignacion).where(
                or_(
                    ValidacionAsignacion.desarrollo_id == desarrollo_id,
                    ValidacionAsignacion.actividad_id.in_(actividades_ids_q)
                )
            )
        )

        # 2. Eliminar actividades
        await db.execute(delete(Actividad).where(Actividad.desarrollo_id == desarrollo_id))
        
        # 3. Eliminar el desarrollo
        await db.delete(db_desarrollo)
        
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar desarrollo: {str(e)}")


@router.put("/{desarrollo_id}", response_model=Desarrollo)
async def actualizar_desarrollo(
    desarrollo_id: str,
    desarrollo: DesarrolloActualizar,
    db: AsyncSession = Depends(obtener_db)
):
    """Actualiza un desarrollo existente"""
    try:
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(query)
        db_desarrollo = result.scalar_one_or_none()

        if not db_desarrollo:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")

        update_data = desarrollo.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_desarrollo, key, value)

        await db.commit()
        await db.refresh(db_desarrollo)
        return db_desarrollo
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar desarrollo: {str(e)}")
