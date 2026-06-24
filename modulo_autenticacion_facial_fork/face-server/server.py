import os
import base64
import numpy as np
import cv2
import time
from collections import defaultdict
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from deepface import DeepFace
from pydantic import BaseModel
from typing import Optional
import uvicorn
from sqlmodel import Session, select

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
    pwd_context = None

# Base de datos
from database import engine, create_db_and_tables, get_session
from models import Usuario, EmbeddingFacial, ZonaTrabajo, RegistroAsistencia

MODEL_NAME = os.getenv('DEEPFACE_MODEL', 'Facenet512')
DETECTOR_BACKEND = os.getenv('DEEPFACE_DETECTOR', 'retinaface')
THRESHOLD = float(os.getenv('MATCH_THRESHOLD', '0.35'))
PORT = int(os.getenv('PORT', 5005))
ANTI_SPOOFING = os.getenv('ANTI_SPOOFING', '1').lower() in ('1', 'true', 'yes')

# --- Escudo Anti Fuerza Bruta ---
login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60

class ImageDecodeError(Exception):
    pass

def load_image_from_base64(img_str):
    try:
        if ',' in img_str:
            img_str = img_str.split(',')[1]
        img_bytes = base64.b64decode(img_str)
        arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ImageDecodeError("La imagen decodificada está vacía o es inválida")
        return img
    except Exception as e:
        raise ImageDecodeError(f"Fallo al decodificar base64: {str(e)}")

def l2_normalize(embedding):
    emb = np.array(embedding, dtype=np.float64)
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm
    return emb.tolist()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print('Inicializando base de datos...')
    create_db_and_tables()
    
    print('Pre-cargando modelo DeepFace y detector...')
    try:
        dummy = np.zeros((224, 224, 3), dtype=np.uint8)
        DeepFace.represent(
            img_path=dummy,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
            align=True,
            anti_spoofing=ANTI_SPOOFING,
        )
        print('  [OK] Modelos cargados exitosamente')
    except Exception as e:
        print(f'  [WARN] Advertencia en warmup: {e}')
    yield

app = FastAPI(title="GeoFace API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RepresentRequest(BaseModel):
    image: str
    user_id: str
    user_name: Optional[str] = None

class VerifyRequest(BaseModel):
    image: str
    user_id: str
    zone_id: Optional[str] = None
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    nombre: str
    rol: str = "usuario"

@app.post('/v1/auth/login')
def login(data: LoginRequest, request: Request, session: Session = Depends(get_session)):
    try:
        # Rate Limiting
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        login_attempts[client_ip] = [t for t in login_attempts[client_ip] if now - t < LOGIN_WINDOW_SECONDS]
        if len(login_attempts[client_ip]) >= MAX_LOGIN_ATTEMPTS:
            return JSONResponse(status_code=429, content={'error': 'Demasiados intentos. Por favor espera un minuto.'})
            
        user = session.exec(select(Usuario).where(Usuario.username == data.username)).first()
        
        encoded_pw = data.password.encode('utf-8')
        safe_password = encoded_pw[:72].decode('utf-8', 'ignore') if len(encoded_pw) > 72 else data.password
        
        if not user or not user.password_hash or not pwd_context.verify(safe_password, user.password_hash):
            # Registrar intento fallido
            login_attempts[client_ip].append(now)
            return JSONResponse(status_code=401, content={'error': 'Usuario o contraseña incorrectos'})
            
        return JSONResponse(content={
            'id': user.id,
            'username': user.username,
            'nombre': user.nombre,
            'rol': user.rol
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error de servidor: {str(e)}'})

@app.post('/v1/auth/register')
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    try:
        existing = session.exec(select(Usuario).where(Usuario.username == data.username)).first()
        if existing:
            return JSONResponse(status_code=400, content={'error': 'El nombre de usuario ya está en uso'})
        
        import uuid
        user_id = str(int(uuid.uuid1().time * 10000))[:13] # Simular ID numérico como antes
        
        # Bcrypt tiene un límite de 72 bytes, así que truncamos de forma segura (midiendo en bytes, no caracteres).
        encoded_pw = data.password.encode('utf-8')
        safe_password = encoded_pw[:72].decode('utf-8', 'ignore') if len(encoded_pw) > 72 else data.password
        
        hashed_pw = pwd_context.hash(safe_password)
        
        new_user = Usuario(
            id=user_id,
            username=data.username,
            password_hash=hashed_pw,
            nombre=data.nombre,
            rol=data.rol
        )
        session.add(new_user)
        session.commit()
        return JSONResponse(content={'status': 'ok', 'id': user_id})
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={'error': f'Error al crear usuario: {str(e)}'})

@app.get('/v1/users')
def get_users(admin_id: str, session: Session = Depends(get_session)):
    try:
        # Verificar que quien lo solicita es admin
        admin = session.exec(select(Usuario).where(Usuario.id == admin_id)).first()
        if not admin or admin.rol != 'admin':
            return JSONResponse(status_code=403, content={'error': 'Acceso denegado. Se requiere rol de administrador.'})
            
        users = session.exec(select(Usuario)).all()
        return JSONResponse(content={
            'users': [
                {
                    'id': u.id,
                    'username': u.username or f"user_{u.id}",
                    'displayName': u.nombre,
                    'role': u.rol,
                    'createdAt': None
                }
                for u in users
            ]
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e)})

@app.get('/v1/auth/has-accounts')
def has_accounts(session: Session = Depends(get_session)):
    try:
        # Simplemente verifica si existe al menos un usuario
        count = session.exec(select(Usuario)).first()
        return JSONResponse(content={'has_accounts': count is not None})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e)})

@app.get('/v1/users/{user_id}')
def get_user(user_id: str, session: Session = Depends(get_session)):
    try:
        user = session.exec(select(Usuario).where(Usuario.id == user_id)).first()
        if not user:
            return JSONResponse(status_code=404, content={'error': 'Usuario no encontrado'})
        return JSONResponse(content={
            'id': user.id,
            'username': user.username or f"user_{user.id}",
            'displayName': user.nombre,
            'role': user.rol,
            'createdAt': None
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e)})

@app.delete('/v1/users/{user_id}')
def delete_user(user_id: str, admin_id: str, session: Session = Depends(get_session)):
    try:
        # Verificar que quien solicita es admin
        admin = session.exec(select(Usuario).where(Usuario.id == admin_id)).first()
        if not admin or admin.rol != 'admin':
            return JSONResponse(status_code=403, content={'error': 'Acceso denegado'})
            
        user = session.exec(select(Usuario).where(Usuario.id == user_id)).first()
        if not user:
            return JSONResponse(status_code=404, content={'error': 'Usuario no encontrado'})
            
        emb = session.exec(select(EmbeddingFacial).where(EmbeddingFacial.usuario_id == user_id)).first()
        if emb:
            session.delete(emb)
            
        registros = session.exec(select(RegistroAsistencia).where(RegistroAsistencia.usuario_id == user_id)).all()
        for r in registros:
            session.delete(r)
            
        session.delete(user)
        session.commit()
        return JSONResponse(content={'status': 'ok'})
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={'error': str(e)})

@app.post('/v1/represent')
def represent(data: RepresentRequest, session: Session = Depends(get_session)):
    """ Extrae el rostro y lo GUARDA en PostgreSQL asociado al user_id """
    try:
        img = load_image_from_base64(data.image)
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

    try:
        embedding_objs = DeepFace.represent(
            img_path=img,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
            anti_spoofing=ANTI_SPOOFING,
        )
        if ANTI_SPOOFING and not embedding_objs[0].get('is_real', True):
            return JSONResponse(status_code=403, content={'error': 'Anti-spoofing: No se detectó una persona real.'})
            
        embedding_val = l2_normalize(embedding_objs[0]['embedding'])
    except ValueError as e:
        msg = str(e)
        if "Spoof detected" in msg:
            return JSONResponse(status_code=403, content={'error': 'Anti-spoofing: No se detectó una persona real.'})
        return JSONResponse(status_code=422, content={'error': f'No se detectó un rostro: {msg}'})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error en DeepFace: {str(e)}'})

    try:
        # Simular que el usuario existe en la DB o crearlo con el nombre real
        user = session.exec(select(Usuario).where(Usuario.id == data.user_id)).first()
        if not user:
            user = Usuario(id=data.user_id, nombre=data.user_name or f"Usuario {data.user_id}")
            session.add(user)
            session.commit()
        elif data.user_name:
            user.nombre = data.user_name
            session.add(user)
            session.commit()

        # Guardar en DB
        db_emb = session.exec(select(EmbeddingFacial).where(EmbeddingFacial.usuario_id == data.user_id)).first()
        if db_emb:
            db_emb.embedding = embedding_val
        else:
            db_emb = EmbeddingFacial(usuario_id=data.user_id, embedding=embedding_val)
        
        session.add(db_emb)
        session.commit()
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={'error': f'Error de base de datos: {str(e)}'})

    return JSONResponse(content={'status': 'ok', 'message': 'Rostro registrado en base de datos correctamente'})

@app.post('/v1/verify')
def verify(data: VerifyRequest, session: Session = Depends(get_session)):
    """ Compara el rostro enviado contra el guardado en PostgreSQL y guarda la asistencia """
    try:
        db_emb = session.exec(select(EmbeddingFacial).where(EmbeddingFacial.usuario_id == data.user_id)).first()
        if not db_emb:
            return JSONResponse(status_code=404, content={'error': 'Usuario no tiene rostro registrado en la base de datos'})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error de base de datos: {str(e)}'})

    try:
        image_input = load_image_from_base64(data.image)
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

    try:
        embedding_objs = DeepFace.represent(
            img_path=image_input,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
            anti_spoofing=ANTI_SPOOFING,
        )
        if ANTI_SPOOFING and not embedding_objs[0].get('is_real', True):
            return JSONResponse(status_code=403, content={'error': 'Anti-spoofing: No se detectó una persona real.'})
            
        verification_emb = np.array(l2_normalize(embedding_objs[0]['embedding']), dtype=np.float64)
    except ValueError as e:
        msg = str(e)
        if "Spoof detected" in msg:
            return JSONResponse(status_code=403, content={'error': 'Anti-spoofing: No se detectó una persona real.'})
        return JSONResponse(status_code=422, content={'error': f'No se detectó un rostro: {msg}'})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error en DeepFace: {str(e)}'})

    stored_emb = np.array(db_emb.embedding, dtype=np.float64)
    
    dot = np.dot(verification_emb, stored_emb)
    norm_v = np.linalg.norm(verification_emb)
    norm_s = np.linalg.norm(stored_emb)
    
    distance = 1.0 if (norm_v == 0 or norm_s == 0) else 1.0 - (dot / (norm_v * norm_s))
    confidence = round(max(0.0, min(100.0, (1.0 - distance) * 100.0)), 2)
    is_match = bool(distance <= THRESHOLD)

    try:
        lat = data.latitude if data.latitude is not None else 0.0
        lon = data.longitude if data.longitude is not None else 0.0
        
        # Simular que la zona existe en la DB si se envió una (para evitar error de Foreign Key en pruebas)
        if data.zone_id:
            zona = session.exec(select(ZonaTrabajo).where(ZonaTrabajo.id == data.zone_id)).first()
            if not zona:
                zona = ZonaTrabajo(id=data.zone_id, nombre=f"Zona Local", latitud=lat, longitud=lon, radio=100.0)
                session.add(zona)
                session.commit()

        # Registrar Asistencia en DB
        registro = RegistroAsistencia(
            usuario_id=data.user_id,
            zona_id=data.zone_id,
            match_exitoso=is_match,
            nivel_confianza=confidence,
            latitud_marcada=lat,
            longitud_marcada=lon
        )
        session.add(registro)
        session.commit()
    except Exception as e:
        session.rollback()
        return JSONResponse(status_code=500, content={'error': f'Error al guardar registro: {str(e)}'})

    return JSONResponse(content={
        'verified': is_match,
        'distance': round(float(distance), 6),
        'confidence': confidence,
        'threshold': THRESHOLD
    })

@app.get('/v1/check-ins/{user_id}')
def get_check_ins(user_id: str, session: Session = Depends(get_session)):
    """ Retorna el historial de asistencias de un usuario """
    try:
        registros = session.exec(
            select(RegistroAsistencia)
            .where(RegistroAsistencia.usuario_id == user_id)
            .order_by(RegistroAsistencia.creado_en.desc())
        ).all()
        
        return JSONResponse(content={
            'check_ins': [
                {
                    'id': r.id,
                    'userId': r.usuario_id,
                    'zoneId': r.zona_id,
                    'isMatch': r.match_exitoso,
                    'confidence': r.nivel_confianza,
                    'timestamp': r.creado_en.isoformat() if r.creado_en else None,
                    'location': {'latitude': r.latitud_marcada, 'longitude': r.longitud_marcada}
                }
                for r in registros
            ]
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error de base de datos: {str(e)}'})

@app.get('/v1/check-ins')
def get_all_check_ins(session: Session = Depends(get_session)):
    """ Retorna el historial de asistencias de todos los usuarios (para administrador) """
    try:
        registros = session.exec(
            select(RegistroAsistencia)
            .order_by(RegistroAsistencia.creado_en.desc())
        ).all()
        
        return JSONResponse(content={
            'check_ins': [
                {
                    'id': r.id,
                    'userId': r.usuario_id,
                    'zoneId': r.zona_id,
                    'isMatch': r.match_exitoso,
                    'confidence': r.nivel_confianza,
                    'timestamp': r.creado_en.isoformat() if r.creado_en else None,
                    'location': {'latitude': r.latitud_marcada, 'longitude': r.longitud_marcada}
                }
                for r in registros
            ]
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f'Error de base de datos: {str(e)}'})

@app.get('/v1/health')
def health(session: Session = Depends(get_session)):
    try:
        from sqlmodel import text
        session.exec(text("SELECT 1"))
        db_status = 'postgres-connected'
    except Exception as e:
        db_status = f'postgres-error: {str(e)}'
        return JSONResponse(status_code=503, content={'status': 'error', 'model': MODEL_NAME, 'database': db_status})
        
    return JSONResponse(content={'status': 'ok', 'model': MODEL_NAME, 'database': db_status})

if __name__ == '__main__':
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)
