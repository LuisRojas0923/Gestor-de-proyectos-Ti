"""Carga y descarga autenticada de evidencias de actividades WBS."""

import asyncio
import logging
from types import SimpleNamespace
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import UploadFile

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.core.config import obtener_configuracion
from app.core.middleware.limite_carga_actividad import CargaActividadExcedida
from app.core.rate_limiter import limiter
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.models.desarrollo.actividad import Actividad
from app.services.auth.servicio import ServicioAuth
from app.services.desarrollos.actividad_access_service import (
    usuario_puede_acceder_actividad,
    usuario_puede_modificar_actividad,
)
from app.services.desarrollos.actividad_archivo_service import (
    ArchivoActividadGuardado,
    ArchivoActividadInvalido,
    eliminar_archivo_interno,
    es_archivo_interno_actividad,
    guardar_archivo_actividad,
    resolver_archivo_actividad,
)


router = APIRouter()
config = obtener_configuracion()
logger = logging.getLogger(__name__)
MODULO_DESARROLLOS = "developments"


class ActividadArchivoRespuesta(BaseModel):
    archivo_url: str
    nombre_archivo: str
    tipo_mime: str
    tamano_bytes: int


async def requiere_permiso_desarrollos(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_DESARROLLOS not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para gestionar desarrollos")
    return usuario


async def _obtener_actividad(
    db: AsyncSession, actividad_id: int, bloquear: bool = False
) -> Actividad:
    consulta = select(Actividad).where(Actividad.id == actividad_id)
    if bloquear:
        consulta = consulta.with_for_update()
    try:
        resultado = await db.execute(consulta)
    except SQLAlchemyError as exc:
        logger.exception("No se pudo consultar la actividad %s", actividad_id)
        raise HTTPException(status_code=500, detail="No se pudo consultar la actividad") from exc
    actividad = resultado.scalar_one_or_none()
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return actividad


def _limite_bytes() -> int:
    return config.storage_max_size_mb * 1024 * 1024


@router.post(
    "/{actividad_id}/archivo",
    response_model=ActividadArchivoRespuesta,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["archivo"],
                        "properties": {"archivo": {"type": "string", "format": "binary"}},
                    }
                }
            },
        }
    },
)
@limiter.limit(config.rate_limit_actividad_archivo)
async def subir_archivo_actividad(
    request: Request,
    actividad_id: int,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_desarrollos),
):
    guardado: ArchivoActividadGuardado | None = None
    persistido = False
    raiz = Path(config.storage_path)
    try:
        longitud = request.headers.get("content-length")
        if longitud and int(longitud) > _limite_bytes() + 1024 * 1024:
            raise ArchivoActividadInvalido("La solicitud supera el tamaño permitido")

        actividad = await _obtener_actividad(db, actividad_id)
        if not await usuario_puede_modificar_actividad(db, usuario, actividad):
            raise HTTPException(status_code=404, detail="Actividad no encontrada")
        if actividad.anulada:
            raise HTTPException(status_code=409, detail="La actividad está anulada")

        usuario_contexto = SimpleNamespace(
            id=usuario.id,
            nombre=usuario.nombre,
            rol=usuario.rol,
        )
        # Libera la transacción de solo lectura antes de recibir el cuerpo multipart.
        await db.rollback()
        async with request.form(max_files=1, max_fields=0) as formulario:
            elementos = formulario.multi_items()
            if len(elementos) != 1 or elementos[0][0] != "archivo":
                raise ArchivoActividadInvalido("Debe enviar un único archivo")
            archivo = elementos[0][1]
            if not isinstance(archivo, UploadFile):
                raise ArchivoActividadInvalido("El campo archivo no es válido")
            guardado = await guardar_archivo_actividad(
                actividad_id, archivo, raiz, _limite_bytes()
            )

        actividad = await _obtener_actividad(db, actividad_id, bloquear=True)
        if not await usuario_puede_modificar_actividad(db, usuario_contexto, actividad):
            raise HTTPException(status_code=404, detail="Actividad no encontrada")
        if actividad.anulada:
            raise HTTPException(status_code=409, detail="La actividad está anulada")

        ruta_anterior = actividad.archivo_url
        actividad.archivo_url = guardado.ruta_relativa
        await db.commit()
        persistido = True
        if es_archivo_interno_actividad(actividad_id, ruta_anterior):
            eliminado = await asyncio.to_thread(
                eliminar_archivo_interno, actividad_id, ruta_anterior, raiz
            )
            if not eliminado:
                logger.warning(
                    "No se pudo limpiar la evidencia anterior de actividad %s",
                    actividad_id,
                )

        request.state.auditoria_entidad_tipo = "archivo_actividad"
        request.state.auditoria_entidad_id = str(actividad_id)
        return ActividadArchivoRespuesta(
            archivo_url=guardado.ruta_relativa,
            nombre_archivo=guardado.nombre_descarga,
            tipo_mime=guardado.tipo_mime,
            tamano_bytes=guardado.tamano_bytes,
        )
    except ArchivoActividadInvalido as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        await db.rollback()
        raise
    except CargaActividadExcedida:
        await db.rollback()
        raise
    except (TypeError, ValueError) as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Solicitud de archivo inválida") from exc
    except Exception as exc:
        await db.rollback()
        logger.exception("No se pudo guardar evidencia de actividad %s", actividad_id)
        raise HTTPException(status_code=500, detail="No se pudo guardar el archivo") from exc
    finally:
        if guardado and not persistido:
            await asyncio.to_thread(
                eliminar_archivo_interno, actividad_id, guardado.ruta_relativa, raiz
            )


@router.get("/{actividad_id}/archivo")
async def descargar_archivo_actividad(
    actividad_id: int,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_desarrollos),
):
    actividad = await _obtener_actividad(db, actividad_id)
    if not await usuario_puede_acceder_actividad(db, usuario, actividad):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    try:
        ruta, nombre, tipo_mime = await asyncio.to_thread(
            resolver_archivo_actividad,
            actividad_id,
            actividad.archivo_url,
            Path(config.storage_path),
        )
    except ArchivoActividadInvalido as exc:
        raise HTTPException(status_code=404, detail="Archivo no encontrado") from exc

    return FileResponse(
        path=ruta,
        filename=nombre,
        media_type=tipo_mime,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{actividad_id}/archivo", status_code=204)
async def eliminar_archivo_actividad(
    request: Request,
    actividad_id: int,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_desarrollos),
):
    actividad = await _obtener_actividad(db, actividad_id, bloquear=True)
    if not await usuario_puede_modificar_actividad(db, usuario, actividad):
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    if actividad.anulada:
        raise HTTPException(status_code=409, detail="La actividad está anulada")

    ruta_anterior = actividad.archivo_url
    actividad.archivo_url = None
    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.exception("No se pudo desvincular evidencia de actividad %s", actividad_id)
        raise HTTPException(status_code=500, detail="No se pudo eliminar el archivo") from exc

    if es_archivo_interno_actividad(actividad_id, ruta_anterior):
        eliminado = await asyncio.to_thread(
            eliminar_archivo_interno,
            actividad_id,
            ruta_anterior,
            Path(config.storage_path),
        )
        if not eliminado:
            logger.warning(
                "La evidencia de actividad %s quedó huérfana tras desvincularla",
                actividad_id,
            )
    request.state.auditoria_entidad_tipo = "archivo_actividad"
    request.state.auditoria_entidad_id = str(actividad_id)
    return Response(status_code=204)
