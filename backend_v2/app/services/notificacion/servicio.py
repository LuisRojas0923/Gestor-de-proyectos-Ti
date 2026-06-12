"""
Servicio de Notificaciones de Usuario - Backend V2
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.alerta.notificacion import (
    NotificacionUsuario,
    NotificacionUsuarioCrear,
    NotificacionUsuarioActualizar
)

class ServicioNotificacion:
    @staticmethod
    async def crear_notificacion(
        db: AsyncSession,
        notificacion_in: NotificacionUsuarioCrear
    ) -> NotificacionUsuario:
        db_notif = NotificacionUsuario(**notificacion_in.model_dump())
        db.add(db_notif)
        await db.commit()
        await db.refresh(db_notif)
        
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
        except Exception as e:
            # Silenciar errores del broadcast para no interrumpir la transacción principal
            import logging
            logging.getLogger(__name__).warning(f"Error enviando websocket de notificación: {e}")

        return db_notif

    @staticmethod
    async def listar_notificaciones_usuario(
        db: AsyncSession,
        usuario_id: str
    ) -> List[NotificacionUsuario]:
        stmt = select(NotificacionUsuario).where(
            NotificacionUsuario.usuario_id == usuario_id
        ).order_by(NotificacionUsuario.creado_en.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def actualizar_estado_leido(
        db: AsyncSession,
        notificacion_id: int,
        actualizar_in: NotificacionUsuarioActualizar
    ) -> Optional[NotificacionUsuario]:
        stmt = select(NotificacionUsuario).where(NotificacionUsuario.id == notificacion_id)
        result = await db.execute(stmt)
        db_notif = result.scalar_one_or_none()
        if not db_notif:
            return None
        db_notif.leido = actualizar_in.leido
        db.add(db_notif)
        await db.commit()
        await db.refresh(db_notif)
        return db_notif
