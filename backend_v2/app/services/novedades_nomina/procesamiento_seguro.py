"""Ejecución acotada de extractores de nómina fuera del event loop."""

import asyncio
from pathlib import Path
from typing import Any, Callable

from anyio import to_process
from fastapi import HTTPException


MAX_EXTRACTORES_CONCURRENTES = 4
TIMEOUT_EXTRACTOR_SEGUNDOS = 60
MAX_BYTES_REPROCESO = 20 * 1024 * 1024
_semaforo = asyncio.Semaphore(MAX_EXTRACTORES_CONCURRENTES)


def sanear_warnings_nomina(warnings: list[Any]) -> list[str]:
    seguras = []
    for warning in warnings or []:
        texto = str(warning).strip()
        sensible = any(
            token in texto.lower()
            for token in (
                "error", "exception", "traceback", "postgres", "select ",
                "sql ", "\\", "/",
            )
        )
        seguras.append(
            "Un archivo no pudo procesarse completamente."
            if sensible
            else texto[:300]
        )
    return list(dict.fromkeys(seguras))


def _sanear_resultado(resultado: Any) -> Any:
    if isinstance(resultado, tuple) and len(resultado) == 3:
        rows, summary, warnings = resultado
        return rows, summary, sanear_warnings_nomina(warnings)
    return resultado


def _extraer_archivo_generico(
    ruta: str, tipo_archivo: str, max_bytes: int
) -> list[dict[str, Any]]:
    """Lee de forma acotada y extrae dentro del proceso trabajador."""
    from .extractor import NominaExtractor

    path = Path(ruta)
    if path.stat().st_size > max_bytes:
        raise ValueError("El archivo supera el tamaño permitido")
    with path.open("rb") as archivo:
        contenido = archivo.read(max_bytes + 1)
    if not contenido or len(contenido) > max_bytes:
        raise ValueError("El archivo no tiene un tamaño permitido")
    return NominaExtractor.extract_from_binary(contenido, tipo_archivo)


async def ejecutar_extractor_proceso(
    extractor: Callable[[list[bytes]], Any], archivos: list[bytes]
) -> Any:
    """Ejecuta un extractor importable en un proceso cancelable y con timeout."""
    async with _semaforo:
        try:
            resultado = await asyncio.wait_for(
                to_process.run_sync(extractor, archivos, cancellable=True),
                timeout=TIMEOUT_EXTRACTOR_SEGUNDOS,
            )
            return _sanear_resultado(resultado)
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=422,
                detail="El procesamiento superó el tiempo permitido.",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail="El archivo no cumple la estructura requerida.",
            ) from exc


async def ejecutar_extractor_seguro(
    extractor: Callable[[list[bytes]], Any], archivos: list[bytes]
) -> Any:
    """Usa proceso en producción; callbacks locales de prueba usan un hilo directo."""
    qualname = getattr(extractor, "__qualname__", "")
    if "<locals>" not in qualname and getattr(extractor, "__name__", "") != "<lambda>":
        return await ejecutar_extractor_proceso(extractor, archivos)
    return _sanear_resultado(await asyncio.to_thread(extractor, archivos))


async def ejecutar_extractor_generico_seguro(
    ruta: str, tipo_archivo: str
) -> list[dict[str, Any]]:
    """Acota concurrencia, lectura y extracción genérica en un proceso cancelable."""
    async with _semaforo:
        try:
            return await asyncio.wait_for(
                to_process.run_sync(
                    _extraer_archivo_generico,
                    ruta,
                    tipo_archivo,
                    MAX_BYTES_REPROCESO,
                    cancellable=True,
                ),
                timeout=TIMEOUT_EXTRACTOR_SEGUNDOS,
            )
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=422,
                detail="El procesamiento superó el tiempo permitido.",
            ) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail="El archivo no se puede leer o no cumple la estructura requerida.",
            ) from exc
