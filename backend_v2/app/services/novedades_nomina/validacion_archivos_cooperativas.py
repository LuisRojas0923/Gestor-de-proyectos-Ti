from pathlib import PurePath
from fastapi import UploadFile


MAX_ARCHIVOS = 5
MAX_BYTES_ARCHIVO = 20 * 1024 * 1024


async def _leer_archivos(
    files: list[UploadFile],
    tipos_mime: set[str],
    firmas_por_extension: dict[str, tuple[bytes, ...]],
) -> tuple[list[bytes], list[str]]:
    if not 1 <= len(files) <= MAX_ARCHIVOS:
        raise ValueError(f"Se requieren entre 1 y {MAX_ARCHIVOS} archivos")

    contenidos: list[bytes] = []
    nombres: list[str] = []
    for archivo in files:
        nombre_original = (archivo.filename or "").strip()
        nombre = PurePath(nombre_original.replace("\\", "/")).name
        extension = PurePath(nombre).suffix.lower()
        if not nombre or extension not in firmas_por_extension:
            raise ValueError("Nombre o extensión de archivo no permitidos")
        if archivo.content_type not in tipos_mime:
            raise ValueError("Tipo MIME de archivo no permitido")

        contenido = await archivo.read(MAX_BYTES_ARCHIVO + 1)
        if not contenido or len(contenido) > MAX_BYTES_ARCHIVO:
            raise ValueError("El archivo está vacío o supera 20 MB")
        if not any(
            contenido.startswith(firma)
            for firma in firmas_por_extension[extension]
        ):
            raise ValueError("La firma del archivo no corresponde a su extensión")

        contenidos.append(contenido)
        nombres.append(nombre)

    return contenidos, nombres


async def leer_archivos_grancoop(
    files: list[UploadFile],
) -> tuple[list[bytes], list[str]]:
    return await _leer_archivos(
        files,
        tipos_mime={"application/pdf", "application/octet-stream"},
        firmas_por_extension={".pdf": (b"%PDF",)},
    )


async def leer_archivos_beneficiar(files: list[UploadFile]) -> list[bytes]:
    contenidos, _ = await _leer_archivos(
        files,
        tipos_mime={
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/octet-stream",
        },
        firmas_por_extension={
            ".xls": (b"\xd0\xcf\x11\xe0",),
            ".xlsx": (b"PK\x03\x04",),
        },
    )
    return contenidos
