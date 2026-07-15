from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException, UploadFile, status


MAX_EXCEL_BYTES = 25 * 1024 * 1024
MAX_EXCEL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
EXTENSIONES_EXCEL = {".xls", ".xlsx", ".xlsm"}


async def leer_excel_seguro(archivo: UploadFile) -> bytes:
    extension = Path(archivo.filename or "").suffix.lower()
    if extension not in EXTENSIONES_EXCEL:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato de archivo no permitido",
        )

    contenido = await archivo.read(MAX_EXCEL_BYTES + 1)
    if len(contenido) > MAX_EXCEL_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 25 MB",
        )

    if extension == ".xls":
        if not contenido.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
            raise HTTPException(status_code=415, detail="Firma de archivo no válida")
        return contenido

    if not contenido.startswith(b"PK"):
        raise HTTPException(status_code=415, detail="Firma de archivo no válida")
    try:
        with ZipFile(BytesIO(contenido)) as comprimido:
            total = sum(entrada.file_size for entrada in comprimido.infolist())
    except BadZipFile as exc:
        raise HTTPException(status_code=415, detail="Archivo Excel inválido") from exc
    if total > MAX_EXCEL_UNCOMPRESSED_BYTES:
        raise HTTPException(status_code=413, detail="Contenido descomprimido demasiado grande")
    return contenido
