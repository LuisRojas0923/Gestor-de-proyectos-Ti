"""Validación común y lectura acotada de archivos de nómina."""

import io
import zipfile
from pathlib import PurePath, PurePosixPath

from fastapi import HTTPException, UploadFile


MAX_ARCHIVOS = 5
MAX_BYTES_ARCHIVO = 20 * 1024 * 1024
MAX_BYTES_TOTAL = 50 * 1024 * 1024
MAX_ZIP_ENTRIES = 1000
MAX_ZIP_MEMBER_BYTES = 25 * 1024 * 1024
MAX_ZIP_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
MAX_COMPRESSION_RATIO = 100

MIME_POR_EXTENSION = {
    ".csv": {"text/csv", "application/csv", "application/octet-stream", ""},
    ".pdf": {"application/pdf", "application/octet-stream", ""},
    ".xls": {"application/vnd.ms-excel", "application/octet-stream", ""},
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
        "application/zip",
        "",
    },
    ".xlsm": {
        "application/vnd.ms-excel.sheet.macroenabled.12",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
        "application/zip",
        "",
    },
}


class ArchivoNominaInvalido(ValueError):
    """El archivo no cumple los controles de carga de nómina."""


def status_archivo_invalido(exc: ArchivoNominaInvalido) -> int:
    return 413 if "supera" in str(exc).lower() else 415


def _validar_zip_excel(contenido: bytes) -> int:
    try:
        with zipfile.ZipFile(io.BytesIO(contenido)) as archive:
            entries = archive.infolist()
            names = {entry.filename for entry in entries}
            if len(entries) > MAX_ZIP_ENTRIES:
                raise ArchivoNominaInvalido("El Excel contiene demasiadas entradas")
            if "[Content_Types].xml" not in names or "xl/workbook.xml" not in names:
                raise ArchivoNominaInvalido("La firma no corresponde a un libro Excel")

            total = 0
            for entry in entries:
                path = PurePosixPath(entry.filename)
                if path.is_absolute() or ".." in path.parts or "\\" in entry.filename:
                    raise ArchivoNominaInvalido("El Excel contiene rutas internas inválidas")
                if entry.flag_bits & 0x1:
                    raise ArchivoNominaInvalido("No se permiten archivos Excel cifrados")
                if entry.file_size > MAX_ZIP_MEMBER_BYTES:
                    raise ArchivoNominaInvalido("Una entrada del Excel supera el límite")
                total += entry.file_size
                if total > MAX_ZIP_UNCOMPRESSED_BYTES:
                    raise ArchivoNominaInvalido("El Excel descomprimido supera el límite")
                if entry.file_size / max(entry.compress_size, 1) > MAX_COMPRESSION_RATIO:
                    raise ArchivoNominaInvalido("La compresión del Excel no es segura")
            return total
    except ArchivoNominaInvalido:
        raise
    except (OSError, RuntimeError, zipfile.BadZipFile, zipfile.LargeZipFile) as exc:
        raise ArchivoNominaInvalido("El archivo Excel está corrupto") from exc


def validar_contenido_nomina(contenido: bytes, extension: str) -> int:
    """Valida firma/estructura y devuelve el tamaño expandido estimado."""
    if extension in {".xlsx", ".xlsm"}:
        if not contenido.startswith(b"PK\x03\x04"):
            raise ArchivoNominaInvalido("La firma no coincide con la extensión")
        return _validar_zip_excel(contenido)
    elif extension == ".xls" and not contenido.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        raise ArchivoNominaInvalido("La firma no coincide con la extensión")
    elif extension == ".pdf" and not contenido.startswith(b"%PDF"):
        raise ArchivoNominaInvalido("La firma no coincide con la extensión")
    elif extension == ".csv":
        if b"\x00" in contenido:
            raise ArchivoNominaInvalido("El CSV contiene datos binarios no permitidos")
        try:
            contenido.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ArchivoNominaInvalido("El CSV no usa una codificación permitida") from exc
    return len(contenido)


async def leer_archivos_nomina(
    files: list[UploadFile],
    extensiones_permitidas: set[str] | None = None,
) -> tuple[list[bytes], list[str], list[str]]:
    """Lee como máximo cinco archivos y valida nombre, MIME, tamaño y firma."""
    permitidas = extensiones_permitidas or set(MIME_POR_EXTENSION)
    if not 1 <= len(files) <= MAX_ARCHIVOS:
        raise ArchivoNominaInvalido(f"Se requieren entre 1 y {MAX_ARCHIVOS} archivos")

    contenidos: list[bytes] = []
    nombres: list[str] = []
    extensiones: list[str] = []
    total = 0
    total_expandido = 0
    for archivo in files:
        nombre = PurePath((archivo.filename or "").replace("\\", "/")).name
        extension = PurePath(nombre).suffix.lower()
        if not nombre or extension not in permitidas or extension not in MIME_POR_EXTENSION:
            raise ArchivoNominaInvalido("Nombre o extensión de archivo no permitidos")
        mime = (archivo.content_type or "").lower()
        if mime not in MIME_POR_EXTENSION[extension]:
            raise ArchivoNominaInvalido("El MIME no coincide con la extensión")

        contenido = await archivo.read(MAX_BYTES_ARCHIVO + 1)
        if not contenido:
            raise ArchivoNominaInvalido("El archivo está vacío")
        if len(contenido) > MAX_BYTES_ARCHIVO:
            raise ArchivoNominaInvalido("El archivo supera el tamaño permitido")
        total += len(contenido)
        if total > MAX_BYTES_TOTAL:
            raise ArchivoNominaInvalido("La carga supera el tamaño total permitido")
        total_expandido += validar_contenido_nomina(contenido, extension)
        if total_expandido > MAX_ZIP_UNCOMPRESSED_BYTES:
            raise ArchivoNominaInvalido("La carga expandida supera el límite permitido")
        contenidos.append(contenido)
        nombres.append(nombre)
        extensiones.append(extension.removeprefix("."))

    return contenidos, nombres, extensiones


async def leer_archivos_nomina_http(
    files: list[UploadFile],
    extensiones_permitidas: set[str] | None = None,
) -> tuple[list[bytes], list[str], list[str]]:
    """Adapta errores del validador al contrato HTTP de los routers."""
    try:
        return await leer_archivos_nomina(files, extensiones_permitidas)
    except ArchivoNominaInvalido as exc:
        raise HTTPException(
            status_code=status_archivo_invalido(exc), detail=str(exc)
        ) from exc
