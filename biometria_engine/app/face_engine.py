import asyncio
import io

import numpy as np
from deepface import DeepFace
from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps

from .config import EngineSettings
from .schemas import RepresentResponse


def _l2_normalize(embedding: list[float]) -> list[float]:
    emb = np.array(embedding, dtype=np.float64)
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm
    return emb.tolist()


async def leer_imagen(image: UploadFile, settings: EngineSettings) -> np.ndarray:
    content_type = (image.content_type or "").lower()
    if content_type and content_type not in {"image/jpeg", "image/jpg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Formato de imagen no permitido")

    file_bytes = await image.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="La imagen esta vacia")
    if len(file_bytes) > settings.max_image_bytes:
        raise HTTPException(status_code=400, detail="La imagen supera el tamano permitido")

    try:
        img_pil = Image.open(io.BytesIO(file_bytes))
        img_pil = ImageOps.exif_transpose(img_pil)
        arr = np.array(img_pil.convert("RGB"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Imagen invalida o corrupta") from exc

    if arr.size == 0:
        raise HTTPException(status_code=400, detail="La imagen esta vacia")
    return arr


async def precargar_modelo(settings: EngineSettings) -> None:
    def _preload() -> None:
        DeepFace.build_model(settings.deepface_model)
        dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
        DeepFace.represent(
            img_path=dummy_img,
            model_name=settings.deepface_model,
            detector_backend=settings.deepface_detector,
            enforce_detection=False,
        )

    await asyncio.to_thread(_preload)


async def representar_rostro(image: UploadFile, settings: EngineSettings) -> RepresentResponse:
    img = await leer_imagen(image, settings)
    represent_kwargs = dict(
        img_path=img,
        model_name=settings.deepface_model,
        detector_backend=settings.deepface_detector,
        enforce_detection=True,
        align=True,
    )
    if settings.anti_spoofing:
        represent_kwargs["anti_spoofing"] = True

    try:
        try:
            embedding_objs = await asyncio.to_thread(DeepFace.represent, **represent_kwargs)
        except TypeError:
            represent_kwargs.pop("anti_spoofing", None)
            embedding_objs = await asyncio.to_thread(DeepFace.represent, **represent_kwargs)
    except ValueError as exc:
        msg = str(exc)
        if "Spoof detected" in msg:
            raise HTTPException(status_code=403, detail="Anti-spoofing: No se detecto una persona real") from exc
        raise HTTPException(status_code=422, detail="No se detecto un rostro claro en la imagen") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Motor biometrico no disponible") from exc

    if not embedding_objs:
        raise HTTPException(status_code=422, detail="No se detecto un rostro claro en la imagen")

    first = embedding_objs[0]
    if settings.anti_spoofing and not first.get("is_real", True):
        raise HTTPException(status_code=403, detail="Anti-spoofing: Intento de suplantacion detectado")

    embedding = _l2_normalize(first["embedding"])
    return RepresentResponse(
        embedding=embedding,
        embedding_size=len(embedding),
        is_real=bool(first.get("is_real", True)),
        detector_backend=settings.deepface_detector,
        model_name=settings.deepface_model,
    )
