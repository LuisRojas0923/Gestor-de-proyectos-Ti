"""Persistencia transaccional de lotes de archivos de cooperativas."""

import hashlib
from pathlib import Path, PurePath

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.novedades_nomina.nomina import (
    NominaArchivo,
    NominaRegistroNormalizado,
)


STORAGE_DIR = Path(__file__).resolve().parents[3] / "uploads" / "nomina"


def _guardar_archivos(
    contenidos: list[bytes],
    nombres: list[str],
) -> list[dict[str, str | int]]:
    if not contenidos or len(contenidos) != len(nombres):
        raise ValueError("El lote de archivos es inválido")

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    archivos = []
    for contenido, nombre in zip(contenidos, nombres, strict=True):
        extension = PurePath(nombre).suffix.lower()
        hash_archivo = hashlib.sha256(contenido).hexdigest()
        ruta = STORAGE_DIR / f"{hash_archivo}{extension}"
        ruta.write_bytes(contenido)
        archivos.append(
            {
                "nombre_original": nombre,
                "hash": hash_archivo,
                "tamaño_bytes": len(contenido),
                "tipo_archivo": extension.lstrip("."),
                "ruta": str(ruta),
            }
        )
    return archivos


async def guardar_archivos_cooperativa(
    contenidos: list[bytes],
    nombres: list[str],
) -> list[dict[str, str | int]]:
    return await run_in_threadpool(_guardar_archivos, contenidos, nombres)


async def registrar_archivos_cooperativa(
    session: AsyncSession,
    archivos: list[dict[str, str | int]],
    mes: int,
    anio: int,
    subcategoria: str,
) -> NominaArchivo:
    registrados = []
    for datos in archivos:
        archivo = NominaArchivo(
            nombre_archivo=str(datos["nombre_original"]),
            hash_archivo=str(datos["hash"]),
            tamaño_bytes=int(datos["tamaño_bytes"]),
            tipo_archivo=str(datos["tipo_archivo"]),
            ruta_almacenamiento=str(datos["ruta"]),
            mes_fact=mes,
            año_fact=anio,
            categoria="COOPERATIVAS",
            subcategoria=subcategoria,
            estado="Procesado",
        )
        session.add(archivo)
        await session.flush()
        registrados.append(archivo)
    if not registrados:
        raise ValueError("El lote de archivos es obligatorio")
    return registrados[0]


async def preparar_reemplazo_cooperativa(
    session: AsyncSession,
    subcategoria: str,
    mes: int,
    anio: int,
) -> None:
    subcategoria_normalizada = subcategoria.strip().upper()
    if not subcategoria_normalizada:
        raise ValueError("La subcategoría es obligatoria")

    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:clave))"),
        {"clave": f"nomina-cooperativa:{subcategoria_normalizada}:{anio}:{mes}"},
    )
    await session.execute(
        delete(NominaRegistroNormalizado).where(
            NominaRegistroNormalizado.subcategoria_final
            == subcategoria_normalizada,
            NominaRegistroNormalizado.mes_fact == mes,
            NominaRegistroNormalizado.año_fact == anio,
        )
    )
