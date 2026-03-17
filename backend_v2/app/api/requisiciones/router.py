"""
Router de Requisiciones de Personal - Backend V2
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
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
        # Recargar con relaciones para la respuesta
        statement = select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id).options(selectinload(RequisicionPersonal.detalles_agencias))
        result = await db.execute(statement)
        return result.scalar_one()
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
            statement = select(RequisicionPersonal).options(selectinload(RequisicionPersonal.detalles_agencias)).offset(skip).limit(limit).order_by(RequisicionPersonal.fecha_creacion.desc())
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
            especialidades_raw = getattr(usuario_actual, "especialidades", "") or ""
            especialidades = []
            if especialidades_raw:
                try:
                    loaded = json.loads(especialidades_raw)
                    especialidades = loaded if isinstance(loaded, list) else [loaded]
                except:
                    especialidades = [especialidades_raw]
                    
            if "gestion_humana" in especialidades:
                # GH puede ver todas para el módulo de control
                statement = select(RequisicionPersonal).options(selectinload(RequisicionPersonal.detalles_agencias)).offset(skip).limit(limit).order_by(RequisicionPersonal.fecha_creacion.desc())
            else:
                statement = select(RequisicionPersonal).options(selectinload(RequisicionPersonal.detalles_agencias)).where(or_(*conditions)).offset(skip).limit(limit).order_by(RequisicionPersonal.fecha_creacion.desc())
            
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
    statement = select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id).options(selectinload(RequisicionPersonal.detalles_agencias))
    result = await db.execute(statement)
    requisicion = result.scalar_one_or_none()
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
    statement = select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id).options(selectinload(RequisicionPersonal.detalles_agencias))
    result = await db.execute(statement)
    requisicion = result.scalar_one_or_none()
    if not requisicion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisición no encontrada")
        
    if requisicion.estado != "Pendiente de Jefe":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La requisición no está pendiente de revisión por el jefe")
        
    areas = []
    if getattr(usuario_actual, "areas_asignadas", None):
        try: 
            areas = json.loads(usuario_actual.areas_asignadas)
        except: 
            pass
            
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
        # Recargar con relaciones para la respuesta
        statement = select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id).options(selectinload(RequisicionPersonal.detalles_agencias))
        result = await db.execute(statement)
        return result.scalar_one()
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
    statement = select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id).options(selectinload(RequisicionPersonal.detalles_agencias))
    result = await db.execute(statement)
    requisicion = result.scalar_one_or_none()
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
        # Recargar con relaciones para la respuesta
        statement = select(RequisicionPersonal).where(RequisicionPersonal.id == requisicion_id).options(selectinload(RequisicionPersonal.detalles_agencias))
        result = await db.execute(statement)
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al procesar la revisión: {str(e)}")

@router.patch("/{req_id}", response_model=RequisicionPublica)
async def actualizar_requisicion(
    req_id: str,
    datos: dict,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Actualiza parcialmente una requisición (Campos de control).
    """
    statement = select(RequisicionPersonal).where(RequisicionPersonal.id == req_id).options(selectinload(RequisicionPersonal.detalles_agencias))
    result = await db.execute(statement)
    requisicion = result.scalar_one_or_none()
    if not requisicion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisición no encontrada")
        
    # Verificación de permisos via RBAC: consulta permisos del rol en la BD
    # Esto soporta usuarios admin, locales (analyst/gestion_humana) y del portal ERP
    is_admin = usuario_actual.rol == "admin"
    is_gh = False

    if not is_admin:
        from app.services.auth.servicio import ServicioAuth
        permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario_actual.rol)
        is_gh = "gestion_humana" in permisos

        # Fallback: revisar también el campo especialidades (usuarios con rol personalizado)
        if not is_gh:
            raw_esp = getattr(usuario_actual, "especialidades", None) or ""
            if raw_esp:
                try:
                    loaded = json.loads(raw_esp)
                    especialidades = loaded if isinstance(loaded, list) else [str(loaded)]
                except Exception:
                    especialidades = [s.strip() for s in raw_esp.split(",") if s.strip()]
                is_gh = "gestion_humana" in especialidades

    if not is_gh and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tienes permiso para esta acción. Rol: '{usuario_actual.rol}' sin acceso a gestion_humana."
        )

    # Campos permitidos para actualización rápida (Control de Temporales + Estado)
    campos_permitidos = [
        # Campos comunes de la RP
        "fecha_recibo_gh", "estado_rp", "unidad_negocio", "mejora", "fecha_env_temporal",
        # Control SUMMAR
        "fecha_rec_gh_summar", "mejora_summar", "fecha_env_summar",
        # Control MULTIEMPLEOS
        "fecha_rec_gh_multi", "mejora_multi", "fecha_env_multi",
        # Control DIRECTO
        "fecha_rec_gh_directo", "mejora_directo", "fecha_env_directo",
        # Métricas Detalladas por Agencia
        "fecha_envio_hv_summar", "na_summar", "a_summar", "cancel_tiempo_summar", "cancel_referido_summar", "cancel_mov_summar", "nc_exp_summar", "nc_em_summar", "nc_entrev_summar", "nc_antcd_summar", "nc_vial_summar", "salario_final_summar", "tiempo_summar", "tipo_contrato_summar", "tema_personal_summar", "no_asistio_entrev_summar", "contratado_summar", "obs_summar",
        "fecha_envio_hv_multi", "na_multi", "a_multi", "cancel_tiempo_multi", "cancel_referido_multi", "cancel_mov_multi", "nc_exp_multi", "nc_em_multi", "nc_entrev_multi", "nc_antcd_multi", "nc_vial_multi", "salario_final_multi", "tiempo_multi", "tipo_contrato_multi", "tema_personal_multi", "no_asistio_entrev_multi", "contratado_multi", "obs_multi",
        "fecha_envio_hv_directo", "na_directo", "a_directo", "cancel_tiempo_directo", "cancel_referido_directo", "cancel_mov_directo", "nc_exp_directo", "nc_em_directo", "nc_entrev_directo", "nc_antcd_directo", "nc_vial_directo", "salario_final_directo", "tiempo_directo", "tipo_contrato_directo", "tema_personal_directo", "no_asistio_entrev_directo", "contratado_directo", "obs_directo",
    ]
    
    for campo, valor in datos.items():
        if campo in campos_permitidos:
            if "fecha" in campo and valor:
                try: setattr(requisicion, campo, datetime.strptime(valor, "%Y-%m-%d").date())
                except: setattr(requisicion, campo, valor)
            else:
                setattr(requisicion, campo, valor)
                
    # Sincronización de Detalles de Agencias (Multi-fila)
    if "detalles_agencias" in datos:
        from ...models.requisiciones.detalles import RequisicionAgenciaDetalle
        
        nuevos_detalles_data = datos["detalles_agencias"]
        
        # 1. Obtener IDs actuales para saber cuáles eliminar
        # La relación detalles_agencias ya está cargada gracias al selectinload inicial
        detalles_actuales = {d.id: d for d in requisicion.detalles_agencias}
        ids_recibidos = [d.get("id") for d in nuevos_detalles_data if d.get("id")]
        
        # 2. Eliminar los que ya no están en la lista recibida
        ids_a_eliminar = set(detalles_actuales.keys()) - set(ids_recibidos)
        for id_del in ids_a_eliminar:
            await db.delete(detalles_actuales[id_del])
            
        # 3. Actualizar o Crear
        for det_data in nuevos_detalles_data:
            det_id = det_data.get("id")
            if det_id and det_id in detalles_actuales:
                # Actualizar existente
                target = detalles_actuales[det_id]
                for k, v in det_data.items():
                    if k != "id" and k != "requisicion_id":
                        if "fecha" in k and isinstance(v, str) and v:
                            try: v = datetime.strptime(v, "%Y-%m-%d").date()
                            except: pass
                        setattr(target, k, v)
            else:
                # Crear nuevo
                # Quitamos ID si viene como None para que lo genere la DB
                det_data.pop("id", None)
                # Convertir fechas en el dict de creación
                for k in det_data:
                    if "fecha" in k and isinstance(det_data[k], str) and det_data[k]:
                        try: det_data[k] = datetime.strptime(det_data[k], "%Y-%m-%d").date()
                        except: pass
                
                nuevo_det = RequisicionAgenciaDetalle(
                    **det_data,
                    requisicion_id=req_id
                )
                db.add(nuevo_det)

    try:
        await db.commit()
        # Recargar con relaciones para la respuesta (eager load)
        statement = select(RequisicionPersonal).where(RequisicionPersonal.id == req_id).options(selectinload(RequisicionPersonal.detalles_agencias))
        result = await db.execute(statement)
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al actualizar: {str(e)}")
