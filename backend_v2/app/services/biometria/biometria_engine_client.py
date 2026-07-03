import logging
import math
import os
from dataclasses import dataclass

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

logger = logging.getLogger(__name__)


class RepresentacionFacial(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    embedding: list[float] = Field(min_length=1)
    embedding_size: int = Field(gt=0)
    is_real: bool = True
    detector_backend: str
    model_name: str


@dataclass(frozen=True)
class BiometriaEngineConfig:
    url: str
    token: str
    timeout_seconds: float
    expected_model: str
    expected_detector: str
    environment: str

    @property
    def es_entorno_local(self) -> bool:
        return self.environment.lower() in {"development", "desarrollo", "local", "test", "tests"}

    def validar_token_inicio(self) -> None:
        token = self.token.strip()
        if not token and self.es_entorno_local:
            return
        if not token or token.lower() in {"changeme", "placeholder", "secret", "token"}:
            raise RuntimeError("BIOMETRIA_ENGINE_TOKEN debe ser fuerte y no vacio fuera de local")


def obtener_config_engine() -> BiometriaEngineConfig:
    return BiometriaEngineConfig(
        url=os.getenv("BIOMETRIA_ENGINE_URL", "http://biometria-engine:8010").rstrip("/"),
        token=os.getenv("BIOMETRIA_ENGINE_TOKEN", ""),
        timeout_seconds=float(os.getenv("BIOMETRIA_ENGINE_TIMEOUT_SECONDS", "30")),
        expected_model=os.getenv("DEEPFACE_MODEL", "Facenet"),
        expected_detector=os.getenv("DEEPFACE_DETECTOR", "opencv"),
        environment=os.getenv("ENVIRONMENT", os.getenv("ENTORNO", "development")),
    )


class BiometriaEngineClient:
    def __init__(self, config: BiometriaEngineConfig | None = None):
        self.config = config or obtener_config_engine()

    async def representar(self, file_bytes: bytes, filename: str, content_type: str | None) -> RepresentacionFacial:
        headers = {}
        if self.config.token.strip():
            headers["Authorization"] = f"Bearer {self.config.token.strip()}"
        files = {"image": (filename or "imagen.jpg", file_bytes, content_type or "application/octet-stream")}

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.post(
                    f"{self.config.url}/internal/v1/represent",
                    headers=headers,
                    files=files,
                )
        except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as exc:
            logger.warning("Motor biometrico no disponible: %s", exc.__class__.__name__)
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible") from exc

        if response.status_code == 401:
            logger.error("Motor biometrico rechazo el token interno")
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible")
        if response.status_code in {400, 403, 422, 503}:
            detail = self._detail_saneado(response.status_code)
            raise HTTPException(status_code=response.status_code, detail=detail)
        if response.status_code >= 400:
            logger.error("Motor biometrico respondio estado inesperado: %s", response.status_code)
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible")

        try:
            representacion = RepresentacionFacial.model_validate(response.json())
        except (ValueError, ValidationError) as exc:
            logger.error("Respuesta invalida del motor biometrico")
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible") from exc

        self._validar_representacion(representacion)
        return representacion

    def _validar_representacion(self, representacion: RepresentacionFacial) -> None:
        if representacion.embedding_size != len(representacion.embedding):
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible")
        if representacion.model_name != self.config.expected_model:
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible")
        if representacion.detector_backend != self.config.expected_detector:
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible")
        if any(not math.isfinite(value) for value in representacion.embedding):
            raise HTTPException(status_code=503, detail="Servicio de biometria no disponible")

    @staticmethod
    def _detail_saneado(status_code: int) -> str:
        return {
            400: "Imagen invalida o corrupta",
            403: "Anti-spoofing: intento de suplantacion detectado",
            422: "No se detecto un rostro claro en la imagen",
            503: "Servicio de biometria no disponible",
        }.get(status_code, "Servicio de biometria no disponible")
