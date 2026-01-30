"""
API de Panel de Control - Backend V2
Endpoints para el dashboard principal (Async + SQLModel)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.database import obtener_db
from app.utils_cache import global_cache
from app.utils_date import get_bogota_now
from app.services.ticket.mantenimiento_service import ServicioMantenimientoTicket

router = APIRouter()

@router.post("/mantenimiento/limpiar-tickets")
async def ejecutar_limpieza_tickets(db: AsyncSession = Depends(obtener_db)):
    """Ejecuta el proceso de auto-cierre de tickets resueltos (>24h)"""
    try:
        procesados = await ServicioMantenimientoTicket.cerrar_tickets_resueltos_vencidos(db)
        return {"mensaje": "Proceso de mantenimiento completado", "tickets_cerrados": procesados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en mantenimiento: {str(e)}")

@router.get("/metricas")
async def obtener_metricas(db: AsyncSession = Depends(obtener_db)):
    """Retorna métricas generales del dashboard con caché"""
    cache_key = "panel_metricas_generales"
    cached = global_cache.get(cache_key)
    if cached:
        return cached

    try:
        from app.models.ticket.ticket import Ticket as TicketModel
        from app.models.desarrollo.desarrollo import Desarrollo as DesarrolloModel
        
        # Consultas asíncronas usando select
        res_total_des = await db.execute(select(func.count(DesarrolloModel.id)))
        total_desarrollos = res_total_des.scalar() or 0
        
        res_activos = await db.execute(
            select(func.count(DesarrolloModel.id)).where(
                DesarrolloModel.estado_general.in_(["En Progreso", "Activo", "activo"])
            )
        )
        desarrollos_activos = res_activos.scalar() or 0
        
        res_total_tk = await db.execute(select(func.count(TicketModel.id)))
        total_tickets = res_total_tk.scalar() or 0
        
        res_pend_tk = await db.execute(
            select(func.count(TicketModel.id)).where(
                TicketModel.estado.in_(["Abierto", "Asignado", "En Proceso", "Pendiente Info", "Escalado"])
            )
        )
        tickets_pendientes = res_pend_tk.scalar() or 0
        
        res_comp = await db.execute(
            select(func.count(DesarrolloModel.id)).where(
                DesarrolloModel.estado_general.in_(["Completado", "Terminado", "completado"])
            )
        )
        completados = res_comp.scalar() or 0
        
        porcentaje = round((completados / total_desarrollos * 100) if total_desarrollos > 0 else 0, 1)
        
        data = {
            "total_desarrollos": total_desarrollos,
            "desarrollos_activos": desarrollos_activos,
            "total_tickets": total_tickets,
            "tickets_pendientes": tickets_pendientes,
            "porcentaje_completado": porcentaje,
            "desarrollos_completados": completados
        }
        global_cache.set(cache_key, data)
        return data
    except Exception as e:
        import logging
        logging.error(f"Error en obtener_metricas: {e}")
        return {
            "total_desarrollos": 0, "desarrollos_activos": 0, "total_tickets": 0,
            "tickets_pendientes": 0, "porcentaje_completado": 0, "desarrollos_completados": 0
        }


@router.get("/actividades-pendientes")
async def obtener_actividades_pendientes(
    limit: int = 10, 
    status: str = "pendientes_en_curso",
    db: AsyncSession = Depends(obtener_db)
):
    """Retorna lista de actividades pendientes con caché"""
    cache_key = f"panel_actividades_{status}_{limit}"
    cached = global_cache.get(cache_key)
    if cached:
        return cached

    try:
        from app.models.ticket.ticket import Ticket as TicketModel
        
        st = select(TicketModel)
        if status == "pendientes_en_curso":
            st = st.where(TicketModel.estado.in_(["Nuevo", "En Proceso", "Pendiente Info", "Escalado"]))
        elif status != "todas":
            estado_map = {"completada": "Resuelto", "cancelada": "Cerrado", "completado": "Resuelto"}
            st = st.where(TicketModel.estado == estado_map.get(status, status))

        res = await db.execute(st.order_by(TicketModel.creado_en.desc()).limit(limit))
        tickets = res.scalars().all()
        
        actividades = []
        for t in tickets:
            actividades.append({
                "id": t.id,
                "tipo": "ticket",
                "titulo": t.asunto,
                "subject": t.asunto,
                "descripcion": t.descripcion[:150] + "..." if t.descripcion and len(t.descripcion) > 150 else (t.descripcion or ""),
                "notes": t.descripcion,
                "prioridad": t.prioridad,
                "estado": t.estado,
                "status": t.estado,
                "fecha": t.creado_en.isoformat() if t.creado_en else None,
                "start_date": t.creado_en.isoformat() if t.creado_en else None,
                "asignado_a": t.asignado_a,
                "creator_name": t.nombre_creador,
                "stage_name": f"Ticket: {t.estado}",
                "actor_type": "usuario"
            })
        
        global_cache.set(cache_key, actividades)
        return actividades
    except Exception as e:
        import logging
        logging.error(f"Error en actividades pendientes: {e}")
        return []


@router.get("/progreso-semanal")
async def obtener_progreso_semanal(db: AsyncSession = Depends(obtener_db)):
    """Retorna datos de progreso semanal con caché"""
    cache_key = "panel_progreso_semanal"
    cached = global_cache.get(cache_key)
    if cached:
        return cached

    try:
        from app.models.ticket.ticket import Ticket as TicketModel
        hoy = get_bogota_now()
        semanas = []
        
        for i in range(4):
            inicio = hoy - timedelta(weeks=i+1)
            fin = hoy - timedelta(weeks=i)
            
            res_comp = await db.execute(
                select(func.count(TicketModel.id)).where(
                    TicketModel.estado == "Cerrado",
                    TicketModel.fecha_cierre.between(inicio, fin)
                )
            )
            completados = res_comp.scalar() or 0
            
            res_crea = await db.execute(
                select(func.count(TicketModel.id)).where(
                    TicketModel.creado_en.between(inicio, fin)
                )
            )
            creados = res_crea.scalar() or 0
            
            semanas.insert(0, {
                "semana": f"S{4-i}", "nombre": f"Semana {4-i}",
                "completados": completados, "creados": creados,
                "pendientes": max(0, creados - completados)
            })
        
        global_cache.set(cache_key, semanas)
        return semanas
    except Exception as e:
        import logging
        logging.error(f"Error en progreso semanal: {e}")
        return [{"semana": f"S{i+1}", "nombre": f"Semana {i+1}", "completados": 0, "creados": 0, "pendientes": 0} for i in range(4)]


@router.get("/distribucion-prioridad")
async def obtener_distribucion_prioridad(db: AsyncSession = Depends(obtener_db)):
    """Retorna distribución de tickets por prioridad con caché"""
    cache_key = "panel_distribucion_prioridad"
    cached = global_cache.get(cache_key)
    if cached:
        return cached

    try:
        from app.models.ticket.ticket import Ticket as TicketModel
        res = await db.execute(
            select(TicketModel.prioridad, func.count(TicketModel.id).label('cantidad'))
            .group_by(TicketModel.prioridad)
        )
        prioridades = res.all()
        
        colores = {"Alta": "#ef4444", "Media": "#f59e0b", "Baja": "#22c55e", "Crítica": "#dc2626"}
        result = []
        for p, cant in prioridades:
            result.append({"prioridad": p or "Sin asignar", "cantidad": cant, "color": colores.get(p, "#6b7280")})
        
        if not result:
            result = [{"prioridad": "Sin asignar", "cantidad": 0, "color": "#6b7280"}]
            
        global_cache.set(cache_key, result)
        return result
    except Exception as e:
        import logging
        logging.error(f"Error en distribucion prioridad: {e}")
        return []
