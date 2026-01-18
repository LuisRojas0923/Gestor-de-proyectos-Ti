"""
Schemas de Desarrollo - Backend V2
"""
from .desarrollo import DesarrolloBase, DesarrolloCrear, DesarrolloActualizar, Desarrollo
from .auxiliares import ResponsableBase, Responsable, FechaBase, Fecha, ObservacionBase, Observacion

__all__ = [
    "DesarrolloBase", "DesarrolloCrear", "DesarrolloActualizar", "Desarrollo",
    "ResponsableBase", "Responsable", "FechaBase", "Fecha", "ObservacionBase", "Observacion"
]
