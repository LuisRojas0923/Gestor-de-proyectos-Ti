"""
API de Desarrollos - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, func, case
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
from app.api.auth.profile_router import obtener_usuario_actual_opcional, obtener_usuario_actual_db
from app.services.jerarquia.service import JerarquiaService
from app.services.auditoria.snapshots import (
    asignar_actualizacion_segura,
    asignar_creacion_segura,
    asignar_eliminacion_segura,
    modelo_a_dict_auditoria,
)

router = APIRouter()


@router.get("/")
async def listar_desarrollos(
    response: Response,
    skip: int = Query(0, ge=0, description="Número de registros a saltar (paginación)"),
    limit: int = Query(100, ge=1, le=500, description="Tamaño de página (máx 500)"),
    estado: Optional[str] = None,
    solo_mios: bool = False,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Lista desarrollos con autenticación obligatoria y filtrado jerárquico/rol.

    Devuelve el total del conjunto filtrado (antes de paginar) en el header
    ``X-Total-Count`` para que el cliente pueda mostrar "Cargar más" cuando
    el resultado supere el ``limit``.
    """
    try:
        # Si no es admin y no es director, forzar obligatoriamente solo_mios=True
        if usuario.rol not in ("admin", "director"):
            solo_mios = True

        filtros = []
        if estado:
            filtros.append(Desarrollo.estado_general == estado)

        if solo_mios and usuario:
            uid = usuario.id
            nombre = usuario.nombre

            # Obtener subordinados jerárquicos del usuario (IDs y nombres)
            subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, uid)
            todos_los_ids = [uid] + subordinados["ids"]
            todos_los_nombres = [nombre] + subordinados["nombres"]

            # Subconsulta para desarrollos donde el usuario o subordinados tienen actividades asignadas
            subquery_act = select(Actividad.desarrollo_id).where(
                or_(
                    Actividad.asignado_a_id.in_(todos_los_ids),
                    Actividad.responsable_id.in_(todos_los_ids),
                    Actividad.delegado_por_id.in_(todos_los_ids)
                )
            )

            filtros.append(
                or_(
                    Desarrollo.creado_por_id.in_(todos_los_ids),
                    Desarrollo.responsable_id.in_(todos_los_ids),
                    Desarrollo.analista.in_(todos_los_nombres),
                    Desarrollo.supervisor.in_(todos_los_nombres),
                    Desarrollo.autoridad.in_(todos_los_nombres),
                    Desarrollo.responsable.in_(todos_los_nombres),
                    Desarrollo.id.in_(subquery_act),
                )
            )

        # Conteo total sobre el conjunto filtrado (mismos `filtros`, sin offset/limit)
        count_query = select(func.count()).select_from(Desarrollo)
        for f in filtros:
            count_query = count_query.where(f)
        total_result = await db.execute(count_query)
        total = int(total_result.scalar() or 0)
        response.headers["X-Total-Count"] = str(total)

        # Página de datos, ordenada por id para que la paginación sea estable
        query = select(Desarrollo).order_by(Desarrollo.id).offset(skip).limit(limit)
        for f in filtros:
            query = query.where(f)

        result = await db.execute(query)
        desarrollos = result.scalars().all()

        ids_pagina = [desarrollo.id for desarrollo in desarrollos]
        conteos_por_desarrollo = {}
        if ids_pagina:
            conteos_query = (
                select(
                    Actividad.desarrollo_id,
                    func.count(Actividad.id).label("tareas_totales"),
                    func.sum(
                        case(
                            (Actividad.estado.in_(("Completada", "Completado")), 1),
                            else_=0,
                        )
                    ).label("tareas_completadas"),
                )
                .where(Actividad.desarrollo_id.in_(ids_pagina))
                .group_by(Actividad.desarrollo_id)
            )
            conteos_result = await db.execute(conteos_query)
            conteos_por_desarrollo = {
                row.desarrollo_id: {
                    "tareas_totales": int(row.tareas_totales or 0),
                    "tareas_completadas": int(row.tareas_completadas or 0),
                }
                for row in conteos_result
            }

        return [
            {
                **desarrollo.model_dump(),
                "tareas_totales": conteos_por_desarrollo.get(desarrollo.id, {}).get("tareas_totales", 0),
                "tareas_completadas": conteos_por_desarrollo.get(desarrollo.id, {}).get("tareas_completadas", 0),
            }
            for desarrollo in desarrollos
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar desarrollos: {str(e)}")


@router.post("/", response_model=Desarrollo)
async def crear_desarrollo(
    request: Request,
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

        request.state.auditoria_entidad_tipo = "desarrollo"
        request.state.auditoria_entidad_id = nuevo_desarrollo.id
        asignar_creacion_segura(request, nuevo_desarrollo)

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
    request: Request,
    desarrollo_id: str,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Elimina un desarrollo y todas sus actividades asociadas"""
    try:
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(query)
        db_desarrollo = result.scalar_one_or_none()

        if not db_desarrollo:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")

        snapshot_antes = modelo_a_dict_auditoria(db_desarrollo)

        # Validar permisos para eliminar el desarrollo — sin bypass de roles
        tiene_acceso = db_desarrollo.creado_por_id == usuario.id
        
        if not tiene_acceso:
            # O si el creador o responsable del desarrollo es un subordinado jerárquico
            subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, usuario.id)
            todos_los_ids = [usuario.id] + subordinados["ids"]
            if db_desarrollo.creado_por_id in todos_los_ids or db_desarrollo.responsable_id in todos_los_ids:
                tiene_acceso = True

        if not tiene_acceso:
            raise HTTPException(
                status_code=403,
                detail="No tiene permisos para eliminar este desarrollo"
            )

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

        request.state.auditoria_entidad_tipo = "desarrollo"
        request.state.auditoria_entidad_id = desarrollo_id
        asignar_eliminacion_segura(request, snapshot_antes)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar desarrollo: {str(e)}")


@router.put("/{desarrollo_id}", response_model=Desarrollo)
async def actualizar_desarrollo(
    request: Request,
    desarrollo_id: str,
    desarrollo: DesarrolloActualizar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza un desarrollo existente"""
    try:
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(query)
        db_desarrollo = result.scalar_one_or_none()

        if not db_desarrollo:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")

        snapshot_antes = modelo_a_dict_auditoria(db_desarrollo)
        update_data = desarrollo.model_dump(exclude_unset=True)
        estado_previo = db_desarrollo.estado_general
        nuevo_estado = update_data.get("estado_general")

        for key, value in update_data.items():
            setattr(db_desarrollo, key, value)

        # Lógica de cascada para Pausa / Reanudación
        if nuevo_estado and nuevo_estado != estado_previo:
            if nuevo_estado == "Pausado":
                # Pausar todas las actividades "Pendiente"
                query_act = select(Actividad).where(
                    Actividad.desarrollo_id == desarrollo_id,
                    Actividad.estado == "Pendiente"
                )
                result_act = await db.execute(query_act)
                for actividad in result_act.scalars().all():
                    actividad.estado = "Pausa"
                    db.add(actividad)
            elif nuevo_estado in ("En curso", "En Proceso") and estado_previo == "Pausado":
                # Reanudar todas las actividades "Pausa" a "Pendiente"
                query_act = select(Actividad).where(
                    Actividad.desarrollo_id == desarrollo_id,
                    Actividad.estado == "Pausa"
                )
                result_act = await db.execute(query_act)
                for actividad in result_act.scalars().all():
                    actividad.estado = "Pendiente"
                    db.add(actividad)

        await db.commit()
        await db.refresh(db_desarrollo)
        asignar_actualizacion_segura(request, snapshot_antes, db_desarrollo)
        return db_desarrollo
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar desarrollo: {str(e)}")
