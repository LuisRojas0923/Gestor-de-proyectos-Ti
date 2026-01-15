"""
Modelos de chat y mensajería
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ChatSession(Base):
    __tablename__ = "sesiones_chat"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"), nullable=False)
    title = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "mensajes_chat"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sesiones_chat.id"), nullable=False)
    content = Column(Text, nullable=False)
    sender = Column(String(50), nullable=False)  # 'user', 'assistant'
    message_type = Column(String(50), default="text")  # 'text', 'file', 'image'
    message_metadata = Column(JSON)  # Información adicional
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    session = relationship("ChatSession", back_populates="messages")
