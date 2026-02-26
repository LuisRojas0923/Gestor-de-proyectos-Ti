"""
API de Panel de Control - Backend V2
Endpoints para el dashboard principal (Async + SQLModel)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy import func

from datetime import timedelta
from app.database import obtener_db
from app.utils_cache import global_cache
from app.utils_date import get_bogota_now
from app.services.ticket.mantenimiento_service import ServicioMantenimientoTicket

router = APIRouter()


@router.post("/mantenimiento/limpiar-tickets")
async def ejecutar_limpieza_tickets(db: AsyncSession = Depends(obtener_db)):
    """Ejecuta el proceso de auto-cierre de tickets resueltos (>24h)"""
    try:
        procesados = (
            await ServicioMantenimientoTicket.cerrar_tickets_resueltos_vencidos(db)
        )
        return {
            "mensaje": "Proceso de mantenimiento completado",
            "tickets_cerrados": procesados,
        }
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
                TicketModel.estado.in_(
                    ["Abierto", "Asignado", "En Proceso", "Pendiente Info", "Escalado"]
                )
            )
        )
        tickets_pendientes = res_pend_tk.scalar() or 0

        res_comp = await db.execute(
            select(func.count(DesarrolloModel.id)).where(
                DesarrolloModel.estado_general.in_(
                    ["Completado", "Terminado", "completado"]
                )
            )
        )
        completados = res_comp.scalar() or 0

        porcentaje = round(
            (completados / total_desarrollos * 100) if total_desarrollos > 0 else 0, 1
        )

        data = {
            "total_desarrollos": total_desarrollos,
            "desarrollos_activos": desarrollos_activos,
            "total_tickets": total_tickets,
            "tickets_pendientes": tickets_pendientes,
            "porcentaje_completado": porcentaje,
            "desarrollos_completados": completados,
        }
        global_cache.set(cache_key, data)
        return data
    except Exception as e:
        import logging

        logging.error(f"Error en obtener_metricas: {e}")
        return {
            "total_desarrollos": 0,
            "desarrollos_activos": 0,
            "total_tickets": 0,
            "tickets_pendientes": 0,
            "porcentaje_completado": 0,
            "desarrollos_completados": 0,
        }


@router.get("/actividades-pendientes")
async def obtener_actividades_pendientes(
    limit: int = 10,
    status: str = "pendientes_en_curso",
    db: AsyncSession = Depends(obtener_db),
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
            st = st.where(
                TicketModel.estado.in_(
                    ["Nuevo", "En Proceso", "Pendiente Info", "Escalado"]
                )
            )
        elif status != "todas":
            estado_map = {
                "completada": "Resuelto",
                "cancelada": "Cerrado",
                "completado": "Resuelto",
            }
            st = st.where(TicketModel.estado == estado_map.get(status, status))

        res = await db.execute(st.order_by(TicketModel.creado_en.desc()).limit(limit))
        tickets = res.scalars().all()

        actividades = []
        for t in tickets:
            actividades.append(
                {
                    "id": t.id,
                    "tipo": "ticket",
                    "titulo": t.asunto,
                    "subject": t.asunto,
                    "descripcion": t.descripcion[:150] + "..."
                    if t.descripcion and len(t.descripcion) > 150
                    else (t.descripcion or ""),
                    "notes": t.descripcion,
                    "prioridad": t.prioridad,
                    "estado": t.estado,
                    "status": t.estado,
                    "fecha": t.creado_en.isoformat() if t.creado_en else None,
                    "start_date": t.creado_en.isoformat() if t.creado_en else None,
                    "asignado_a": t.asignado_a,
                    "creator_name": t.nombre_creador,
                    "stage_name": f"Ticket: {t.estado}",
                    "actor_type": "usuario",
                }
            )

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
            inicio = hoy - timedelta(weeks=i + 1)
            fin = hoy - timedelta(weeks=i)

            res_comp = await db.execute(
                select(func.count(TicketModel.id)).where(
                    TicketModel.estado == "Cerrado",
                    TicketModel.fecha_cierre.between(inicio, fin),
                )
            )
            completados = res_comp.scalar() or 0

            res_crea = await db.execute(
                select(func.count(TicketModel.id)).where(
                    TicketModel.creado_en.between(inicio, fin)
                )
            )
            creados = res_crea.scalar() or 0

            semanas.insert(
                0,
                {
                    "semana": f"S{4 - i}",
                    "nombre": f"Semana {4 - i}",
                    "completados": completados,
                    "creados": creados,
                    "pendientes": max(0, creados - completados),
                },
            )

        global_cache.set(cache_key, semanas)
        return semanas
    except Exception as e:
        import logging

        logging.error(f"Error en progreso semanal: {e}")
        return [
            {
                "semana": f"S{i + 1}",
                "nombre": f"Semana {i + 1}",
                "completados": 0,
                "creados": 0,
                "pendientes": 0,
            }
            for i in range(4)
        ]


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
            select(
                TicketModel.prioridad, func.count(TicketModel.id).label("cantidad")
            ).group_by(TicketModel.prioridad)
        )
        prioridades = res.all()

        colores = {
            "Alta": "#ef4444",
            "Media": "#f59e0b",
            "Baja": "#22c55e",
            "Crítica": "#dc2626",
        }
        result = []
        for p, cant in prioridades:
            result.append(
                {
                    "prioridad": p or "Sin asignar",
                    "cantidad": cant,
                    "color": colores.get(p, "#6b7280"),
                }
            )

        if not result:
            result = [{"prioridad": "Sin asignar", "cantidad": 0, "color": "#6b7280"}]

        global_cache.set(cache_key, result)
        return result
    except Exception as e:
        import logging

        logging.error(f"Error en distribucion prioridad: {e}")
        return []


@router.post("/torre-control/heartbeat")
async def registrar_actividad(
    token_sesion: str, db: AsyncSession = Depends(obtener_db)
):
    """Actualiza la marca de tiempo de la última actividad de una sesión"""
    try:
        from app.models.auth.usuario import Sesion
        from sqlalchemy import update

        await db.execute(
            update(Sesion)
            .where(Sesion.token_sesion == token_sesion)
            .values(ultima_actividad_en=get_bogota_now())
        )
        await db.commit()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.get("/torre-control/estado")
async def obtener_estado_sistema(db: AsyncSession = Depends(obtener_db)):
    """Retorna el estado detallado de salud y actividad del sistema"""
    try:
        from app.models.auth.usuario import Sesion, Usuario
        from app.models.ticket.ticket import Ticket as TicketModel

        ahora = get_bogota_now()
        hace_1_hora = ahora - timedelta(hours=1)

        # 1. Usuarios en línea (Únicos, sin Logout, actividad < 1h o nueva)
        # Usamos func.count(distinct(Sesion.usuario_id)) para obtener el número real de personas
        from sqlalchemy import or_, distinct

        res_online = await db.execute(
            select(func.count(distinct(Sesion.usuario_id))).where(
                Sesion.fin_sesion.is_(None),
                or_(
                    Sesion.ultima_actividad_en.is_(None),
                    Sesion.ultima_actividad_en >= hace_1_hora,
                ),
            )
        )
        usuarios_online = res_online.scalar() or 0

        # 2. Usuarios totales activos
        res_total_usr = await db.execute(
            select(func.count(Usuario.id)).where(Usuario.esta_activo)
        )
        total_usuarios = res_total_usr.scalar() or 0

        # 3. Métricas de servidor (Linux/Docker)
        import os

        def get_mem_usage():
            try:
                # Leer /proc/meminfo de forma economica
                with open("/proc/meminfo", "r") as f:
                    lines = f.readlines()
                total = int(lines[0].split()[1]) / 1024  # MB
                # available se prefiere sobre free para saber la memoria real usable
                available = (
                    int(
                        [line for line in lines if "MemAvailable" in line][0].split()[1]
                    )
                    / 1024
                )
                return round(total - available, 1), round(total, 1)
            except Exception:
                return 0.0, 0.0

        def get_cpu_load():
            try:
                # Carga promedio del sistema (1 min)
                return round(os.getloadavg()[0], 2)
            except Exception:
                return 0.0

        mem_used, mem_total = get_mem_usage()

        # 4. Tickets criticos/pendientes
        res_pend = await db.execute(
            select(func.count(TicketModel.id)).where(TicketModel.estado != "Cerrado")
        )
        tickets_pendientes = res_pend.scalar() or 0

        return {
            "usuarios": {
                "online": usuarios_online,
                "total_registrados": total_usuarios,
            },
            "servidor": {
                "cpu_load": get_cpu_load(),
                "ram_uso_mb": mem_used,
                "ram_total_mb": mem_total,
                "uptime": "Normal",
            },
            "operacion": {
                "tickets_pendientes": tickets_pendientes,
                "db_status": "online",
            },
            "timestamp": ahora.isoformat(),
        }
    except Exception as e:
        import logging

        logging.error(f"Error en torre-control/estado: {e}")
        return {"error": str(e)}


@router.get("/torre-control/historial")
async def obtener_historial_metricas(
    horas: int = 24, db: AsyncSession = Depends(obtener_db)
):
    """Retorna el historial de métricas para gráficas de tendencias"""
    try:
        from app.models.panel_control.metrica import MetricaSistema

        ahora = get_bogota_now()
        desde = ahora - timedelta(hours=horas)

        result = await db.execute(
            select(MetricaSistema)
            .where(MetricaSistema.timestamp >= desde)
            .order_by(MetricaSistema.timestamp.asc())
        )
        metricas = result.scalars().all()

        return [
            {
                "timestamp": m.timestamp.isoformat(),
                "cpu": m.cpu_uso_porcentaje,
                "ram": m.ram_uso_mb,
                "usuarios": m.usuarios_online,
                "tickets": m.tickets_pendientes,
            }
            for m in metricas
        ]
    except Exception as e:
        import logging

        logging.error(f"Error en torre-control/historial: {e}")
        return []


@router.get("/torre-control/sesiones-activas")
async def obtener_sesiones_activas(db: AsyncSession = Depends(obtener_db)):
    """Retorna lista de sesiones ÚNICAS por usuario que no han cerrado sesion"""
    try:
        from app.models.auth.usuario import Sesion
        from sqlalchemy import or_

        ahora = get_bogota_now()
        hace_1_hora = ahora - timedelta(hours=1)

        # Usamos DISTINCT ON (usuario_id) de PostgreSQL para obtener solo la mas reciente
        # Nota: En SQLAlchemy/PostgreSQL, si usas DISTINCT ON, el primer ORDER BY debe ser la columna del DISTINCT
        stmt = (
            select(Sesion)
            .distinct(Sesion.usuario_id)
            .where(
                Sesion.fin_sesion.is_(None),
                or_(
                    Sesion.ultima_actividad_en.is_(None),
                    Sesion.ultima_actividad_en >= hace_1_hora,
                ),
            )
            .order_by(Sesion.usuario_id, Sesion.creado_en.desc())
        )

        result = await db.execute(stmt)
        sesiones = result.scalars().all()

        respuesta = []
        for s in sesiones:
            # Lógica de semáforo de actividad
            estado = "Activa"
            if s.ultima_actividad_en:
                mins_inactivo = (ahora - s.ultima_actividad_en).total_seconds() / 60
                if mins_inactivo > 15:
                    estado = "Inactiva (Idle)"

            respuesta.append(
                {
                    "id": s.id,
                    "usuario_id": s.usuario_id,
                    "nombre": s.nombre_usuario or s.usuario_id,
                    "rol": s.rol_usuario or "usuario",
                    "ip": s.direccion_ip,
                    "ultima_actividad": s.ultima_actividad_en.isoformat()
                    if s.ultima_actividad_en
                    else s.creado_en.isoformat(),
                    "estado": estado,
                }
            )

        # Ordenar respuesta final por actividad para el frontend
        respuesta.sort(key=lambda x: x["ultima_actividad"], reverse=True)
        return respuesta
    except Exception as e:
        import logging

        logging.error(f"Error en torre-control/sesiones-activas: {e}")
        return []
