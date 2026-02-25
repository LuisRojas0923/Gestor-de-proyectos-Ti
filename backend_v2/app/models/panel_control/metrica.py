"""
Modelo para métricas de rendimiento del sistema - Backend V2
"""

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class MetricaSistema(SQLModel, table=True):
    """Snapshot del estado del sistema en un momento dado"""

    __tablename__ = "metricas_sistema"

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.now, index=True)

    # Usuarios y Actividad
    usuarios_online: int = Field(default=0)
    usuarios_activos_24h: int = Field(default=0)

    # Carga del Servidor (0-100)
    cpu_uso_porcentaje: float = Field(default=0.0)
    ram_uso_mb: float = Field(default=0.0)
    ram_total_mb: float = Field(default=0.0)

    # Tráfico y Rendimiento
    tickets_pendientes: int = Field(default=0)
    latencia_db_ms: float = Field(default=0.0)

    # Estado General
    estado_servidor: str = Field(
        default="ok", max_length=50
    )  # 'ok', 'warning', 'critical'
