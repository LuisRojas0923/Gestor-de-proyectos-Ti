from prometheus_client import Gauge
from sqlalchemy import select, func
from datetime import datetime, timedelta
from app.database import AsyncSessionLocal
from app.models.ticket.ticket import Ticket
from app.models.auth.usuario import Usuario, Sesion

# Definición de métricas de negocio
TICKETS_PENDIENTES = Gauge(
    "gestor_tickets_pendientes_total", 
    "Total de tickets con estado Pendiente en el sistema"
)
USUARIOS_TOTALES = Gauge(
    "gestor_usuarios_registrados_total", 
    "Total de usuarios registrados históricamente"
)
USUARIOS_ONLINE = Gauge(
    "gestor_usuarios_online_total", 
    "Usuarios con actividad en los últimos 10 minutos"
)

async def update_business_metrics():
    """Consulta la base de datos y actualiza los contadores de Prometheus"""
    try:
        async with AsyncSessionLocal() as session:
            # 1. Tickets Pendientes
            query_tickets = select(func.count(Ticket.id)).where(Ticket.estado == "Pendiente")
            result_tickets = await session.execute(query_tickets)
            TICKETS_PENDIENTES.set(result_tickets.scalar() or 0)

            # 2. Usuarios Históricos
            query_users = select(func.count(Usuario.id))
            result_users = await session.execute(query_users)
            USUARIOS_TOTALES.set(result_users.scalar() or 0)

            # 3. Usuarios Online (Actividad en últimos 10 min)
            diez_min_atras = datetime.now() - timedelta(minutes=10)
            query_online = select(func.count(func.distinct(Sesion.usuario_id))).where(
                Sesion.ultima_actividad_en >= diez_min_atras,
                Sesion.fin_sesion.is_(None)
            )
            result_online = await session.execute(query_online)
            USUARIOS_ONLINE.set(result_online.scalar() or 0)
            
    except Exception as e:
        # No bloqueamos la app si falla la métrica, solo logueamos (Loguru ya configurado)
        from loguru import logger
        logger.error(f"Error actualizando métricas de negocio: {e}")
