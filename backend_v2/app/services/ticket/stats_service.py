from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sa_func
from sqlmodel import select
from app.models.ticket.ticket import Ticket


class StatService:
    @staticmethod
    async def obtener_estadisticas_resumen(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene estadisticas resumidas de tickets (Async)"""
        total = (await db.execute(select(sa_func.count(Ticket.id)))).scalar() or 0
        pendiente = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.estado == "Pendiente")
            )
        ).scalar() or 0
        en_proceso = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.estado == "Proceso")
            )
        ).scalar() or 0
        cerrados = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.estado == "Cerrado")
            )
        ).scalar() or 0
        escalados = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(
                    Ticket.estado == "Cerrado", Ticket.sub_estado == "Escalado"
                )
            )
        ).scalar() or 0

        return {
            "total": total,
            "nuevos": pendiente,
            "en_proceso": en_proceso,
            "pendientes": pendiente + en_proceso,
            "cerrados": cerrados,
            "escalados": escalados,
            "completion_rate": round((cerrados / total * 100) if total > 0 else 0, 1),
            "total_tickets": total,
        }

    @staticmethod
    async def obtener_estadisticas_avanzadas(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene estadisticas avanzadas de tickets (Async)"""
        result = await db.execute(
            select(Ticket).where(
                Ticket.estado == "Cerrado",
                Ticket.sub_estado == "Resuelto",
            )
        )
        tickets_cerrados = result.scalars().all()

        tiempos = []
        for t in tickets_cerrados:
            if t.resuelto_en and t.creado_en:
                tiempos.append((t.resuelto_en - t.creado_en).total_seconds() / 3600)

        avg_resolution_time = round(sum(tiempos) / len(tiempos), 1) if tiempos else 0

        sla_limit_hours = 48
        dentro_sla = sum(1 for t in tiempos if t <= sla_limit_hours)
        sla_percentage = round((dentro_sla / len(tiempos) * 100), 1) if tiempos else 100

        prioridades_result = await db.execute(
            select(Ticket.prioridad, sa_func.count(Ticket.id)).group_by(
                Ticket.prioridad
            )
        )
        prioridades = prioridades_result.all()

        return {
            "avg_resolution_time": avg_resolution_time,
            "sla_compliance": sla_percentage,
            "total_resolved": len(tickets_cerrados),
            "priority_distribution": {p[0]: p[1] for p in prioridades},
            "sla_limit_hours": sla_limit_hours,
        }
