"""
API de IA - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario
from app.models.ia.modelos_ia import RecomendacionIA, SolicitudAnalisisIA, HistorialAnalisisIA, SolicitudChatTicket, RespuestaChatTicket
from app.models.ticket.ticket import TicketCrear
from app.services.ia.chat_service import ChatTicketService
from app.services.ticket.servicio import ServicioTicket

router = APIRouter()
chat_service = ChatTicketService()


@router.post("/analizar")
async def solicitar_analisis_ia(
    solicitud: SolicitudAnalisisIA,
    db: AsyncSession = Depends(obtener_db)
):
    """Solicita un análisis de IA para un desarrollo específico"""
    try:
        # TODO: Implementar lógica de análisis con servicio de IA
        return {"respuesta": "Análisis en proceso..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al solicitar análisis de IA: {str(e)}")


@router.get("/recomendaciones", response_model=List[RecomendacionIA])
async def obtener_recomendaciones(
    desarrollo_id: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene recomendaciones generadas por la IA"""
    try:
        # TODO: Implementar lógica con servicio de IA
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener recomendaciones: {str(e)}")


@router.get("/historial", response_model=List[HistorialAnalisisIA])
async def obtener_historial_ia(
    desarrollo_id: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene historial de interacciones con la IA"""
    try:
        # TODO: Implementar lógica con servicio de IA
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial de IA: {str(e)}")


@router.post("/chat-ticket", response_model=RespuestaChatTicket)
async def chat_ticket_asistente(
    solicitud: SolicitudChatTicket,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Endpoint conversacional para crear tickets usando IA.
    Extrae datos del lenguaje natural y crea el ticket cuando tiene info completa.
    """
    try:
        # 1. Procesar con IA
        resultado = await chat_service.procesar_mensaje(
            mensaje_usuario=solicitud.mensaje,
            historial=solicitud.historial,
            db=db
        )

        ticket_id = None
        
        # 2. Si la IA extrajo datos completos, crear el ticket
        if resultado["ticket_data"]:
            data = resultado["ticket_data"]
            
            # Preparar objeto de creación con datos del usuario actual
            ticket_crear = TicketCrear(
                asunto=data["asunto"],
                descripcion=data["descripcion"],
                prioridad=data["prioridad"],
                categoria_id=data["categoria_id"],
                creador_id=usuario_actual.id,
                nombre_creador=usuario_actual.nombre,
                correo_creador=usuario_actual.correo,
                area_creador=usuario_actual.area,
                cargo_creador=usuario_actual.cargo,
                sede_creador=usuario_actual.sede
            )
            
            # Crear ticket usando el servicio existente
            nuevo_ticket = await ServicioTicket.crear_ticket(db, ticket_crear)
            ticket_id = nuevo_ticket.id

        return RespuestaChatTicket(
            respuesta=resultado["respuesta"],
            ticket_data=resultado["ticket_data"],
            ticket_id=ticket_id
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error en el asistente de IA: {str(e)}")
