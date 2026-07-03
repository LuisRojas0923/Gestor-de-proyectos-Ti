from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    estado: str
    modelo: str
    detector: str
    runtime: str = "deepface"


class RepresentResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    embedding: list[float] = Field(min_length=1)
    embedding_size: int = Field(gt=0)
    is_real: bool = True
    detector_backend: str
    model_name: str
