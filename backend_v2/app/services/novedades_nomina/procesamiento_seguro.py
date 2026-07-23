"""Ejecución acotada de extractores de nómina fuera del event loop."""

import asyncio
from typing import Any, Callable

from anyio import to_process
from fastapi import HTTPException


MAX_EXTRACTORES_CONCURRENTES = 4
TIMEOUT_EXTRACTOR_SEGUNDOS = 60
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
