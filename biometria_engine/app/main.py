import logging

from fastapi import Depends, FastAPI, UploadFile, File

from .config import EngineSettings, obtener_settings
from .face_engine import precargar_modelo, representar_rostro
from .security import obtener_authorization_header, validar_token_interno_header
from .schemas import HealthResponse, RepresentResponse

logger = logging.getLogger(__name__)
app = FastAPI(title="Biometria Engine", version="1.0.0")


def validar_token_interno(
    authorization: str | None = Depends(obtener_authorization_header),
    settings: EngineSettings = Depends(obtener_settings),
) -> None:
    validar_token_interno_header(authorization, settings)


@app.on_event("startup")
async def startup() -> None:
    settings = obtener_settings()
    settings.validar_token_inicio()
    logger.info("Precargando modelo biometrico %s con detector %s", settings.deepface_model, settings.deepface_detector)
    await precargar_modelo(settings)
    logger.info("Modelo biometrico precargado")


@app.get("/health", response_model=HealthResponse)
async def health(settings: EngineSettings = Depends(obtener_settings)) -> HealthResponse:
    return HealthResponse(estado="saludable", modelo=settings.deepface_model, detector=settings.deepface_detector)


@app.post("/internal/v1/represent", response_model=RepresentResponse)
async def represent(
    image: UploadFile = File(...),
    _: None = Depends(validar_token_interno),
    settings: EngineSettings = Depends(obtener_settings),
) -> RepresentResponse:
    return await representar_rostro(image, settings)
