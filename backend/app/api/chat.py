"""
Endpoints de API para chat y comunicación
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas
from ..database import get_db
from ..services.ai_service import AIService
import logging
from datetime import datetime
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize AI Service
ai_service = AIService()

# Mock storage for chat sessions (in production, use database)
mock_sessions = {}
mock_messages = {}

@router.get("/sesiones")
def get_chat_sessions(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Sesiones de chat del usuario"""
    try:
        # Mock implementation - return user's sessions
        user_sessions = [session for session in mock_sessions.values() if session.get("user_id") == user_id]
        
        return {
            "sessions": user_sessions,
            "total": len(user_sessions),
            "mock_mode": True
        }
        
    except Exception as e:
        logging.error(f"Error getting chat sessions for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sesiones")
def create_chat_session(
    session_data: dict,
    db: Session = Depends(get_db)
):
    """Crear nueva sesión de chat"""
    try:
        session_id = str(uuid.uuid4())
        user_id = session_data.get("user_id", "anonymous")
        
        new_session = {
            "id": session_id,
            "user_id": user_id,
            "title": session_data.get("title", "Nueva conversación"),
            "created_at": datetime.now().isoformat(),
            "last_message_at": datetime.now().isoformat(),
            "message_count": 0
        }
        
        mock_sessions[session_id] = new_session
        mock_messages[session_id] = []
        
        return {
            "session": new_session,
            "mock_mode": True
        }
        
    except Exception as e:
        logging.error(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sesiones/{session_id}/mensajes")
def get_session_messages(
    session_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Mensajes de una sesión"""
    try:
        if session_id not in mock_messages:
            raise HTTPException(status_code=404, detail="Session not found")
        
        messages = mock_messages[session_id]
        paginated_messages = messages[skip:skip + limit]
        
        return {
            "messages": paginated_messages,
            "total": len(messages),
            "session_id": session_id,
            "mock_mode": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting messages for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sesiones/{session_id}/mensajes")
async def send_message(
    session_id: str,
    message_data: dict,
    db: Session = Depends(get_db)
):
    """Enviar mensaje en sesión"""
    try:
        if session_id not in mock_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        user_message = message_data.get("message", "")
        development_id = message_data.get("development_id")
        
        # Create user message
        user_msg = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now().isoformat(),
            "development_id": development_id
        }
        
        # Add user message to session
        if session_id not in mock_messages:
            mock_messages[session_id] = []
        mock_messages[session_id].append(user_msg)
        
        # Get AI response
        context = {
            "message": user_message,
            "development_id": development_id,
            "conversation_id": session_id
        }
        
        ai_result = await ai_service.contextual_chat(user_message, context)
        
        # Create AI response message
        ai_response = ai_result.get("response", "Lo siento, no pude procesar tu mensaje.")
        ai_msg = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.now().isoformat(),
            "context_used": ai_result.get("context_used", []),
            "mock_mode": ai_result.get("mock_mode", False)
        }
        
        # Add AI message to session
        mock_messages[session_id].append(ai_msg)
        
        # Update session
        mock_sessions[session_id]["last_message_at"] = datetime.now().isoformat()
        mock_sessions[session_id]["message_count"] = len(mock_messages[session_id])
        
        return {
            "user_message": user_msg,
            "ai_response": ai_msg,
            "session_id": session_id,
            "mock_mode": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending message to session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sesiones/{session_id}")
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Eliminar sesión de chat"""
    try:
        if session_id not in mock_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Remove session and messages
        del mock_sessions[session_id]
        if session_id in mock_messages:
            del mock_messages[session_id]
        
        return {
            "message": "Session deleted successfully",
            "session_id": session_id,
            "mock_mode": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def chat_health():
    """Health check for chat service"""
    return {
        "status": "healthy",
        "service": "chat",
        "ai_service_mode": "MOCK" if ai_service.mock_mode else "LIVE",
        "active_sessions": len(mock_sessions),
        "total_messages": sum(len(msgs) for msgs in mock_messages.values())
    }
