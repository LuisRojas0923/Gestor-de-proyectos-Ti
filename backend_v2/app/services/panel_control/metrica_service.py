"""
Servicio de Métricas - Backend V2
Se encarga de recolectar snapshots de rendimiento y persistirlos.
"""

import asyncio
import logging
import os
from datetime import timedelta
from sqlmodel import select, func
from app.database import AsyncSessionLocal
from app.models.panel_control.metrica import MetricaSistema
from app.models.auth.usuario import Sesion
from app.models.ticket.ticket import Ticket as TicketModel
from app.utils_date import get_bogota_now

logger = logging.getLogger(__name__)


class MetricaService:
    """Servicio para gestión de métricas históricas"""

    @staticmethod
    async def capturar_snapshot():
        """Captura el estado actual del sistema y lo guarda en la DB"""
        async with AsyncSessionLocal() as db:
            try:
                ahora = get_bogota_now()
                hace_5_mins = ahora - timedelta(minutes=5)
                hace_24h = ahora - timedelta(hours=24)

                # 1. Usuarios en línea
                res_online = await db.execute(
                    select(func.count(Sesion.id)).where(
                        Sesion.ultima_actividad_en >= hace_5_mins
                    )
                )
                online = res_online.scalar() or 0

                # 2. Usuarios activos 24h
                res_24h = await db.execute(
                    select(func.count(func.distinct(Sesion.usuario_id))).where(
                        Sesion.creado_en >= hace_24h
                    )
                )
                activos_24h = res_24h.scalar() or 0

                # 3. Métricas Servidor
                cpu_load = 0.0
                try:
                    cpu_load = round(
                        os.getloadavg()[0] * 10, 2
                    )  # Normalizado a % aprox (asumiendo carga sobre cores)
                except Exception:
                    pass

                mem_used = 0.0
                mem_total = 0.0
                try:
                    with open("/proc/meminfo", "r") as f:
                        lines = f.readlines()
                    mem_total = int(lines[0].split()[1]) / 1024
                    mem_available = (
                        int(
                            [line for line in lines if "MemAvailable" in line][
                                0
                            ].split()[1]
                        )
                        / 1024
                    )
                    mem_used = round(mem_total - mem_available, 1)
                except Exception:
                    pass

                # 4. Tickets
                res_tickets = await db.execute(
                    select(func.count(TicketModel.id)).where(
                        TicketModel.estado != "Cerrado"
                    )
                )
                pendientes = res_tickets.scalar() or 0

                # Crear snapshot
                snapshot = MetricaSistema(
                    timestamp=ahora,
                    usuarios_online=online,
                    usuarios_activos_24h=activos_24h,
                    cpu_uso_porcentaje=min(cpu_load, 100.0),
                    ram_uso_mb=mem_used,
                    ram_total_mb=mem_total,
                    tickets_pendientes=pendientes,
                    estado_servidor="ok" if cpu_load < 80 else "warning",
                )

                db.add(snapshot)
                await db.commit()
                logger.info(
                    f"Metrica capturada exitosamente: CPU {cpu_load}%, Online {online}"
                )

            except Exception as e:
                logger.error(f"Error capturando snapshot de metricas: {e}")
                await db.rollback()

    @staticmethod
    async def iniciar_recolector_automatico(intervalo_minutos: int = 15):
        """Tarea de fondo que ejecuta la captura periódicamente"""
        logger.info(f"Iniciando recolector de metricas (cada {intervalo_minutos} min)")
        while True:
            await MetricaService.capturar_snapshot()
            await asyncio.sleep(intervalo_minutos * 60)
