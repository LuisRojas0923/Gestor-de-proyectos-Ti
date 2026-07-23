"""Persistencia atómica y no bloqueante de archivos de nómina."""

import asyncio
import os
import shutil
import threading
from pathlib import Path
from uuid import uuid4


MAX_STORAGE_NOMINA_BYTES = 5 * 1024 * 1024 * 1024
MIN_FREE_DISK_BYTES = 512 * 1024 * 1024
MAX_STORAGE_NOMINA_FILES = 10000
_thread_lock = threading.Lock()


async def guardar_archivo_nomina(path: str, contenido: bytes) -> None:
    """Escribe mediante temporal, fsync y reemplazo atómico fuera del event loop."""
    destino = Path(path)

    def guardar() -> None:
        destino.parent.mkdir(parents=True, exist_ok=True)
        lock_path = destino.parent / ".quota.lock"
        with _thread_lock, lock_path.open("a+b") as lock_file:
            try:
                import fcntl

                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            except ImportError:
                pass

            existentes = [
                archivo
                for archivo in destino.parent.iterdir()
                if archivo.is_file()
                and archivo.name != ".quota.lock"
                and not archivo.name.endswith(".tmp")
            ]
            uso_nomina = sum(archivo.stat().st_size for archivo in existentes)
            espacio_libre = shutil.disk_usage(destino.parent).free
            if len(existentes) >= MAX_STORAGE_NOMINA_FILES:
                raise OSError("Se alcanzó la cantidad máxima de archivos de nómina")
            if uso_nomina + len(contenido) > MAX_STORAGE_NOMINA_BYTES:
                raise OSError("Se alcanzó la cuota de almacenamiento de nómina")
            if espacio_libre - len(contenido) < MIN_FREE_DISK_BYTES:
                raise OSError("No hay espacio seguro disponible para la carga")

            temporal = destino.with_name(f".{destino.name}.{uuid4().hex}.tmp")
            try:
                with temporal.open("xb") as archivo:
                    archivo.write(contenido)
                    archivo.flush()
                    os.fsync(archivo.fileno())
                os.replace(temporal, destino)
            except BaseException:
                try:
                    temporal.unlink()
                except FileNotFoundError:
                    pass
                raise

    await asyncio.to_thread(guardar)
