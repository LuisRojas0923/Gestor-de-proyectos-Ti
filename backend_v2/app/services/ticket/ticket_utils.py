import json
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sa_func
from sqlmodel import select
from app.models.ticket.ticket import Ticket, HistorialTicket
from app.models.auth.usuario import Usuario


class TicketUtils:
    @staticmethod
    async def registrar_historial(
        db: AsyncSession,
        ticket_id: str,
        accion: str,
        detalle: str,
        usuario_id: str = None,
        nombre_usuario: str = None,
    ):
        """Helper para registrar eventos en el historial del ticket (Async)"""
        log = HistorialTicket(
            ticket_id=ticket_id,
            accion=accion,
            detalle=detalle,
            usuario_id=usuario_id,
            nombre_usuario=nombre_usuario,
        )
        db.add(log)

    @staticmethod
    async def obtener_analista_menos_cargado(
        db: AsyncSession, categoria_id: str = None, area_solicitante: str = None
    ) -> Optional[str]:
        """Busca al analista con menos tickets activos usando cascada de prioridad (Async)"""
        try:
            # 1. Obtener todos los usuarios activos con roles válidos
            result = await db.execute(
                select(Usuario).where(
                    Usuario.rol.in_(["analyst", "admin_sistemas", "admin"]),
                    Usuario.esta_activo,
                )
            )
            todos = result.scalars().all()

            if not todos:
                return None

            # 2. Separar por prioridad de rol
            analistas = [u for u in todos if u.rol in ("analyst", "admin_sistemas")]
            admins = [u for u in todos if u.rol == "admin"]

            # 3. Filtrar analistas por especialidad
            con_especialidad = []
            for a in analistas:
                try:
                    especialidades = json.loads(a.especialidades or "[]")
                except Exception:
                    especialidades = []

                if not especialidades:
                    continue

                if categoria_id and categoria_id in especialidades:
                    con_especialidad.append(a)

            # 4. Aplicar filtro de área (solo para soporte_mejora)
            candidatos = con_especialidad
            if (
                categoria_id == "soporte_mejora"
                and area_solicitante
                and con_especialidad
            ):
                con_area = []
                for a in con_especialidad:
                    try:
                        areas = json.loads(a.areas_asignadas or "[]")
                    except Exception:
                        areas = []

                    if areas and area_solicitante in areas:
                        con_area.append(a)

                if con_area:
                    candidatos = con_area
                else:
                    candidatos = con_especialidad

            # 5. Fallback a admin si no hay candidatos
            if not candidatos:
                candidatos = admins

            if not candidatos:
                return None

            # 6. Contar tickets activos y retornar el de menor carga
            conteo_carga = []
            for a in candidatos:
                result_count = await db.execute(
                    select(sa_func.count(Ticket.id)).where(
                        Ticket.asignado_a == a.nombre,
                        Ticket.estado.in_(["Pendiente", "Proceso"]),
                    )
                )
                carga = result_count.scalar() or 0
                conteo_carga.append((a.nombre, carga))

            conteo_carga.sort(key=lambda x: x[1])
            return conteo_carga[0][0]
        except Exception as e:
            print(f"Error en ruteo de asignación: {e}")
            return None
