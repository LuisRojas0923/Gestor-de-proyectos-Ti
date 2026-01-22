from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from fastapi import HTTPException

from app.models.ticket.ticket import (
    Ticket as TicketModel,
    ComentarioTicket as ComentarioTicketModel,
    CategoriaTicket as CategoriaTicketModel,
    SolicitudDesarrollo,
    HistorialTicket as HistorialModel,
    AdjuntoTicket as AdjuntoModel
)
from app.models.auth.usuario import Usuario
from app.schemas.ticket import TicketCrear, TicketActualizar, AdjuntoTicketCrear

class ServicioTicket:
    @staticmethod
    def obtener_analista_menos_cargado(db: Session) -> Optional[str]:
        """Busca al analista o admin con menos tickets activos asignados"""
        try:
            # 1. Obtener todos los analistas/admins activos
            analistas = db.query(Usuario).filter(
                Usuario.rol.in_(["analyst", "admin"]),
                Usuario.esta_activo == True
            ).all()
            
            if not analistas:
                return None
                
            # 2. Contar tickets activos por analista
            conteo_carga = []
            for a in analistas:
                carga = db.query(TicketModel).filter(
                    TicketModel.asignado_a == a.nombre,
                    TicketModel.estado.in_(["Nuevo", "Abierto", "En Proceso", "Pendiente Info", "Escalado"])
                ).count()
                conteo_carga.append((a.nombre, carga))
                
            # 3. Retornar el nombre del que tenga menos carga
            conteo_carga.sort(key=lambda x: x[1])
            return conteo_carga[0][0]
        except Exception:
            return None

    @staticmethod
    def registrar_historial(db: Session, ticket_id: str, accion: str, detalle: str):
        """Helper para registrar eventos en el historial del ticket"""
        log = HistorialModel(
            ticket_id=ticket_id,
            accion=accion,
            detalle=detalle
        )
        db.add(log)
        # Nota: El commit lo maneja el llamador para permitir transacciones complejas

    @staticmethod
    def obtener_estadisticas_resumen(db: Session) -> Dict[str, Any]:
        total = db.query(TicketModel).count()
        nuevos = db.query(TicketModel).filter(TicketModel.estado == "Nuevo").count()
        en_proceso = db.query(TicketModel).filter(TicketModel.estado == "En Proceso").count()
        pendientes_info = db.query(TicketModel).filter(TicketModel.estado == "Pendiente Info").count()
        escalados = db.query(TicketModel).filter(TicketModel.estado == "Escalado").count()
        cerrados = db.query(TicketModel).filter(TicketModel.estado == "Cerrado").count()
        resueltos = db.query(TicketModel).filter(TicketModel.estado == "Resuelto").count()
        
        return {
            "total": total,
            "nuevos": nuevos,
            "en_proceso": en_proceso,
            "pendientes": nuevos + en_proceso + pendientes_info + escalados,
            "cerrados": cerrados + resueltos,
            "escalados": escalados,
            "completion_rate": round(((cerrados + resueltos) / total * 100) if total > 0 else 0, 1),
            "total_tickets": total
        }

    @staticmethod
    def obtener_estadisticas_avanzadas(db: Session) -> Dict[str, Any]:
        tickets_cerrados = db.query(TicketModel).filter(
            TicketModel.estado.in_(["Resuelto", "Cerrado"]),
            TicketModel.resuelto_en != None
        ).all()
        
        tiempos = [(t.resuelto_en - t.creado_en).total_seconds() / 3600 for t in tickets_cerrados]
        avg_resolution_time = round(sum(tiempos) / len(tiempos), 1) if tiempos else 0
        
        sla_limit_hours = 48
        dentro_sla = sum(1 for t in tiempos if t <= sla_limit_hours)
        sla_percentage = round((dentro_sla / len(tiempos) * 100), 1) if tiempos else 100
        
        prioridades = db.query(TicketModel.prioridad, func.count(TicketModel.id))\
            .group_by(TicketModel.prioridad).all()
        
        return {
            "avg_resolution_time": avg_resolution_time,
            "sla_compliance": sla_percentage,
            "total_resolved": len(tickets_cerrados),
            "priority_distribution": {p[0]: p[1] for p in prioridades},
            "sla_limit_hours": sla_limit_hours
        }

    @classmethod
    def crear_ticket(cls, db: Session, ticket_data: TicketCrear) -> TicketModel:
        try:
            nuevo_ticket = TicketModel(
                id=ticket_data.id,
                categoria_id=ticket_data.categoria_id,
                asunto=ticket_data.asunto,
                descripcion=ticket_data.descripcion,
                creador_id=ticket_data.creador_id,
                nombre_creador=ticket_data.nombre_creador,
                correo_creador=ticket_data.correo_creador,
                area_creador=ticket_data.area_creador,
                prioridad=ticket_data.prioridad or "Media",
                estado="Nuevo",
                datos_extra=ticket_data.datos_extra
            )
            
            analista = cls.obtener_analista_menos_cargado(db)
            if analista:
                nuevo_ticket.asignado_a = analista
            
            db.add(nuevo_ticket)
            cls.registrar_historial(db, ticket_data.id, "Creación", f"Ticket creado por {ticket_data.nombre_creador}")
            
            if analista:
                cls.registrar_historial(db, ticket_data.id, "Asignación Automática", f"Asignado a {analista} por balanceo de carga")
            
            if ticket_data.que_necesita or ticket_data.porque:
                solicitud = SolicitudDesarrollo(
                    ticket_id=ticket_data.id,
                    que_necesita=ticket_data.que_necesita,
                    porque=ticket_data.porque,
                    paraque=ticket_data.paraque,
                    justificacion_ia=ticket_data.justificacion_ia
                )
                db.add(solicitud)
                
            db.commit()
            db.refresh(nuevo_ticket)
            return nuevo_ticket
        except Exception as e:
            db.rollback()
            raise e

    @classmethod
    def actualizar_ticket(cls, db: Session, ticket_id: str, ticket_in: TicketActualizar) -> TicketModel:

        db_ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
        if not db_ticket:
            throw_not_found("Ticket no encontrado")
            
        update_data = ticket_in.model_dump(exclude_unset=True)
        
        # Track history
        for field, value in update_data.items():
            old_value = getattr(db_ticket, field)
            if str(old_value) != str(value):
                if field in ["estado", "prioridad", "asignado_a", "resolucion"]:
                    cls.registrar_historial(db, ticket_id, f"Cambio de {field.capitalize()}", f"De '{old_value or 'Ninguno'}' a '{value}'")
                setattr(db_ticket, field, value)
        
        # Auto-dates for resolution
        if "estado" in update_data:
            if update_data["estado"] in ["Resuelto", "Cerrado"]:
                now = datetime.now()
                if not db_ticket.fecha_cierre: db_ticket.fecha_cierre = now
                if not db_ticket.resuelto_en: db_ticket.resuelto_en = now
            else:
                db_ticket.fecha_cierre = None
                db_ticket.resuelto_en = None
                
        db.commit()
        db.refresh(db_ticket)
        return db_ticket

    @classmethod
    def subir_adjunto(cls, db: Session, ticket_id: str, adjunto: AdjuntoTicketCrear) -> AdjuntoModel:
        nuevo_adjunto = AdjuntoModel(
            ticket_id=ticket_id,
            nombre_archivo=adjunto.nombre_archivo,
            contenido_base64=adjunto.contenido_base64,
            tipo_mime=adjunto.tipo_mime
        )
        db.add(nuevo_adjunto)
        cls.registrar_historial(db, ticket_id, "Archivo Adjunto", f"Se adjuntó el archivo: {adjunto.nombre_archivo}")
        db.commit()
        db.refresh(nuevo_adjunto)
        return nuevo_adjunto

def throw_not_found(detail: str):
    raise HTTPException(status_code=404, detail=detail)
