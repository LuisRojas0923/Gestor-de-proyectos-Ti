"""
Router de Tickets - Backend V2 (Async + SQLModel)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy import func as sa_func

from app.database import obtener_db
from app.api.auth.router import obtener_usuario_actual_db, obtener_usuario_actual_opcional
from app.models.auth.usuario import Usuario
from app.models.ticket.ticket import (
    Ticket,
    ComentarioTicket,
    CategoriaTicket,
    HistorialTicket,
    AdjuntoTicket,
    TicketCrear,
    TicketActualizar,
    AdjuntoCrear,
    ComentarioCrear,
    TicketResumen,
    TicketDetalle,
    ComentarioPublico,
)
from app.services.ticket.servicio import ServicioTicket
from app.services.ticket.bi_service import TicketBIService
from app.utils_cache import global_cache
from app.config import config
from app.services.ticket.ws_manager import manager

router = APIRouter()


@router.get("/categorias", response_model=List[CategoriaTicket])
async def listar_categorias(db: AsyncSession = Depends(obtener_db)):
    """Retorna lista de categorias de soporte con cache"""
    cache_key = "ticket_categorias"
    cached_data = global_cache.get(cache_key)
    if cached_data:
        return cached_data

    try:
        data = await ServicioTicket.listar_categorias(db)
        global_cache.set(cache_key, data)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener categorias: {str(e)}"
        )


@router.get("/estadisticas/resumen")
async def obtener_resumen_estadisticas(db: AsyncSession = Depends(obtener_db)):
    """Retorna resumen de estadisticas de tickets con cache"""
    cache_key = "ticket_stats_resumen"
    cached_data = global_cache.get(cache_key)
    if cached_data:
        return cached_data

    try:
        data = await ServicioTicket.obtener_estadisticas_resumen(db)
        global_cache.set(cache_key, data)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estadisticas/avanzadas")
async def obtener_estadisticas_avanzadas(db: AsyncSession = Depends(obtener_db)):
    """Retorna metricas avanzadas incluyendo SLA y tiempos de resolucion"""
    try:
        return await ServicioTicket.obtener_estadisticas_avanzadas(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estadisticas/bi")
async def obtener_data_bi(db: AsyncSession = Depends(obtener_db)):
    """Retorna el set de datos completo para dashboards BI"""
    try:
        return await TicketBIService.obtener_data_analitica_bi(db)
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estadisticas/rendimiento")
async def obtener_rendimiento(db: AsyncSession = Depends(obtener_db)):
    """Retorna metricas de rendimiento por analista"""
    try:
        # Obtener lista de analistas unicos que tienen tickets asignados
        result = await db.execute(
            select(Ticket.asignado_a).where(Ticket.asignado_a.is_not(None)).distinct()
        )
        analistas = [a[0] for a in result.all()]

        ranking = []
        for nombre in analistas:
            # Tickets finalizados para cálculo de tiempo real
            result_resueltos = await db.execute(
                select(Ticket.creado_en, Ticket.resuelto_en).where(
                    Ticket.asignado_a == nombre,
                    Ticket.estado.in_(["Resuelto", "Cerrado"]),
                    Ticket.resuelto_en.is_not(None),
                )
            )
            data_resueltos = result_resueltos.all()
            resueltos_analista = len(data_resueltos)

            avg_h = 0
            if data_resueltos:
                tiempos = [
                    (t.resuelto_en - t.creado_en).total_seconds() / 3600
                    for t in data_resueltos
                    if t.resuelto_en and t.creado_en
                ]
                avg_h = round(sum(tiempos) / len(tiempos), 1) if tiempos else 0

            # Carga activa actual (Operational Load)
            active_res = await db.execute(
                select(sa_func.count(Ticket.id)).where(
                    Ticket.asignado_a == nombre,
                    Ticket.estado.in_(
                        [
                            "Abierto",
                            "Asignado",
                            "En Proceso",
                            "Pendiente Info",
                            "Escalado",
                        ]
                    ),
                )
            )
            carga_activa = active_res.scalar() or 0

            # Conteo específico de tickets en proceso
            proceso_res = await db.execute(
                select(sa_func.count(Ticket.id)).where(
                    Ticket.asignado_a == nombre, Ticket.estado == "En Proceso"
                )
            )
            en_proceso = proceso_res.scalar() or 0

            # Score de desempeño histórico
            total_hist_res = await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.asignado_a == nombre)
            )
            total_hist = total_hist_res.scalar() or 1
            score = resueltos_analista / total_hist * 100

            ranking.append(
                {
                    "name": nombre,
                    "total": carga_activa,
                    "cerrados": resueltos_analista,
                    "en_proceso": en_proceso,
                    "avg_time": avg_h,
                    "performance_score": round(score, 1),
                }
            )

        ranking.sort(key=lambda x: x["total"], reverse=True)
        return ranking
    except Exception:
        return []


@router.get("/mis-tickets/{creador_id}", response_model=List[TicketResumen])
async def listar_mis_tickets(creador_id: str, db: AsyncSession = Depends(obtener_db)):
    """Lista tickets de un usuario especifico"""
    try:
        return await ServicioTicket.listar_tickets_por_usuario(db, creador_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[TicketResumen])
async def listar_tickets(
    creador_id: Optional[str] = None,
    estado: Optional[str] = None,
    asignado_a: Optional[str] = None,
    skip: int = 0,
    limite: int = 100,
    search: Optional[str] = None,
    sub_estado: Optional[str] = None,
    categoria_id: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Lista tickets de soporte con paginación, búsqueda avanzada y restricciones de visibilidad"""
    try:
        return await ServicioTicket.listar_tickets(
            db,
            creador_id=creador_id,
            estado=estado,
            asignado_a=asignado_a,
            skip=skip,
            limit=limite,
            search=search,
            sub_estado=sub_estado,
            categoria_id=categoria_id,
            usuario_peticion=usuario_actual,
        )
    except Exception as e:
        import logging

        logging.error(f"Error listando tickets: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al listar tickets: {type(e).__name__}"
        )


@router.post("/", response_model=TicketResumen)
async def crear_ticket(
    ticket: TicketCrear, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Optional[Usuario] = Depends(obtener_usuario_actual_opcional),
):
    """Crea un nuevo ticket de soporte delegando al servicio"""
    # Si hay sesión activa, forzar identidad para seguridad y consistencia
    if usuario_actual:
        ticket.creador_id = str(usuario_actual.id)
        ticket.nombre_creador = usuario_actual.nombre
        ticket.correo_creador = usuario_actual.correo
    
    try:
        return await ServicioTicket.crear_ticket(db, ticket, background_tasks)
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ERROR_CREAR_TICKET: {str(e)}")


@router.get("/{ticket_id}", response_model=TicketDetalle)
async def obtener_ticket(ticket_id: str, db: AsyncSession = Depends(obtener_db)):
    """Obtiene detalles de un ticket"""
    try:
        ticket = await ServicioTicket.obtener_ticket_por_id(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        return ticket
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener ticket: {str(e)}"
        )


@router.get("/{ticket_id}/comentarios", response_model=List[ComentarioPublico])
async def obtener_comentarios_ticket(
    ticket_id: str, db: AsyncSession = Depends(obtener_db)
):
    """Retorna los comentarios de un ticket ordenados por fecha"""
    try:
        result = await db.execute(
            select(ComentarioTicket)
            .where(ComentarioTicket.ticket_id == ticket_id)
            .order_by(ComentarioTicket.creado_en.asc())
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener comentarios: {str(e)}"
        )


@router.websocket("/ws/{ticket_id}")
async def websocket_ticket_chat(websocket: WebSocket, ticket_id: str):
    """
    Endpoint de WebSocket para chat en tiempo real por ticket.
    Mantiene la conexión abierta y notifica eventos.
    """
    await manager.connect(websocket, ticket_id)
    try:
        while True:
            # Mantener la conexión abierta escuchando mensajes (opcional)
            # Por ahora solo escuchamos para detectar desconexión (Heartbeat)
            _ = await websocket.receive_text()
            # Si el cliente envía algo, podríamos procesarlo aquí
    except WebSocketDisconnect:
        manager.disconnect(websocket, ticket_id)
    except Exception:
        manager.disconnect(websocket, ticket_id)


@router.post("/{ticket_id}/comentarios", response_model=ComentarioTicket)
async def agregar_comentario(
    ticket_id: str,
    comentario_data: ComentarioCrear,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Optional[Usuario] = Depends(obtener_usuario_actual_opcional),
):
    """Agrega un comentario a un ticket delegando al servicio para notificaciones"""
    # Asegurar identidad del remitente desde el Token si existe sesión
    if usuario_actual:
        comentario_data.usuario_id = str(usuario_actual.id)
        comentario_data.nombre_usuario = usuario_actual.nombre
    
    try:
        return await ServicioTicket.agregar_comentario(db, ticket_id, comentario_data, background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{ticket_id}/comentarios/leido")
async def marcar_comentarios_leidos(
    ticket_id: str,
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Marca todos los comentarios no leídos (que no sean del usuario actual) como leídos"""
    try:
        # Seleccionar comentarios del ticket que no son del usuario actual y no están leídos
        # Y que no sean internos (a menos que el usuario sea analista, pero por ahora simplificamos)
        result = await db.execute(
            select(ComentarioTicket)
            .where(ComentarioTicket.ticket_id == ticket_id)
            .where(ComentarioTicket.usuario_id != usuario_actual.id)
            .where(ComentarioTicket.leido.is_(False))
        )
        comentarios = result.scalars().all()

        for c in comentarios:
            c.leido = True
            c.leido_en = sa_func.now()
            db.add(c)

        await db.commit()
        return {"status": "success", "count": len(comentarios)}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{ticket_id}", response_model=TicketResumen)
async def actualizar_ticket(
    ticket_id: str, 
    ticket_in: TicketActualizar, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(obtener_db)
):
    """Actualiza campos de un ticket existente delegando al servicio"""
    try:
        return await ServicioTicket.actualizar_ticket(db, ticket_id, ticket_in, background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticket_id}/historial", response_model=List[HistorialTicket])
async def obtener_historial_ticket(
    ticket_id: str, db: AsyncSession = Depends(obtener_db)
):
    """Retorna el log de actividades de un ticket"""
    try:
        result = await db.execute(
            select(HistorialTicket)
            .where(HistorialTicket.ticket_id == ticket_id)
            .order_by(HistorialTicket.creado_en.desc())
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener historial: {str(e)}"
        )


@router.get("/{ticket_id}/adjuntos", response_model=List[AdjuntoTicket])
async def listar_adjuntos(ticket_id: str, db: AsyncSession = Depends(obtener_db)):
    """Lista metadatos de archivos adjuntos de un ticket"""
    try:
        result = await db.execute(
            select(AdjuntoTicket).where(AdjuntoTicket.ticket_id == ticket_id)
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al listar adjuntos: {str(e)}"
        )


@router.post("/{ticket_id}/adjuntos", response_model=AdjuntoTicket)
async def subir_adjunto(
    ticket_id: str, adjunto: AdjuntoCrear, db: AsyncSession = Depends(obtener_db)
):
    """Guarda un archivo adjunto delegando al servicio"""
    try:
        return await ServicioTicket.subir_adjunto(db, ticket_id, adjunto)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/adjuntos/{adjunto_id}", response_model=AdjuntoTicket)
async def obtener_adjunto(adjunto_id: int, db: AsyncSession = Depends(obtener_db)):
    """
    Retorna un adjunto. Si es un archivo físico (nuevo sistema), 
    el contenido Base64 se mantiene nulo y se debe usar el endpoint de descarga.
    Si es legado, retorna el contenido Base64 directamente.
    """
    try:
        result = await db.execute(
            select(AdjuntoTicket).where(AdjuntoTicket.id == adjunto_id)
        )
        adjunto = result.scalars().first()
        if not adjunto:
            raise HTTPException(status_code=404, detail="Adjunto no encontrado")
        return adjunto
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al obtener adjunto: {str(e)}"
        )


@router.get("/adjuntos/{adjunto_id}/archivo")
async def descargar_archivo_adjunto(adjunto_id: int, db: AsyncSession = Depends(obtener_db)):
    """
    Sirve el archivo físico desde el disco. 
    Solo funciona para archivos guardados con el nuevo sistema (ruta_archivo).
    """
    try:
        result = await db.execute(
            select(AdjuntoTicket).where(AdjuntoTicket.id == adjunto_id)
        )
        adjunto = result.scalars().first()
        if not adjunto or not adjunto.ruta_archivo:
            raise HTTPException(status_code=404, detail="Archivo físico no encontrado o es de legado")

        abs_path = Path(config.storage_path) / adjunto.ruta_archivo
        if not abs_path.exists():
            raise HTTPException(status_code=404, detail="El archivo no existe en el servidor")

        return FileResponse(
            path=abs_path,
            filename=adjunto.nombre_archivo,
            media_type=adjunto.tipo_mime or "application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
