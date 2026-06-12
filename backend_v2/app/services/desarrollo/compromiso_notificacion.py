"""
Servicio y Tarea de Notificación de Compromisos - Backend V2
"""
import logging
import asyncio
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.desarrollo.actividad import Actividad
from app.models.auth.usuario import Usuario
from app.services.notificacion.servicio import ServicioNotificacion
from app.models.alerta.notificacion import NotificacionUsuarioCrear, NotificacionUsuario
from app.services.notifications.email_service import EmailService

logger = logging.getLogger(__name__)


def es_correo_valido(email: str) -> bool:
    if not email:
        return False
    return "@" in email and "." in email


async def verificar_y_notificar_compromisos(db: AsyncSession):
    logger.info("Iniciando verificación de compromisos de actividades...")
    try:
        # 1. Obtener actividades con compromiso_fecha y compromiso_cumplido = False
        stmt = select(Actividad).where(
            Actividad.compromiso_fecha != None,
            Actividad.compromiso_cumplido == False
        )
        res = await db.execute(stmt)
        actividades = res.scalars().all()
        
        hoy = date.today()
        logger.info(f"Se encontraron {len(actividades)} actividades con compromisos pendientes.")

        for act in actividades:
            # Calcular días restantes
            dias_restantes = (act.compromiso_fecha - hoy).days
            
            # Los días que nos interesan son: 3, 2, 1 y 0
            if dias_restantes not in (0, 1, 2, 3):
                continue
                
            # Identificar usuarios a notificar
            usuarios_a_notificar = set()
            if act.asignado_a_id:
                usuarios_a_notificar.add(act.asignado_a_id)
            if act.responsable_id:
                usuarios_a_notificar.add(act.responsable_id)
                
            if not usuarios_a_notificar:
                continue

            # Consultar los datos de estos usuarios
            usuarios_stmt = select(Usuario).where(Usuario.id.in_(list(usuarios_a_notificar)))
            usuarios_res = await db.execute(usuarios_stmt)
            usuarios = usuarios_res.scalars().all()

            for usuario in usuarios:
                ref_id_evento = f"compromiso_{act.id}_{dias_restantes}d"
                tipo_evento = f"compromiso_vence_{dias_restantes}d"
                
                # Verificar si ya existe una notificación de este tipo para el usuario
                notif_existente_stmt = select(NotificacionUsuario).where(
                    NotificacionUsuario.usuario_id == usuario.id,
                    NotificacionUsuario.referencia_id == ref_id_evento
                )
                notif_res = await db.execute(notif_existente_stmt)
                if notif_res.scalar_one_or_none() is not None:
                    # Ya fue notificado para este umbral de días
                    continue

                # Determinar mensaje
                if dias_restantes == 0:
                    mensaje = f"Tu compromiso en la actividad '{act.titulo}' vence hoy."
                else:
                    mensaje = f"Tu compromiso en la actividad '{act.titulo}' vence en {dias_restantes} días ({act.compromiso_fecha.strftime('%d/%m/%Y')})."

                logger.info(f"Notificando a usuario {usuario.nombre} ({usuario.id}) sobre vencimiento de compromiso de actividad {act.id} ({dias_restantes}d).")
                
                # Crear notificación en la app/WebSocket
                notif_in = NotificacionUsuarioCrear(
                    usuario_id=usuario.id,
                    titulo="Recordatorio de Compromiso",
                    mensaje=mensaje,
                    tipo_evento=tipo_evento,
                    referencia_id=ref_id_evento
                )
                await ServicioNotificacion.crear_notificacion(db, notif_in)

                # Si posee un correo electrónico válido, enviar correo
                if es_correo_valido(usuario.correo):
                    asunto = f"Aviso de Vencimiento de Compromiso: {act.titulo}"
                    cuerpo_html = f"""
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hola <strong>{usuario.nombre}</strong>,
                    </p>
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        Te recordamos que tienes un compromiso pendiente en la actividad <strong>{act.titulo}</strong>.
                    </p>
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        <strong>Detalle del Compromiso:</strong> {act.compromiso or 'Sin detalles adicionales.'}
                    </p>
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        <strong>Fecha límite:</strong> {act.compromiso_fecha.strftime('%d/%m/%Y')} ({'Vence hoy' if dias_restantes == 0 else f'Faltan {dias_restantes} días'})
                    </p>
                    <div style="text-align: center; margin-bottom: 30px;">
                        <a href="{EmailService.get_frontend_url()}/desarrollo/{act.desarrollo_id}" style="background-color: #002060; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
                            Ver Detalles de Actividades
                        </a>
                    </div>
                    """
                    html_final = EmailService._get_base_layout("Recordatorio de Compromiso", cuerpo_html)
                    try:
                        await EmailService.enviar_correo(
                            asunto=asunto,
                            destinatarios=[usuario.correo],
                            contenido_html=html_final,
                            attachments=EmailService._get_attachments()
                        )
                        logger.info(f"Correo de recordatorio enviado a {usuario.correo}.")
                    except Exception as e:
                        logger.error(f"Error al enviar correo de recordatorio a {usuario.correo}: {e}")

    except Exception as e:
        logger.error(f"Error general en verificar_y_notificar_compromisos: {e}", exc_info=True)


async def iniciar_loop_verificador_compromisos(intervalo_horas: int = 12):
    """Loop asíncrono para verificar compromisos periódicamente"""
    logger.info(f"Iniciando loop verificador de compromisos (cada {intervalo_horas} horas)...")
    # Esperar un momento en el arranque inicial para no saturar al levantar el servicio
    await asyncio.sleep(30)
    
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await verificar_y_notificar_compromisos(db)
        except Exception as e:
            logger.error(f"Error en el ciclo del verificador de compromisos: {e}")
            
        # Dormir el intervalo configurado
        await asyncio.sleep(intervalo_horas * 3600)
