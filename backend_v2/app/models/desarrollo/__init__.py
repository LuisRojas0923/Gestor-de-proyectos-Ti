"""
Modelos de Desarrollo - Backend V2 (SQLModel)
"""

from .desarrollo import (
    FaseDesarrollo,
    EtapaDesarrollo,
    Desarrollo,
    FaseCrear,
    EtapaCrear,
    DesarrolloCrear,
    DesarrolloActualizar,
)
from .auxiliares import ResponsableDesarrollo, FechaDesarrollo, ObservacionDesarrollo
from .actividad import (
    Actividad,
    ActividadBase,
    ActividadCrear,
    ActividadActualizar,
    ActividadLeer,
    ActividadArbol,
)
from .plantilla_actividad import (
    PlantillaActividad,
    PlantillaActividadBase,
    PlantillaActividadCrear,
    PlantillaActividadActualizar,
    PlantillaActividadLeer,
    PlantillaActividadArbol,
    AplicarPlantillaRequest,
)

from .requerimiento import RequerimientoDesarrollo

# Para evitar problemas circulares con SQLModel y Pydantic al usar strings en Relationship
try:
    Desarrollo.model_rebuild()
    Actividad.model_rebuild()
    ActividadArbol.model_rebuild()
    PlantillaActividad.model_rebuild()
    PlantillaActividadArbol.model_rebuild()
    RequerimientoDesarrollo.model_rebuild()
except AttributeError:
    # Fallback para versiones más antiguas de Pydantic
    Desarrollo.update_forward_refs(Actividad=Actividad)
    Actividad.update_forward_refs(Desarrollo=Desarrollo)
    ActividadArbol.update_forward_refs()
    PlantillaActividad.update_forward_refs()
    PlantillaActividadArbol.update_forward_refs()

__all__ = [
    "FaseDesarrollo",
    "EtapaDesarrollo",
    "Desarrollo",
    "FaseCrear",
    "EtapaCrear",
    "DesarrolloCrear",
    "DesarrolloActualizar",
    "ResponsableDesarrollo",
    "FechaDesarrollo",
    "ObservacionDesarrollo",
    "Actividad",
    "ActividadBase",
    "ActividadCrear",
    "ActividadActualizar",
    "ActividadLeer",
    "ActividadArbol",
    "PlantillaActividad",
    "PlantillaActividadBase",
    "PlantillaActividadCrear",
    "PlantillaActividadActualizar",
    "PlantillaActividadLeer",
    "PlantillaActividadArbol",
    "AplicarPlantillaRequest",
    "RequerimientoDesarrollo",
]
