"""
Modelo de AuditoriaEvento - Tabla para registrar eventos de auditoría.

Usado para trazabilidad de intentos de verificación admin
(/api/v2/config/verify-admin) y otros eventos sensibles.

IMPORTANTE: Esta tabla NO tiene FK a usuarios.id porque el log debe
sobrevivir al borrado del usuario (trazabilidad legal a largo plazo).
Si un futuro dev quiere añadir la FK, debe entender que rompe
la retención de auditoría.
"""
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    Text,
    Index,
)
from sqlalchemy.sql import func
from app.database import Base


class AuditoriaEvento(Base):
    """Registro de eventos de auditoría del sistema."""
    __tablename__ = "auditoria_eventos"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    usuario_id = Column(String(50), nullable=False, index=True)
    rol = Column(String(50), nullable=False)
    direccion_ip = Column(String(45), nullable=True)
    agente_usuario = Column(Text, nullable=True)
    resultado = Column(String(30), nullable=False)
    motivo = Column(Text, nullable=True)
    endpoint = Column(String(100), nullable=False, default="/api/v2/config/verify-admin")

    __table_args__ = (
        Index("idx_auditoria_usuario_ts", "usuario_id", "timestamp"),
        Index("idx_auditoria_resultado", "resultado"),
    )
