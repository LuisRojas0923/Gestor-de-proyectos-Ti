"""Lectura fail-closed de la capacidad usada por operaciones RBAC privilegiadas."""
import os
from pathlib import Path


def obtener_capacidad_rbac() -> str:
    path_value = os.getenv("RBAC_ADMIN_CAPABILITY_FILE", "").strip()
    path = Path(path_value)
    if not path_value or not path.is_file() or path.stat().st_size > 4096:
        raise RuntimeError("La capacidad RBAC configurada no es válida")
    capacidad = path.read_text(encoding="utf-8").strip()
    if len(capacidad) < 32:
        raise RuntimeError("La capacidad RBAC configurada no es válida")
    return capacidad
