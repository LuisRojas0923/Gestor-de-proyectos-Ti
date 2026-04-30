"""
API de IA - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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
    Endpoint conversacional (Síncrono) para crear tickets usando IA.
    """
    try:
        resultado = await chat_service.procesar_mensaje(
            mensaje_usuario=solicitud.mensaje,
            historial=solicitud.historial,
            db=db
        )

        ticket_id = None
        if resultado["ticket_data"]:
            data = resultado["ticket_data"]
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
            nuevo_ticket = await ServicioTicket.crear_ticket(db, ticket_crear)
            ticket_id = nuevo_ticket.id

        return RespuestaChatTicket(
            respuesta=resultado["respuesta"],
            ticket_data=resultado["ticket_data"],
            ticket_id=ticket_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en IA: {str(e)}")


@router.post("/chat-ticket-stream")
async def chat_ticket_asistente_stream(
    solicitud: SolicitudChatTicket,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db)
):
    """
    Endpoint conversacional con Streaming (SSE).
    Envía el texto conforme se genera y el ticket_id al final si se crea.
    """
    async def event_generator():
        full_text = ""
        try:
            async for chunk in chat_service.procesar_mensaje_stream(
                mensaje_usuario=solicitud.mensaje,
                historial=solicitud.historial,
                db=db
            ):
                full_text += chunk
                yield chunk
            
            # Al terminar el stream, ver si hay ticket
            ticket_data = chat_service.extraer_ticket_data(full_text)
            if ticket_data:
                ticket_crear = TicketCrear(
                    asunto=ticket_data["asunto"],
                    descripcion=ticket_data["descripcion"],
                    prioridad=ticket_data["prioridad"],
                    categoria_id=ticket_data["categoria_id"],
                    creador_id=usuario_actual.id,
                    nombre_creador=usuario_actual.nombre,
                    correo_creador=usuario_actual.correo,
                    area_creador=usuario_actual.area,
                    cargo_creador=usuario_actual.cargo,
                    sede_creador=usuario_actual.sede
                )
                nuevo_ticket = await ServicioTicket.crear_ticket(db, ticket_crear)
                # Enviar metadata final
                yield f"\n\n__TICKET_ID__:{nuevo_ticket.id}"
        except Exception as e:
            yield f"\n\n__ERROR__:{str(e)}"

    return StreamingResponse(event_generator(), media_type="text/plain")
