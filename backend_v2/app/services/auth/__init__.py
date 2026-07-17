"""
Servicios de Autenticacin - Backend V2
"""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .servicio import ServicioAuth

__all__ = ["ServicioAuth"]


def __getattr__(name: str):
    if name == "ServicioAuth":
        from .servicio import ServicioAuth

        return ServicioAuth
    raise AttributeError(name)
