# Módulo RRHH — Requisición de Personal
from .solicitud_personal import RequisicionPersonal, EstadoRP
from .catalogos import AreaRP, CargoRP, CiudadRP, AprobadorAreaRP
from .historial import (
    HistorialRequisicion,
    ComentarioRequisicion,
    RequisicionEquipoOficina,
    RequisicionEquipoTecnologico,
)

__all__ = [
    "RequisicionPersonal",
    "EstadoRP",
    "AreaRP",
    "CargoRP",
    "CiudadRP",
    "AprobadorAreaRP",
    "HistorialRequisicion",
    "ComentarioRequisicion",
    "RequisicionEquipoOficina",
    "RequisicionEquipoTecnologico",
]
