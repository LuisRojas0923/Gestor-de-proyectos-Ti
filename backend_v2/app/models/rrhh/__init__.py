# Módulo RRHH — Requisición de Personal
from .solicitud_personal import RequisicionPersonal, EstadoRP
from .catalogos import AreaRP, CargoRP, CiudadRP, AprobadorAreaRP
from .historial import (
    HistorialRequisicion,
    ComentarioRequisicion,
    RequisicionEquipoOficina,
    RequisicionEquipoTecnologico,
)
from .seguimiento import EmpresaTemporal, RequisicionTemporal, CandidatoRequisicion

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
    "EmpresaTemporal",
    "RequisicionTemporal",
    "CandidatoRequisicion",
]
