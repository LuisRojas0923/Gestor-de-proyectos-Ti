import base64
from pathlib import Path
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket.ticket import AdjuntoTicket, AdjuntoCrear, HistorialTicket
from app.config import config


class AttachmentService:
    @staticmethod
    async def registrar_historial_interno(
        db: AsyncSession,
        ticket_id: str,
        accion: str,
        detalle: str,
    ):
        """Helper interno para registrar eventos (Async)"""
        log = HistorialTicket(ticket_id=ticket_id, accion=accion, detalle=detalle)
        db.add(log)

    @classmethod
    async def subir_adjunto(
        cls, db: AsyncSession, ticket_id: str, adjunto: AdjuntoCrear
    ) -> AdjuntoTicket:
        """
        Sube un archivo adjunto a un ticket, guardándolo en el sistema de archivos local.
        (Almacenamiento escalable mediante volúmenes de Docker)
        """
        # 1. Preparar directorios (Estructura: storage/attachments/YYYY/MM/TicketID/filename)
        now = datetime.now()
        rel_path = f"{now.year}/{now.month:02d}/{ticket_id}"
        abs_dir = Path(config.storage_path) / rel_path
        abs_dir.mkdir(parents=True, exist_ok=True)

        full_abs_path = abs_dir / adjunto.nombre_archivo
        file_rel_path = f"{rel_path}/{adjunto.nombre_archivo}"

        # 2. Decodificar y Guardar archivo
        try:
            # Eliminar prefijo data:image/png;base64, si existe
            header = "base64,"
            b64_str = adjunto.contenido_base64
            if header in b64_str:
                b64_str = b64_str.split(header)[1]
            
            file_data = base64.b64decode(b64_str)
            tamano_bytes = len(file_data)

            with open(full_abs_path, "wb") as f:
                f.write(file_data)
        except Exception as e:
            raise Exception(f"Error al guardar archivo físico: {str(e)}")

        # 3. Registrar en Base de Datos
        nuevo_adjunto = AdjuntoTicket(
            ticket_id=ticket_id,
            nombre_archivo=adjunto.nombre_archivo,
            ruta_archivo=file_rel_path, # Guardamos ruta relativa para portabilidad
            tamano_bytes=tamano_bytes,
            tipo_mime=adjunto.tipo_mime,
        )
        db.add(nuevo_adjunto)
        
        await cls.registrar_historial_interno(
            db,
            ticket_id,
            "Archivo Adjunto",
            f"Se adjunto el archivo físico: {adjunto.nombre_archivo}",
        )
        
        await db.commit()
        await db.refresh(nuevo_adjunto)
        return nuevo_adjunto
