from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Optional, Tuple
import shutil


@dataclass
class ScanResult:
    path: str
    exists: bool


def scan_base_directories(base_dirs: List[str]) -> List[ScanResult]:
    results: List[ScanResult] = []
    for base in base_dirs:
        results.append(ScanResult(path=base, exists=os.path.exists(base)))
    return results



# =============================================================
# Lógica de procesamiento similar al macro de Excel
# =============================================================

@dataclass
class ProcessInput:
    incident_id: str
    development_name: str
    state: str
    stage: Optional[str] = None
    observations: Optional[str] = None


@dataclass
class ProcessResult:
    row_index: int
    incident_id: str
    state: str
    message: str


def find_existing_folder(base_path: str, incident_id: str) -> Optional[str]:
    """Buscar carpeta existente que contenga el incident_id (búsqueda optimizada)."""
    if not os.path.isdir(base_path):
        return None
    
    # Búsqueda optimizada: solo 3 niveles máximo (Estado/Etapa/Desarrollo)
    try:
        # Nivel 1: Estados
        for state_dir in os.scandir(base_path):
            if not state_dir.is_dir():
                continue
                
            # Nivel 2: Etapas
            for stage_dir in os.scandir(state_dir.path):
                if not stage_dir.is_dir():
                    continue
                    
                # Nivel 3: Desarrollos
                for dev_dir in os.scandir(stage_dir.path):
                    if not dev_dir.is_dir():
                        continue
                    
                    # Buscar el ID en el nombre de la carpeta (insensible a mayúsculas)
                    if incident_id.lower() in dev_dir.name.lower():
                        return dev_dir.path
                        
    except (OSError, PermissionError):
        # Si hay error de permisos, usar búsqueda recursiva como fallback
        for root, dirs, files in os.walk(base_path):
            for dir_name in dirs:
                if incident_id.lower() in dir_name.lower():
                    return os.path.join(root, dir_name)
    
    return None


def _ensure_state_folder(base_path: str, state: str) -> str:
    state_dir = os.path.join(base_path, state)
    os.makedirs(state_dir, exist_ok=True)
    return state_dir


def _create_structure(dest_dir: str) -> None:
    os.makedirs(dest_dir, exist_ok=True)
    for sub in ("Correos", "Formatos", "Documentos"):
        os.makedirs(os.path.join(dest_dir, sub), exist_ok=True)


def process_requirements(
    base_path: str,
    items: List[Tuple[int, ProcessInput]],
) -> List[ProcessResult]:
    """
    Procesa requerimientos: si existe carpeta (en cualquier subnivel) la mueve al estado;
    si no existe, crea estructura en la carpeta del estado.
    items: lista de (row_index, ProcessInput)
    """
    results: List[ProcessResult] = []
    for row_index, req in items:
        incident_id = (req.incident_id or "").strip()
        state = (req.state or "").strip()
        dev_name = (req.development_name or "").strip()

        if not incident_id or not state:
            results.append(ProcessResult(row_index, incident_id, state, "Omitida (datos incompletos)"))
            continue

        # Buscar carpeta existente
        found = find_existing_folder(base_path, incident_id)

        # Crear estructura: Estado/Etapa/Desarrollo
        state_dir = _ensure_state_folder(base_path, state)
        stage = req.stage or "Sin_etapa"
        stage_dir = os.path.join(state_dir, stage)
        os.makedirs(stage_dir, exist_ok=True)

        if found:
            # Mover carpeta encontrada a la nueva estructura
            dest = os.path.join(stage_dir, os.path.basename(found))
            try:
                shutil.move(found, dest)
                results.append(ProcessResult(row_index, incident_id, state, f"Carpeta movida a {state}/{stage}"))
            except Exception as e:
                results.append(ProcessResult(row_index, incident_id, state, f"Error moviendo carpeta: {e}"))
        else:
            # Crear nueva estructura
            folder_name = f"{incident_id}_{dev_name}" if dev_name else incident_id
            dest = os.path.join(stage_dir, folder_name)
            if not os.path.exists(dest):
                try:
                    _create_structure(dest)
                    results.append(ProcessResult(row_index, incident_id, state, f"Carpeta creada en {state}/{stage}"))
                except Exception as e:
                    results.append(ProcessResult(row_index, incident_id, state, f"Error creando carpeta: {e}"))
            else:
                results.append(ProcessResult(row_index, incident_id, state, f"Ya existía carpeta en {state}/{stage}"))

    return results

