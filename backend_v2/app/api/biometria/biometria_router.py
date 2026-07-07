from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.router import obtener_usuario_actual_db
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth
from app.services.biometria.biometria_service import BiometriaService

MODULO_BIOMETRIA = "biometria"

router = APIRouter()


class ZonaCreate(BaseModel):
    nombre: str
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    radio: float = Field(gt=0, le=50000)


def obtener_biometria_service() -> BiometriaService:
    return BiometriaService()


async def requerir_permiso_biometria(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_BIOMETRIA not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para usar biometria")
    return usuario


@router.post("/enrolar", summary="Enrolar rostro del empleado")
async def enrolar_rostro(
    image: UploadFile = File(...),
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    return await service.enrolar_rostro(db, usuario_actual, image)


@router.get("/estado", summary="Obtener estado biometrico del usuario actual")
async def obtener_estado_biometrico(
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    return await service.obtener_estado_biometrico(db, usuario_actual)


@router.post("/asistencia", summary="Validar biometria y registrar asistencia")
async def marcar_asistencia(
    image: UploadFile = File(...),
    latitud: float = Form(...),
    longitud: float = Form(...),
    zona_id: Optional[int] = Form(None),
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    return await service.marcar_asistencia(db, usuario_actual, image, latitud, longitud, zona_id)


@router.get("/asistencias", summary="Obtener historial de asistencias")
async def obtener_asistencias(
    usuario_id: Optional[str] = None,
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    return await service.obtener_asistencias(db, usuario_actual, usuario_id)


@router.get("/foto/{filename}", summary="Obtener foto de perfil del servidor")
async def obtener_foto(
    filename: str,
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    return FileResponse(await service.ruta_foto_perfil(db, filename, usuario_actual))


@router.get("/evidencia/{filename}", summary="Obtener evidencia fotografica de asistencia")
async def obtener_evidencia(
    filename: str,
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    return FileResponse(await service.ruta_evidencia(db, filename, usuario_actual))


@router.get("/zonas", summary="Listar Zonas de Trabajo")
async def listar_zonas(
    _: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    return await service.listar_zonas(db)


@router.post("/zonas", summary="Crear Zona de Trabajo")
async def crear_zona(
    zona: ZonaCreate,
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para crear zonas")
    return {"status": "success", "zona": await service.crear_zona(db, zona.nombre, zona.latitud, zona.longitud, zona.radio)}


@router.delete("/zonas/{zona_id}", summary="Eliminar Zona de Trabajo")
async def eliminar_zona(
    zona_id: int,
    usuario_actual: Usuario = Depends(requerir_permiso_biometria),
    db: AsyncSession = Depends(obtener_db),
    service: BiometriaService = Depends(obtener_biometria_service),
):
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar zonas")
    return await service.eliminar_zona(db, zona_id)
