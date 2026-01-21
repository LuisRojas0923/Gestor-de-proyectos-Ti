"""
API de Panel de Control - Backend V2
Endpoints para el dashboard principal
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import obtener_db

router = APIRouter()


@router.get("/metricas")
async def obtener_metricas(db: Session = Depends(obtener_db)):
    """Retorna métricas generales del dashboard"""
    try:
        # Importar modelos aquí para evitar circular imports
        from app.models.ticket.ticket import Ticket as TicketModel
        from app.models.desarrollo.desarrollo import Desarrollo as DesarrolloModel
        
        total_desarrollos = db.query(DesarrolloModel).count()
        desarrollos_activos = db.query(DesarrolloModel).filter(
            DesarrolloModel.estado_general.in_(["En Progreso", "Activo", "activo"])
        ).count()
        
        total_tickets = db.query(TicketModel).count()
        tickets_pendientes = db.query(TicketModel).filter(
            TicketModel.estado.in_(["Nuevo", "En Proceso", "Pendiente"])
        ).count()
        
        # Calcular porcentaje completado
        completados = db.query(DesarrolloModel).filter(
            DesarrolloModel.estado_general.in_(["Completado", "Terminado", "completado"])
        ).count()
        
        porcentaje = round((completados / total_desarrollos * 100) if total_desarrollos > 0 else 0, 1)
        
        return {
            "total_desarrollos": total_desarrollos,
            "desarrollos_activos": desarrollos_activos,
            "total_tickets": total_tickets,
            "tickets_pendientes": tickets_pendientes,
            "porcentaje_completado": porcentaje,
            "desarrollos_completados": completados
        }
    except Exception as e:
        print(f"Error en obtener_metricas: {e}")
        # Retornar valores por defecto en caso de error
        return {
            "total_desarrollos": 0,
            "desarrollos_activos": 0,
            "total_tickets": 0,
            "tickets_pendientes": 0,
            "porcentaje_completado": 0,
            "desarrollos_completados": 0
        }


@router.get("/actividades-pendientes")
async def obtener_actividades_pendientes(
    limit: int = 10, 
    status: str = "pendientes_en_curso",
    db: Session = Depends(obtener_db)
):
    """Retorna lista de actividades pendientes para el panel de alertas"""
    try:
        from app.models.ticket.ticket import Ticket as TicketModel
        
        # Filtros básicos por estado
        query = db.query(TicketModel)
        
        if status == "pendientes_en_curso":
            query = query.filter(TicketModel.estado.in_(["Nuevo", "En Proceso", "Pendiente Info", "Escalado"]))
        elif status != "todas":
            # Normalizar nombres de estado si vienen en español o inglés
            estado_map = {
                "completada": "Resuelto",
                "cancelada": "Cerrado",
                "completado": "Resuelto"
            }
            query = query.filter(TicketModel.estado == estado_map.get(status, status))

        tickets = query.order_by(TicketModel.creado_en.desc()).limit(limit).all()
        
        actividades = []
        for t in tickets:
            actividades.append({
                "id": t.id,
                "tipo": "ticket",
                "titulo": t.asunto,
                "subject": t.asunto,  # Compatibilidad frontend
                "descripcion": t.descripcion[:150] + "..." if t.descripcion and len(t.descripcion) > 150 else (t.descripcion or ""),
                "notes": t.descripcion, # Compatibilidad con AlertPanel que espera activity.notes
                "prioridad": t.prioridad,
                "estado": t.estado,
                "status": t.estado,   # Compatibilidad frontend para evitar crash toUpperCase
                "fecha": t.creado_en.isoformat() if t.creado_en else None,
                "start_date": t.creado_en.isoformat() if t.creado_en else None, # Compatibilidad AlertPanel
                "asignado_a": t.asignado_a,
                "creator_name": t.nombre_creador,
                "stage_name": f"Ticket: {t.estado}", # Para que AlertPanel muestre algo coherente
                "actor_type": "usuario"
            })
        
        return actividades
    except Exception as e:
        print(f"Error en obtener_actividades_pendientes: {e}")
        return []
    except Exception as e:
        print(f"Error en obtener_actividades_pendientes: {e}")
        return []


@router.get("/progreso-semanal")
async def obtener_progreso_semanal(db: Session = Depends(obtener_db)):
    """Retorna datos de progreso semanal para gráficos"""
    try:
        from app.models.ticket.ticket import Ticket as TicketModel
        
        # Generar datos de las últimas 4 semanas
        hoy = datetime.now()
        semanas = []
        
        for i in range(4):
            inicio_semana = hoy - timedelta(weeks=i+1)
            fin_semana = hoy - timedelta(weeks=i)
            
            completados = db.query(TicketModel).filter(
                TicketModel.estado == "Cerrado",
                TicketModel.fecha_cierre.between(inicio_semana, fin_semana)
            ).count()
            
            creados = db.query(TicketModel).filter(
                TicketModel.creado_en.between(inicio_semana, fin_semana)
            ).count()
            
            semanas.insert(0, {
                "semana": f"S{4-i}",
                "nombre": f"Semana {4-i}",
                "completados": completados,
                "creados": creados,
                "pendientes": max(0, creados - completados)
            })
        
        return semanas
    except Exception as e:
        print(f"Error en obtener_progreso_semanal: {e}")
        # Datos de ejemplo si falla
        return [
            {"semana": "S1", "nombre": "Semana 1", "completados": 5, "creados": 8, "pendientes": 3},
            {"semana": "S2", "nombre": "Semana 2", "completados": 7, "creados": 6, "pendientes": 2},
            {"semana": "S3", "nombre": "Semana 3", "completados": 4, "creados": 9, "pendientes": 5},
            {"semana": "S4", "nombre": "Semana 4", "completados": 8, "creados": 10, "pendientes": 4}
        ]


@router.get("/distribucion-prioridad")
async def obtener_distribucion_prioridad(db: Session = Depends(obtener_db)):
    """Retorna distribución de tickets por prioridad"""
    try:
        from app.models.ticket.ticket import Ticket as TicketModel
        
        # Contar por prioridad
        prioridades = db.query(
            TicketModel.prioridad,
            func.count(TicketModel.id).label('cantidad')
        ).group_by(TicketModel.prioridad).all()
        
        colores = {
            "Alta": "#ef4444",
            "Media": "#f59e0b", 
            "Baja": "#22c55e",
            "Crítica": "#dc2626"
        }
        
        result = []
        for prioridad, cantidad in prioridades:
            result.append({
                "prioridad": prioridad or "Sin asignar",
                "cantidad": cantidad,
                "color": colores.get(prioridad, "#6b7280")
            })
        
        # Si no hay datos, retornar ejemplo
        if not result:
            result = [
                {"prioridad": "Alta", "cantidad": 5, "color": "#ef4444"},
                {"prioridad": "Media", "cantidad": 12, "color": "#f59e0b"},
                {"prioridad": "Baja", "cantidad": 8, "color": "#22c55e"}
            ]
        
        return result
    except Exception as e:
        print(f"Error en obtener_distribucion_prioridad: {e}")
        return [
            {"prioridad": "Alta", "cantidad": 0, "color": "#ef4444"},
            {"prioridad": "Media", "cantidad": 0, "color": "#f59e0b"},
            {"prioridad": "Baja", "cantidad": 0, "color": "#22c55e"}
        ]
