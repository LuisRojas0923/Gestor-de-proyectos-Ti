import math
import os
import time
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func
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

        safe_zona_id = await self._resolver_zona_id_por_geocerca(db, zona_id, latitud, longitud)
        file_bytes = await self._leer_imagen(image)
        representacion = await self.engine_client.representar(
            file_bytes,
            self._filename_motor(image.content_type),
            image.content_type,
        )

        distance, confidence, match_exitoso = self._comparar_embeddings(representacion.embedding, perfil.embedding)
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

    async def obtener_estado_biometrico(self, db: AsyncSession, usuario: Usuario) -> dict:
        perfil = await self._obtener_perfil_por_usuario(db, usuario.id)
        if not perfil or not perfil.activo:
            return {"enrolado": False, "fotoUrl": None, "actualizadoEn": None}

        foto_url = usuario.url_avatar if self._es_foto_biometrica(usuario.url_avatar) else None

        return {
            "enrolado": True,
            "fotoUrl": foto_url,
            "actualizadoEn": perfil.creado_en.isoformat() if perfil.creado_en else None,
        }

    async def obtener_asistencias(
        self,
        db: AsyncSession,
        usuario: Usuario,
        usuario_id: Optional[str] = None,
    ) -> list[dict]:
        # Autoservicio: el objetivo siempre deriva del JWT.
        target_id = usuario.id
        stmt = select(RegistroAsistencia)
        if target_id:
            stmt = stmt.where(RegistroAsistencia.usuario_id == target_id)
        stmt = stmt.order_by(RegistroAsistencia.creado_en.desc())
        result = await db.execute(stmt)
        return [self._serializar_asistencia(r) for r in result.scalars().all()]

    async def obtener_asistencias_admin(
        self, db: AsyncSession, usuario: Usuario,
        cedulas_permitidas: set[str] | None, limit: int, offset: int,
        fecha_desde=None, fecha_hasta=None, usuario_id: Optional[str] = None,
        zona_id: Optional[int] = None, resultado: Optional[bool] = None,
    ) -> dict:
        stmt = select(RegistroAsistencia, Usuario, ZonaTrabajo).join(
            Usuario, Usuario.id == RegistroAsistencia.usuario_id
        ).outerjoin(ZonaTrabajo, ZonaTrabajo.id == RegistroAsistencia.zona_id)
        filtros = []
        if cedulas_permitidas is not None:
            if not cedulas_permitidas:
                return {"items": [], "total": 0, "limit": limit, "offset": offset}
            filtros.append(Usuario.cedula.in_(cedulas_permitidas))
        if fecha_desde:
            filtros.append(RegistroAsistencia.creado_en >= fecha_desde)
        if fecha_hasta:
            filtros.append(RegistroAsistencia.creado_en <= fecha_hasta)
        if usuario_id:
            filtros.append(RegistroAsistencia.usuario_id == usuario_id)
        if zona_id is not None:
            filtros.append(RegistroAsistencia.zona_id == zona_id)
        if resultado is not None:
            filtros.append(RegistroAsistencia.match_exitoso.is_(resultado))
        total = int(await db.scalar(select(func.count()).select_from(RegistroAsistencia).join(
            Usuario, Usuario.id == RegistroAsistencia.usuario_id
        ).where(*filtros)) or 0)
        rows = (await db.execute(stmt.where(*filtros).order_by(
            RegistroAsistencia.creado_en.desc(), RegistroAsistencia.id.desc()
        ).limit(limit).offset(offset))).all()
        return {
            "items": [{
                "id": registro.id,
                "usuario_id": cuenta.id,
                "empleado_cedula": cuenta.cedula,
                "empleado_nombre": cuenta.nombre,
                "zona_id": registro.zona_id,
                "zona_nombre": zona.nombre if zona else None,
                "resultado": registro.match_exitoso,
                "creado_en": registro.creado_en,
            } for registro, cuenta, zona in rows],
            "total": total, "limit": limit, "offset": offset,
        }

    async def ruta_evidencia_admin(
        self, db: AsyncSession, registro_id: int,
        cedulas_permitidas: set[str] | None,
    ) -> Path:
        stmt = select(RegistroAsistencia, Usuario).join(
            Usuario, Usuario.id == RegistroAsistencia.usuario_id
        ).where(RegistroAsistencia.id == registro_id)
        if cedulas_permitidas is not None:
            stmt = stmt.where(Usuario.cedula.in_(cedulas_permitidas))
        row = (await db.execute(stmt)).first()
        if row is None or not row[0].evidencia_url:
            raise HTTPException(status_code=404, detail="Recurso no encontrado")
        safe_name = self._validar_filename(row[0].evidencia_url.rsplit("/", 1)[-1])
        ruta = Path("storage/asistencias") / safe_name
        if not ruta.exists():
            raise HTTPException(status_code=404, detail="Recurso no encontrado")
        return ruta

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
        if usuario.url_avatar != f"/api/v2/biometria/foto/{safe_name}":
            raise HTTPException(status_code=404, detail="Foto no encontrada")
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
        if registro.usuario_id != usuario.id:
            raise HTTPException(status_code=404, detail="Evidencia fotografica no encontrada")
        return file_path

    async def _obtener_perfil_activo(self, db: AsyncSession, usuario_id: str) -> EmbeddingFacial | None:
        perfil = await self._obtener_perfil_por_usuario(db, usuario_id)
        return perfil if perfil and perfil.activo else None

    async def _obtener_perfil_por_usuario(self, db: AsyncSession, usuario_id: str) -> EmbeddingFacial | None:
        result = await db.execute(
            select(EmbeddingFacial).where(
                EmbeddingFacial.usuario_id == usuario_id,
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

    async def _resolver_zona_id_por_geocerca(
        self,
        db: AsyncSession,
        zona_id: Optional[int],
        latitud: float,
        longitud: float,
    ) -> Optional[int]:
        result = await db.execute(select(ZonaTrabajo))
        zonas = list(result.scalars().all())
        if not zonas:
            return None

        zonas_en_radio = []
        for zona in zonas:
            distancia = self._distancia_metros(latitud, longitud, zona.latitud, zona.longitud)
            if distancia <= zona.radio:
                zonas_en_radio.append((distancia, zona.id))

        if zonas_en_radio:
            return min(zonas_en_radio, key=lambda item: item[0])[1]

        raise HTTPException(status_code=400, detail="Las coordenadas estan fuera de una zona oficial")

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
    def _distancia_metros(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        radio_tierra_m = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        return radio_tierra_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

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
    def _es_foto_biometrica(foto_url: str | None) -> bool:
        return bool(foto_url and foto_url.startswith("/api/v2/biometria/foto/"))

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
