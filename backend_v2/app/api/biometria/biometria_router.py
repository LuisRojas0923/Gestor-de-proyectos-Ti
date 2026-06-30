import asyncio
import base64
import numpy as np
import cv2
import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from deepface import DeepFace

from app.database import obtener_db
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario
from app.models.biometria.biometria_models import EmbeddingFacial, RegistroAsistencia

logger = logging.getLogger(__name__)
router = APIRouter()

MODEL_NAME = os.getenv('DEEPFACE_MODEL', 'Facenet')
DETECTOR_BACKEND = os.getenv('DEEPFACE_DETECTOR', 'opencv')
THRESHOLD = float(os.getenv('MATCH_THRESHOLD', '0.40'))
ANTI_SPOOFING = os.getenv('ANTI_SPOOFING', '1').lower() in ('1', 'true', 'yes')

def preload_models():
    """Precarga el modelo y detector de DeepFace en memoria para evitar demoras en la primera peticion."""
    logger.info(f"Pre-cargando modelos de DeepFace: {MODEL_NAME} con detector {DETECTOR_BACKEND}...")
    try:
        DeepFace.build_model(MODEL_NAME)
        # Hacemos una representacion simulada para calentar el detector
        dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
        DeepFace.represent(img_path=dummy_img, model_name=MODEL_NAME, detector_backend=DETECTOR_BACKEND, enforce_detection=False)
        logger.info("Modelos de DeepFace pre-cargados exitosamente en memoria.")
    except Exception as e:
        logger.error(f"Error durante la precarga de modelos DeepFace: {e}")


def load_image_from_bytes(file_bytes: bytes):
    try:
        arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("La imagen está corrupta o vacía")
        return img
    except Exception as e:
        raise ValueError(f"Error decodificando imagen: {str(e)}")

def l2_normalize(embedding: list):
    emb = np.array(embedding, dtype=np.float64)
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm
    return emb.tolist()

@router.post("/enrolar", summary="Enrolar rostro del empleado")
async def enrolar_rostro(
    image: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db)
):
    try:
        file_bytes = await image.read()
        img = load_image_from_bytes(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    try:
        embedding_objs = await asyncio.to_thread(
            DeepFace.represent,
            img_path=img,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
        )
    except ValueError as e:
        msg = str(e)
        if "Spoof detected" in msg:
            raise HTTPException(status_code=403, detail="Anti-spoofing: No se detectó una persona real.")
        raise HTTPException(status_code=422, detail="No se detectó un rostro en la imagen.")
    except Exception as e:
        logger.exception("Error procesando la imagen en enrolar_rostro")
        raise HTTPException(status_code=500, detail=f"Error procesando la imagen: {str(e)}")
        
    embedding_norm = l2_normalize(embedding_objs[0]['embedding'])
    
    # Verificar si el usuario ya tenia un perfil enrolado
    try:
        stmt = select(EmbeddingFacial).where(EmbeddingFacial.usuario_id == usuario_actual.id)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Error consultando perfil facial existente: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al consultar el perfil facial en la base de datos."
        )
    
    try:
        if existing:
            existing.embedding = embedding_norm
            existing.activo = True
        else:
            nuevo_rostro = EmbeddingFacial(
                usuario_id=usuario_actual.id,
                embedding=embedding_norm,
                activo=True
            )
            db.add(nuevo_rostro)
            
        # Guardar la foto fisica en el servidor
        storage_dir = "storage/perfiles"
        os.makedirs(storage_dir, exist_ok=True)
        filename = f"{usuario_actual.id}.jpg"
        file_path = os.path.join(storage_dir, filename)
        # cv2 usa BGR por defecto, por lo que imwrite lo guarda correctamente
        cv2.imwrite(file_path, img)
        
        # Actualizar el avatar del usuario en la base de datos
        usuario_actual.url_avatar = f"/api/v2/biometria/foto/{filename}"
        db.add(usuario_actual)
            
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error guardando perfil facial: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al guardar el perfil facial en la base de datos."
        )
        
    return {"status": "success", "message": "Rostro enrolado correctamente"}

@router.post("/asistencia", summary="Validar biometria y registrar asistencia")
async def marcar_asistencia(
    image: UploadFile = File(...),
    latitud: float = Form(...),
    longitud: float = Form(...),
    zona_id: Optional[int] = Form(None),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db)
):
    # Buscar su vector matemático
    try:
        stmt = select(EmbeddingFacial).where(
            EmbeddingFacial.usuario_id == usuario_actual.id, 
            EmbeddingFacial.activo == True
        )
        result = await db.execute(stmt)
        perfil = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Error buscando embedding facial: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de base de datos al buscar el perfil facial."
        )
    
    if not perfil:
        raise HTTPException(status_code=404, detail="El usuario no tiene un rostro enrolado.")
        
    try:
        file_bytes = await image.read()
        img = load_image_from_bytes(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    try:
        embedding_objs = await asyncio.to_thread(
            DeepFace.represent,
            img_path=img,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
        )
    except ValueError as e:
        msg = str(e)
        if "Spoof detected" in msg:
            raise HTTPException(status_code=403, detail="Anti-spoofing: No se detectó una persona real.")
        raise HTTPException(status_code=422, detail="No se detectó un rostro claro en la imagen.")
    except Exception as e:
        logger.exception("Error en validacion biometrica en marcar_asistencia")
        raise HTTPException(status_code=500, detail=f"Error en validación biométrica: {str(e)}")
        
    verification_emb = np.array(l2_normalize(embedding_objs[0]['embedding']), dtype=np.float64)
    stored_emb = np.array(perfil.embedding, dtype=np.float64)
    
    # O(1) Vectorizado contra el mismo usuario
    dot = np.dot(verification_emb, stored_emb)
    norm_v = np.linalg.norm(verification_emb)
    norm_s = np.linalg.norm(stored_emb)
    
    distance = 1.0 if (norm_v == 0 or norm_s == 0) else 1.0 - (dot / (norm_v * norm_s))
    confidence = round(max(0.0, min(100.0, (1.0 - distance) * 100.0)), 2)
    match_exitoso = bool(distance <= THRESHOLD)
    
    # Registrar log en base de datos
    try:
        # Guardar la evidencia física en el servidor
        import time
        storage_dir = "storage/asistencias"
        os.makedirs(storage_dir, exist_ok=True)
        filename = f"{usuario_actual.id}_{int(time.time())}.jpg"
        file_path = os.path.join(storage_dir, filename)
        cv2.imwrite(file_path, img)
        evidencia_url = f"/api/v2/biometria/evidencia/{filename}"

        safe_zona_id = None
        if zona_id is not None:
            # Validar que zona_id no sea un timestamp gigante generado localmente por el frontend
            # MAX_INT para PostgreSQL (INT4) es 2147483647
            if zona_id <= 2147483647:
                # Opcional: verificar si existe la zona en DB para evitar error de FK
                # Si estamos usando las zonas de la app y no de la DB, simplemente la ignoramos o la validamos
                from app.models.biometria.biometria_models import ZonaTrabajo
                zona_exist = await db.execute(select(ZonaTrabajo).where(ZonaTrabajo.id == zona_id))
                if zona_exist.scalar_one_or_none():
                    safe_zona_id = zona_id

        registro = RegistroAsistencia(
            usuario_id=usuario_actual.id,
            zona_id=safe_zona_id,
            match_exitoso=match_exitoso,
            nivel_confianza=confidence,
            latitud_marcada=latitud,
            longitud_marcada=longitud,
            evidencia_url=evidencia_url
        )
        db.add(registro)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error registrando logs de asistencia: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de base de datos al registrar la asistencia."
        )
    
    if not match_exitoso:
        raise HTTPException(status_code=401, detail="Identidad denegada. El rostro no coincide.")
        
    return {
        "status": "success",
        "message": "Asistencia registrada correctamente",
        "confidence": confidence,
        "evidenciaUrl": evidencia_url
    }

@router.get("/asistencias", summary="Obtener historial de asistencias")
async def obtener_asistencias(
    usuario_id: Optional[str] = None,
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db)
):
    # Si no es admin, solo puede ver sus propios registros
    if usuario_actual.rol != "admin":
        target_id = usuario_actual.id
    else:
        target_id = usuario_id if usuario_id else None

    try:
        stmt = select(RegistroAsistencia)
        if target_id:
            stmt = stmt.where(RegistroAsistencia.usuario_id == target_id)
        
        stmt = stmt.order_by(RegistroAsistencia.creado_en.desc())
        result = await db.execute(stmt)
        registros = result.scalars().all()
    except Exception as e:
        logger.error(f"Error consultando historial de asistencias: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de base de datos al consultar el historial."
        )
    
    return [
        {
            "id": r.id,
            "userId": r.usuario_id,
            "zoneId": str(r.zona_id) if r.zona_id else None,
            "isMatch": r.match_exitoso,
            "confidence": r.nivel_confianza,
            "location": {
                "latitude": r.latitud_marcada,
                "longitude": r.longitud_marcada
            },
            "timestamp": r.creado_en.isoformat() if r.creado_en else None,
            "evidenciaUrl": r.evidencia_url
        } for r in registros
    ]

@router.get("/foto/{filename}", summary="Obtener foto de perfil del servidor")
async def obtener_foto(filename: str):
    file_path = f"storage/perfiles/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return FileResponse(file_path)

@router.get("/evidencia/{filename}", summary="Obtener evidencia fotográfica de asistencia")
async def obtener_evidencia(filename: str):
    file_path = f"storage/asistencias/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Evidencia fotográfica no encontrada")
    return FileResponse(file_path)
