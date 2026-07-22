"""Servicio de notificaciones de usuario."""
import logging
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.alerta.notificacion import (
    NotificacionUsuario,
    NotificacionUsuarioCrear,
)

logger = logging.getLogger(__name__)

class ServicioNotificacion:
    @staticmethod
    async def crear_notificacion_sin_commit(
        db: AsyncSession,
        notificacion_in: NotificacionUsuarioCrear,
    ) -> NotificacionUsuario:
        """Inserta y deja el commit en manos del orquestador exterior."""
        db_notif = NotificacionUsuario(**notificacion_in.model_dump())
        db.add(db_notif)
        await db.flush()
        await db.refresh(db_notif)
        return db_notif

    @staticmethod
    async def crear_notificacion(
        db: AsyncSession,
        notificacion_in: NotificacionUsuarioCrear
    ) -> NotificacionUsuario:
        db_notif = await ServicioNotificacion.crear_notificacion_sin_commit(
            db, notificacion_in
        )
        await db.commit()
        
        # Opcional: Enviar por WebSocket si está conectado
        try:
            from app.services.notificacion.ws_manager import notification_manager
            await notification_manager.broadcast_to_user(
                db_notif.usuario_id,
                {
                    "id": db_notif.id,
                    "titulo": db_notif.titulo,
                    "mensaje": db_notif.mensaje,
                    "tipo_evento": db_notif.tipo_evento,
                    "referencia_id": db_notif.referencia_id,
                    "leido": db_notif.leido,
                    "creado_en": db_notif.creado_en.isoformat() if db_notif.creado_en else None
                }
            )
        except Exception:
            logger.warning("No se pudo emitir la notificacion por WebSocket")

        return db_notif

    @staticmethod
    async def listar_notificaciones_usuario(
        db: AsyncSession,
        usuario_id: str,
        *,
        limit: int = 50,
    ) -> List[NotificacionUsuario]:
        stmt = select(NotificacionUsuario).where(
            NotificacionUsuario.usuario_id == usuario_id
        ).order_by(NotificacionUsuario.creado_en.desc()).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def actualizar_estado_leido_propio(
        db: AsyncSession,
        *,
        notificacion_id: int,
        usuario_id: str,
        leido: bool,
    ) -> Optional[NotificacionUsuario]:
        """Actualiza una notificacion solo cuando pertenece al usuario actual."""
        stmt = select(NotificacionUsuario).where(
            NotificacionUsuario.id == notificacion_id,
            NotificacionUsuario.usuario_id == usuario_id,
        )
        result = await db.execute(stmt)
        db_notif = result.scalar_one_or_none()
        if not db_notif:
            return None
        db_notif.leido = leido
        db.add(db_notif)
        await db.flush()
        await db.refresh(db_notif)
        return db_notif
