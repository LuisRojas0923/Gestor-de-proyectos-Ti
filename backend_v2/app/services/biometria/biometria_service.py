import os
import time
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.auth.usuario import Usuario
from app.models.biometria.biometria_models import EmbeddingFacial, RegistroAsistencia, ZonaTrabajo

from .biometria_engine_client import BiometriaEngineClient

MAX_IMAGE_BYTES = int(os.getenv("BIOMETRIA_MAX_IMAGE_BYTES", str(6 * 1024 * 1024)))
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.40"))
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class BiometriaService:
    def __init__(self, engine_client: BiometriaEngineClient | None = None):
        self.engine_client = engine_client or BiometriaEngineClient()

    async def enrolar_rostro(self, db: AsyncSession, usuario: Usuario, image: UploadFile) -> dict:
        file_bytes = await self._leer_imagen(image)
        representacion = await self.engine_client.representar(
            file_bytes,
            self._filename_motor(image.content_type),
            image.content_type,
        )

        stmt = pg_insert(EmbeddingFacial.__table__).values(
            usuario_id=usuario.id,
            embedding=representacion.embedding,
            activo=True,
        ).on_conflict_do_update(
            index_elements=["usuario_id"],
            set_={"embedding": representacion.embedding, "activo": True},
        )

        filename = self._filename_perfil(usuario.id, image.content_type)
        file_path = Path("storage/perfiles") / filename
        try:
            await db.execute(stmt)
            self._guardar_archivo(file_path, file_bytes)
            usuario.url_avatar = f"/api/v2/biometria/foto/{filename}"
            db.add(usuario)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail="Error al guardar el perfil facial") from exc

        return {"status": "success", "message": "Rostro enrolado correctamente"}

    async def marcar_asistencia(
        self,
        db: AsyncSession,
        usuario: Usuario,
        image: UploadFile,
        latitud: float,
        longitud: float,
        zona_id: Optional[int] = None,
    ) -> dict:
        perfil = await self._obtener_perfil_activo(db, usuario.id)
        if not perfil:
            raise HTTPException(status_code=404, detail="El usuario no tiene un rostro enrolado")

        file_bytes = await self._leer_imagen(image)
        representacion = await self.engine_client.representar(
            file_bytes,
            self._filename_motor(image.content_type),
            image.content_type,
        )

        distance, confidence, match_exitoso = self._comparar_embeddings(representacion.embedding, perfil.embedding)
        safe_zona_id = await self._resolver_zona_id(db, zona_id)
        filename = self._filename_evidencia(usuario.id, image.content_type)
        file_path = Path("storage/asistencias") / filename
        evidencia_url = f"/api/v2/biometria/evidencia/{filename}"

        try:
            self._guardar_archivo(file_path, file_bytes)
            registro = RegistroAsistencia(
                usuario_id=usuario.id,
                zona_id=safe_zona_id,
                match_exitoso=match_exitoso,
                nivel_confianza=confidence,
                latitud_marcada=latitud,
                longitud_marcada=longitud,
                evidencia_url=evidencia_url,
            )
            db.add(registro)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail="Error al registrar la asistencia") from exc

        if not match_exitoso:
            raise HTTPException(status_code=401, detail="Identidad denegada. El rostro no coincide")

        return {
            "status": "success",
            "message": "Asistencia registrada correctamente",
            "confidence": confidence,
            "evidenciaUrl": evidencia_url,
            "distance": round(distance, 6),
        }

    async def obtener_asistencias(
        self,
        db: AsyncSession,
        usuario: Usuario,
        usuario_id: Optional[str] = None,
    ) -> list[dict]:
        target_id = usuario_id if usuario.rol == "admin" else usuario.id
        stmt = select(RegistroAsistencia)
        if target_id:
            stmt = stmt.where(RegistroAsistencia.usuario_id == target_id)
        stmt = stmt.order_by(RegistroAsistencia.creado_en.desc())
        result = await db.execute(stmt)
        return [self._serializar_asistencia(r) for r in result.scalars().all()]

    async def listar_zonas(self, db: AsyncSession) -> list[ZonaTrabajo]:
        result = await db.execute(select(ZonaTrabajo))
        return list(result.scalars().all())

    async def crear_zona(self, db: AsyncSession, nombre: str, latitud: float, longitud: float, radio: float) -> ZonaTrabajo:
        zona = ZonaTrabajo(nombre=nombre, latitud=latitud, longitud=longitud, radio=radio)
        db.add(zona)
        await db.commit()
        await db.refresh(zona)
        return zona

    async def eliminar_zona(self, db: AsyncSession, zona_id: int) -> dict:
        result = await db.execute(select(ZonaTrabajo).where(ZonaTrabajo.id == zona_id))
        zona = result.scalar_one_or_none()
        if not zona:
            raise HTTPException(status_code=404, detail="Zona no encontrada")
        await db.delete(zona)
        await db.commit()
        return {"status": "success", "message": "Zona eliminada correctamente"}

    async def ruta_foto_perfil(self, db: AsyncSession, filename: str, usuario: Usuario) -> Path:
        safe_name = self._validar_filename(filename)
        file_path = Path("storage/perfiles") / safe_name
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Foto no encontrada")
        if usuario.rol != "admin" and usuario.url_avatar != f"/api/v2/biometria/foto/{safe_name}":
            raise HTTPException(status_code=403, detail="No tiene permisos para consultar esta foto")
        return file_path

    async def ruta_evidencia(self, db: AsyncSession, filename: str, usuario: Usuario) -> Path:
        safe_name = self._validar_filename(filename)
        file_path = Path("storage/asistencias") / safe_name
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Evidencia fotografica no encontrada")
        result = await db.execute(
            select(RegistroAsistencia).where(
                RegistroAsistencia.evidencia_url == f"/api/v2/biometria/evidencia/{safe_name}"
            )
        )
        registro = result.scalar_one_or_none()
        if not registro:
            raise HTTPException(status_code=404, detail="Evidencia fotografica no encontrada")
        if usuario.rol != "admin" and registro.usuario_id != usuario.id:
            raise HTTPException(status_code=403, detail="No tiene permisos para consultar esta evidencia")
        return file_path

    async def _obtener_perfil_activo(self, db: AsyncSession, usuario_id: str) -> EmbeddingFacial | None:
        result = await db.execute(
            select(EmbeddingFacial).where(
                EmbeddingFacial.usuario_id == usuario_id,
                EmbeddingFacial.activo == True,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()

    async def _leer_imagen(self, image: UploadFile) -> bytes:
        content_type = (image.content_type or "").lower()
        if content_type and content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Formato de imagen no permitido")
        file_bytes = await image.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="La imagen esta vacia")
        if len(file_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="La imagen supera el tamano permitido")
        return file_bytes

    @staticmethod
    def _comparar_embeddings(nuevo: list[float], almacenado: list[float]) -> tuple[float, float, bool]:
        verification_emb = np.array(nuevo, dtype=np.float64)
        stored_emb = np.array(almacenado, dtype=np.float64)
        if verification_emb.shape != stored_emb.shape:
            raise HTTPException(status_code=500, detail="Perfil facial invalido")
        dot = np.dot(verification_emb, stored_emb)
        norm_v = np.linalg.norm(verification_emb)
        norm_s = np.linalg.norm(stored_emb)
        distance = 1.0 if (norm_v == 0 or norm_s == 0) else 1.0 - (dot / (norm_v * norm_s))
        confidence = round(max(0.0, min(100.0, (1.0 - distance) * 100.0)), 2)
        return float(distance), confidence, bool(distance <= MATCH_THRESHOLD)

    async def _resolver_zona_id(self, db: AsyncSession, zona_id: Optional[int]) -> Optional[int]:
        if zona_id is None or zona_id > 2147483647:
            return None
        result = await db.execute(select(ZonaTrabajo).where(ZonaTrabajo.id == zona_id))
        return zona_id if result.scalar_one_or_none() else None

    @staticmethod
    def _guardar_archivo(file_path: Path, file_bytes: bytes) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(file_bytes)

    @staticmethod
    def _filename_perfil(usuario_id: str, content_type: str | None) -> str:
        return f"{usuario_id}{BiometriaService._extension(content_type)}"

    @staticmethod
    def _filename_evidencia(usuario_id: str, content_type: str | None) -> str:
        return f"{usuario_id}_{time.time_ns()}_{uuid.uuid4().hex}{BiometriaService._extension(content_type)}"

    @staticmethod
    def _extension(content_type: str | None) -> str:
        return {
            "image/png": ".png",
            "image/webp": ".webp",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
        }.get((content_type or "").lower(), ".jpg")

    @staticmethod
    def _filename_motor(content_type: str | None) -> str:
        return f"captura{BiometriaService._extension(content_type)}"

    @staticmethod
    def _validar_filename(filename: str) -> str:
        safe_name = os.path.basename(filename)
        if not safe_name or safe_name != filename or any(sep in filename for sep in ("/", "\\")):
            raise HTTPException(status_code=400, detail="Nombre de archivo invalido")
        return safe_name

    @staticmethod
    def _serializar_asistencia(registro: RegistroAsistencia) -> dict:
        return {
            "id": registro.id,
            "userId": registro.usuario_id,
            "zoneId": str(registro.zona_id) if registro.zona_id else None,
            "isMatch": registro.match_exitoso,
            "confidence": registro.nivel_confianza,
            "location": {
                "latitude": registro.latitud_marcada,
                "longitude": registro.longitud_marcada,
            },
            "timestamp": registro.creado_en.isoformat() if registro.creado_en else None,
            "evidenciaUrl": registro.evidencia_url,
        }
