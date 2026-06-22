#!/usr/bin/env python3
"""
Pre-commit: exige que cada módulo RBAC tenga cobertura de auditoría declarada.

Al agregar un id en rbac_manifest.py, registre el módulo en:
  backend_v2/app/core/auditoria_manifest.py

Uso: python scripts/audit_coverage_check.py
"""
from __future__ import annotations

import ast
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RBAC_PATH = os.path.join(ROOT, "backend_v2", "app", "core", "rbac_manifest.py")
AUDIT_MANIFEST_PATH = os.path.join(
    ROOT, "backend_v2", "app", "core", "auditoria_manifest.py"
)
SNAPSHOTS_MARKERS = (
    "asignar_evento_segura",
    "asignar_creacion_segura",
    "asignar_actualizacion_segura",
    "asignar_eliminacion_segura",
    "asignar_descarga_segura",
)


def _extraer_ids_rbac(path: str) -> set[str]:
    with open(path, encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=path)

    for node in tree.body:
        if isinstance(node, ast.AnnAssign):
            if isinstance(node.target, ast.Name) and node.target.id == "SYSTEM_MODULES_REGISTRY":
                return _ids_desde_lista(node.value)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "SYSTEM_MODULES_REGISTRY":
                    return _ids_desde_lista(node.value)
    raise RuntimeError(f"No se encontró SYSTEM_MODULES_REGISTRY en {path}")


def _ids_desde_lista(node: ast.AST) -> set[str]:
    ids: set[str] = set()
    if not isinstance(node, (ast.List, ast.Tuple)):
        return ids
    for elt in node.elts:
        if not isinstance(elt, ast.Dict):
            continue
        for key, val in zip(elt.keys, elt.values):
            if (
                isinstance(key, ast.Constant)
                and key.value == "id"
                and isinstance(val, ast.Constant)
                and isinstance(val.value, str)
            ):
                ids.add(val.value)
    return ids


def _cargar_manifiesto_auditoria():
    sys.path.insert(0, os.path.join(ROOT, "backend_v2"))
    from app.core.auditoria_manifest import (  # noqa: WPS433
        AUDITORIA_COBERTURA,
        MODULOS_EXENTOS_AUDITORIA,
    )
    from app.core.middleware.auditoria_rutas import (  # noqa: WPS433
        es_ruta_descarga_auditable,
    )

    return AUDITORIA_COBERTURA, MODULOS_EXENTOS_AUDITORIA, es_ruta_descarga_auditable


def _archivo_tiene_hints_auditoria(ruta_relativa: str) -> bool:
    path = os.path.join(ROOT, ruta_relativa.replace("/", os.sep))
    if not os.path.isfile(path):
        return False
    with open(path, encoding="utf-8", errors="ignore") as f:
        contenido = f.read()
    return any(marker in contenido for marker in SNAPSHOTS_MARKERS)


def _validar_archivos_explicitos(modulo_id: str, archivos: list[str]) -> list[str]:
    errores: list[str] = []
    for archivo in archivos:
        path = os.path.join(ROOT, archivo.replace("/", os.sep))
        if not os.path.isfile(path):
            errores.append(f"  - {modulo_id}: archivo inexistente {archivo}")
            continue
        if not _archivo_tiene_hints_auditoria(archivo):
            errores.append(
                f"  - {modulo_id}: {archivo} sin hints de auditoría "
                f"({', '.join(SNAPSHOTS_MARKERS[:2])}…)"
            )
    return errores


def _validar_rutas_descarga(
    modulo_id: str,
    rutas_descarga: list[str],
    es_ruta_descarga_auditable,
) -> list[str]:
    errores: list[str] = []
    for ruta in rutas_descarga:
        if not es_ruta_descarga_auditable(ruta):
            errores.append(
                f"  - {modulo_id}: ruta '{ruta}' no registrada en auditoria_rutas.py"
            )
    return errores


def _validar_explicito(
    modulo_id: str,
    meta: dict,
    cobertura: dict,
    es_ruta_descarga_auditable,
) -> list[str]:
    archivos = meta.get("archivos") or []
    rutas_descarga = meta.get("rutas_descarga") or []
    hereda_de = meta.get("hereda_de")

    if hereda_de:
        if hereda_de not in cobertura:
            return [f"  - {modulo_id}: hereda_de '{hereda_de}' no existe en manifiesto"]
        padre = cobertura[hereda_de]
        archivos = archivos or padre.get("archivos") or []
        rutas_descarga = rutas_descarga or padre.get("rutas_descarga") or []

    if not archivos and not rutas_descarga:
        return [
            f"  - {modulo_id}: tipo 'explicito' requiere 'archivos', "
            f"'rutas_descarga' o 'hereda_de' con cobertura válida"
        ]

    errores: list[str] = []
    if archivos:
        errores.extend(_validar_archivos_explicitos(modulo_id, archivos))
    if rutas_descarga:
        errores.extend(
            _validar_rutas_descarga(modulo_id, rutas_descarga, es_ruta_descarga_auditable)
        )
    return errores


def main() -> int:
    if not os.path.isfile(RBAC_PATH):
        print(f"ERROR: no existe {RBAC_PATH}")
        return 1
    if not os.path.isfile(AUDIT_MANIFEST_PATH):
        print(f"ERROR: no existe {AUDIT_MANIFEST_PATH}")
        return 1

    rbac_ids = _extraer_ids_rbac(RBAC_PATH)
    cobertura, exentos, es_ruta_descarga = _cargar_manifiesto_auditoria()
    declarados = set(cobertura) | set(exentos)

    errores: list[str] = []

    faltantes = sorted(rbac_ids - declarados)
    if faltantes:
        errores.append(
            "Módulos RBAC sin cobertura de auditoría en auditoria_manifest.py:\n"
            + "\n".join(f"  - {m}" for m in faltantes)
        )

    huerfanos = sorted(declarados - rbac_ids)
    if huerfanos:
        errores.append(
            "Entradas en auditoria_manifest sin módulo RBAC (elimine o corrija id):\n"
            + "\n".join(f"  - {m}" for m in huerfanos)
        )

    for modulo_id, meta in cobertura.items():
        if modulo_id not in rbac_ids:
            continue
        tipo = meta.get("tipo")
        if tipo not in ("middleware", "explicito", "parcial", "exento"):
            errores.append(f"  - {modulo_id}: tipo de cobertura inválido '{tipo}'")
        if tipo == "explicito":
            errores.extend(
                _validar_explicito(modulo_id, meta, cobertura, es_ruta_descarga)
            )

    if errores:
        print("AUDITORÍA — validación de cobertura falló:\n")
        print("\n\n".join(errores))
        print(
            "\nAcción: registre el módulo en "
            "backend_v2/app/core/auditoria_manifest.py "
            "(AUDITORIA_COBERTURA o MODULOS_EXENTOS_AUDITORIA)."
        )
        return 1

    print(
        f"Audit coverage OK: {len(rbac_ids)} módulos RBAC "
        f"({len(cobertura)} cubiertos, {len(exentos)} exentos)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
