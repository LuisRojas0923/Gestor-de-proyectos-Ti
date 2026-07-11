"""DTO minimizado para supervision administrativa GeoFace."""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AsistenciaAdminRead(SQLModel):
    id: int
    usuario_id: str
    empleado_cedula: str
    empleado_nombre: str
    zona_id: Optional[int] = None
    zona_nombre: Optional[str] = None
    resultado: bool
    creado_en: Optional[datetime] = None


class AsistenciasAdminList(SQLModel):
    items: list[AsistenciaAdminRead]
    total: int
    limit: int
    offset: int


class CapacidadesBiometriaRead(SQLModel):
    puede_supervisar_equipo: bool
