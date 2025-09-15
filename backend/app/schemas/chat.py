"""
Schemas Pydantic para chat y comunicación
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime


class ChatSessionBase(BaseModel):
    """Schema base para sesión de chat"""
    title: Optional[str] = Field(None, max_length=255, description="Título de la sesión")


class ChatSessionCreate(ChatSessionBase):
    """Schema para crear sesión de chat"""
    user_id: str = Field(..., max_length=50, description="ID del usuario")


class ChatSession(ChatSessionBase):
    """Schema completo para sesión de chat"""
    id: int
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    """Schema base para mensaje de chat"""
    content: str = Field(..., description="Contenido del mensaje")
    sender: str = Field(..., max_length=50, description="Remitente del mensaje")
    message_type: str = Field("text", max_length=50, description="Tipo de mensaje")
    message_metadata: Optional[Dict[str, Any]] = Field(None, description="Metadatos del mensaje")

    @validator('sender')
    def validate_sender(cls, v):
        allowed_senders = ['user', 'assistant', 'system']
        if v not in allowed_senders:
            raise ValueError(f'sender debe ser uno de: {allowed_senders}')
        return v

    @validator('message_type')
    def validate_message_type(cls, v):
        allowed_types = ['text', 'file', 'image', 'code', 'analysis', 'recommendation']
        if v not in allowed_types:
            raise ValueError(f'message_type debe ser uno de: {allowed_types}')
        return v


class ChatMessageCreate(ChatMessageBase):
    """Schema para crear mensaje de chat"""
    session_id: int = Field(..., description="ID de la sesión")


class ChatMessage(ChatMessageBase):
    """Schema completo para mensaje de chat"""
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionWithMessages(ChatSession):
    """Schema de sesión con mensajes incluidos"""
    messages: list[ChatMessage] = []


class ChatResponse(BaseModel):
    """Schema para respuesta de chat"""
    message: str
    message_type: str = "text"
    metadata: Optional[Dict[str, Any]] = None
    suggestions: Optional[list[str]] = None
    context_used: Optional[bool] = None
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None
