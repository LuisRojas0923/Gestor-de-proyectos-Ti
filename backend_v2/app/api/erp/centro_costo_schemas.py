from pydantic import BaseModel, Field

class UenCreate(BaseModel):
    codigo: str = Field(..., max_length=10)
    nombre: str = Field(..., max_length=100)
    activo: bool = True

class UenOut(BaseModel):
    codigo: str
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


class SubcentroCreate(BaseModel):
    codigo: str = Field(..., max_length=10)
    nombre: str = Field(..., max_length=100)
    activo: bool = True

class SubcentroOut(BaseModel):
    codigo: str
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


class EspecialidadCreate(BaseModel):
    codigo: str = Field(..., max_length=10)
    nombre: str = Field(..., max_length=100)
    activo: bool = True

class EspecialidadOut(BaseModel):
    codigo: str
    nombre: str
    activo: bool

    class Config:
        from_attributes = True
