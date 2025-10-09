from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class DevelopmentRow:
    id: str
    name: str
    general_status: Optional[str] = None
    provider: Optional[str] = None
    current_phase: Optional[str] = None
    current_stage: Optional[str] = None
    last_activity_stage: Optional[str] = None
    last_activity_type: Optional[str] = None


def map_dev_to_row(dev: dict) -> DevelopmentRow:
    if dev is None:
        return DevelopmentRow(id="N/A", name="Datos no disponibles")
    
    phase_name = None
    if isinstance(dev.get("current_phase"), dict):
        phase_name = dev["current_phase"].get("phase_name") or dev["current_phase"].get("name")
    stage_name = None
    if isinstance(dev.get("current_stage"), dict):
        stage_name = dev["current_stage"].get("stage_name") or dev["current_stage"].get("name")
    
    # Extraer información de la última actividad
    last_activity_stage = None
    last_activity_type = None
    if isinstance(dev.get("last_activity"), dict):
        last_activity = dev["last_activity"]
        last_activity_stage = last_activity.get("stage_name")
        last_activity_type = last_activity.get("activity_type")
    
    return DevelopmentRow(
        id=str(dev.get("id", "N/A")),
        name=str(dev.get("name", "N/A")),
        general_status=dev.get("general_status"),
        provider=dev.get("provider"),
        current_phase=phase_name,
        current_stage=stage_name,
        last_activity_stage=last_activity_stage,
        last_activity_type=last_activity_type,
    )


