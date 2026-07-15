"""Almacenamiento local seguro de evidencias para actividades WBS."""

import asyncio
import os
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from uuid import uuid4

from fastapi import UploadFile


CHUNK_SIZE = 1024 * 1024
TIPOS_PERMITIDOS = {
    ".pdf": ("application/pdf",),
    ".png": ("image/png",),
    ".jpg": ("image/jpeg",),
    ".jpeg": ("image/jpeg",),
    ".txt": ("text/plain",),
    ".csv": ("text/csv", "application/csv", "text/plain"),
    ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",),
    ".xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",),
    ".pptx": ("application/vnd.openxmlformats-officedocument.presentationml.presentation",),
}
EXTENSIONES_PELIGROSAS = {
    ".bat", ".cmd", ".com", ".dll", ".exe", ".html", ".htm", ".js",
    ".jar", ".msi", ".ps1", ".scr", ".svg", ".vbs",
}
ARCHIVOS_OFFICE = {
    ".docx": "word/document.xml",
    ".xlsx": "xl/workbook.xml",
    ".pptx": "ppt/presentation.xml",
}
PATRON_RUTA = re.compile(
    r"^actividades/(?P<actividad_id>\d+)/(?P<archivo>[0-9a-f]{32}_[^/\\]+)$"
)


class ArchivoActividadInvalido(ValueError):
    """El archivo no cumple el contrato de seguridad del módulo."""


@dataclass(frozen=True)
class ArchivoActividadGuardado:
    ruta_relativa: str
    nombre_descarga: str
    tipo_mime: str
    tamano_bytes: int


def _normalizar_nombre(nombre: str | None) -> str:
    nombre_base = (nombre or "").replace("\\", "/").split("/")[-1]
    nombre_base = unicodedata.normalize("NFC", nombre_base).strip(" .")
    nombre_base = "".join(
        caracter for caracter in nombre_base
        if caracter.isprintable() and caracter not in '<>:"/\\|?*'
    )
    if not nombre_base or len(nombre_base.encode("utf-8")) > 180:
        raise ArchivoActividadInvalido("El nombre del archivo no es válido")

    sufijos = [sufijo.lower() for sufijo in Path(nombre_base).suffixes]
    if not sufijos or sufijos[-1] not in TIPOS_PERMITIDOS:
        raise ArchivoActividadInvalido("Tipo de archivo no permitido")
    if any(sufijo in EXTENSIONES_PELIGROSAS for sufijo in sufijos[:-1]):
        raise ArchivoActividadInvalido("El nombre contiene una extensión peligrosa")
    return nombre_base


def _validar_firma(ruta: Path, extension: str) -> None:
    with ruta.open("rb") as archivo:
        cabecera = archivo.read(16)
    if extension == ".pdf" and not cabecera.startswith(b"%PDF-"):
        raise ArchivoActividadInvalido("El contenido no corresponde a un PDF")
    if extension == ".png" and not cabecera.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ArchivoActividadInvalido("El contenido no corresponde a una imagen PNG")
    if extension in (".jpg", ".jpeg") and not cabecera.startswith(b"\xff\xd8\xff"):
        raise ArchivoActividadInvalido("El contenido no corresponde a una imagen JPEG")
    if extension in (".txt", ".csv"):
        contenido = ruta.read_bytes()
        if b"\x00" in contenido:
            raise ArchivoActividadInvalido("El archivo de texto contiene datos binarios")
        try:
            contenido.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ArchivoActividadInvalido("El archivo de texto debe usar UTF-8") from exc
    if extension in ARCHIVOS_OFFICE:
        try:
            with zipfile.ZipFile(ruta) as paquete:
                nombres = set(paquete.namelist())
        except (OSError, zipfile.BadZipFile) as exc:
            raise ArchivoActividadInvalido("El documento de Office no es válido") from exc
        if "[Content_Types].xml" not in nombres or ARCHIVOS_OFFICE[extension] not in nombres:
            raise ArchivoActividadInvalido("El contenido no corresponde al documento indicado")


async def guardar_archivo_actividad(
    actividad_id: int,
    archivo: UploadFile,
    almacenamiento_raiz: Path,
    maximo_bytes: int,
) -> ArchivoActividadGuardado:
    if maximo_bytes <= 0:
        raise ArchivoActividadInvalido("El límite de almacenamiento no es válido")

    nombre = _normalizar_nombre(archivo.filename)
    extension = Path(nombre).suffix.lower()
    tipo_mime = archivo.content_type or ""
    if tipo_mime not in TIPOS_PERMITIDOS[extension]:
        raise ArchivoActividadInvalido("El tipo MIME no coincide con el archivo")

    directorio = almacenamiento_raiz / "actividades" / str(actividad_id)
    await asyncio.to_thread(directorio.mkdir, parents=True, exist_ok=True)
    nombre_fisico = f"{uuid4().hex}_{nombre}"
    ruta_final = directorio / nombre_fisico
    ruta_temporal = directorio / f".{uuid4().hex}.tmp"
    tamano = 0
    archivo_cerrado = False

    try:
        with ruta_temporal.open("xb") as destino:
            while bloque := await archivo.read(CHUNK_SIZE):
                tamano += len(bloque)
                if tamano > maximo_bytes:
                    raise ArchivoActividadInvalido(
                        f"El archivo supera el límite de {maximo_bytes} bytes"
                    )
                await asyncio.to_thread(destino.write, bloque)
            if tamano == 0:
                raise ArchivoActividadInvalido("El archivo está vacío")
            await asyncio.to_thread(destino.flush)
            await asyncio.to_thread(os.fsync, destino.fileno())

        await asyncio.to_thread(_validar_firma, ruta_temporal, extension)
        await archivo.close()
        archivo_cerrado = True
        reemplazo = asyncio.create_task(
            asyncio.to_thread(os.replace, ruta_temporal, ruta_final)
        )
        try:
            await asyncio.shield(reemplazo)
        except asyncio.CancelledError:
            await reemplazo
            raise
    except BaseException:
        ruta_temporal.unlink(missing_ok=True)
        ruta_final.unlink(missing_ok=True)
        raise
    finally:
        if not archivo_cerrado:
            await archivo.close()

    ruta_relativa = PurePosixPath("actividades", str(actividad_id), nombre_fisico).as_posix()
    return ArchivoActividadGuardado(ruta_relativa, nombre, TIPOS_PERMITIDOS[extension][0], tamano)


def resolver_archivo_actividad(
    actividad_id: int,
    ruta_relativa: str | None,
    almacenamiento_raiz: Path,
) -> tuple[Path, str, str]:
    coincidencia = PATRON_RUTA.fullmatch(ruta_relativa or "")
    if not coincidencia or int(coincidencia.group("actividad_id")) != actividad_id:
        raise ArchivoActividadInvalido("La referencia del archivo no es válida")

    raiz = almacenamiento_raiz.resolve()
    directorio_esperado = (raiz / "actividades" / str(actividad_id)).resolve()
    candidata = raiz / PurePosixPath(ruta_relativa or "")
    if candidata.is_symlink() or candidata.parent.is_symlink():
        raise ArchivoActividadInvalido("La referencia del archivo no es válida")
    ruta = candidata.resolve()
    if ruta.parent != directorio_esperado or not ruta.is_file():
        raise ArchivoActividadInvalido("El archivo no existe")

    nombre_fisico = coincidencia.group("archivo")
    nombre_descarga = nombre_fisico.split("_", 1)[1]
    extension = Path(nombre_descarga).suffix.lower()
    if extension not in TIPOS_PERMITIDOS:
        raise ArchivoActividadInvalido("El tipo almacenado no es válido")
    return ruta, nombre_descarga, TIPOS_PERMITIDOS[extension][0]


def eliminar_archivo_interno(
    actividad_id: int,
    ruta_relativa: str | None,
    almacenamiento_raiz: Path,
) -> bool:
    try:
        ruta, _, _ = resolver_archivo_actividad(
            actividad_id, ruta_relativa, almacenamiento_raiz
        )
    except ArchivoActividadInvalido:
        return False
    try:
        ruta.unlink(missing_ok=True)
    except OSError:
        return False
    try:
        ruta.parent.rmdir()
    except OSError:
        pass
    return True


def es_archivo_interno_actividad(actividad_id: int, ruta_relativa: str | None) -> bool:
    coincidencia = PATRON_RUTA.fullmatch(ruta_relativa or "")
    return bool(
        coincidencia
        and int(coincidencia.group("actividad_id")) == actividad_id
    )
