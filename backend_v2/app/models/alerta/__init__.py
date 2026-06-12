"""
Modelos de Alertas - Backend V2 (SQLModel)
"""
from .actividad import (
    ActividadProxima,
    RegistroActividad,
    ActividadProximaCrear,
    RegistroActividadCrear
)
from .notificacion import (
    NotificacionUsuario,
    NotificacionUsuarioCrear,
    NotificacionUsuarioActualizar
)

__all__ = [
    "ActividadProxima",
    "RegistroActividad",
    "ActividadProximaCrear",
    "RegistroActividadCrear",
    "NotificacionUsuario",
    "NotificacionUsuarioCrear",
    "NotificacionUsuarioActualizar"
]
