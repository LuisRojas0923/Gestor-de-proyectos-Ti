from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth.usuario import RelacionUsuario
from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import ValidacionAsignacion


class AsignacionJerarquicaService:
    """Reglas para asignaciones que requieren validación jerárquica."""

    @staticmethod
    async def obtener_superior_directo(db: AsyncSession, usuario_id: str) -> Optional[str]:
        relacion = await db.scalar(
            select(RelacionUsuario).where(
                RelacionUsuario.usuario_id == usuario_id,
                RelacionUsuario.esta_activa.is_(True),
            )
        )
        return relacion.superior_id if relacion else None

    @staticmethod
    async def obtener_validador_si_asignacion_indirecta(
        db: AsyncSession,
        asignador_id: Optional[str],
        asignado_id: Optional[str],
    ) -> Optional[str]:
        if not asignador_id or not asignado_id or asignador_id == asignado_id:
            return None

        superior_directo = await AsignacionJerarquicaService.obtener_superior_directo(db, asignado_id)
        if not superior_directo or superior_directo == asignador_id:
            return None

        actual = superior_directo
        visitados = set()
        while actual and actual not in visitados:
            visitados.add(actual)
            if actual == asignador_id:
                return superior_directo
            actual = await AsignacionJerarquicaService.obtener_superior_directo(db, actual)

        return None

    @staticmethod
    async def aplicar_validacion_actividad(
        db: AsyncSession,
        actividad: Actividad,
        asignador_id: Optional[str],
        asignado_id: Optional[str],
    ) -> None:
        validador_id = await AsignacionJerarquicaService.obtener_validador_si_asignacion_indirecta(
            db, asignador_id, asignado_id
        )
        if not validador_id or not asignado_id or not asignador_id:
            actividad.estado_validacion = "aprobada"
            actividad.validacion_id = None
            return

        validacion = ValidacionAsignacion(
            desarrollo_id=actividad.desarrollo_id,
            actividad_id=actividad.id,
            solicitado_por_id=asignador_id,
            validador_id=validador_id,
            asignado_a_id=asignado_id,
            estado="pendiente",
        )
        db.add(validacion)
        await db.flush()
        actividad.estado_validacion = "pendiente"
        actividad.validacion_id = validacion.id

    @staticmethod
    async def resolver_validacion(
        db: AsyncSession,
        validacion: ValidacionAsignacion,
        estado: str,
        observacion: Optional[str] = None,
    ) -> ValidacionAsignacion:
        if estado not in {"aprobada", "rechazada"}:
            raise ValueError("Estado de validación no soportado")

        validacion.estado = estado
        validacion.observacion = observacion
        validacion.validado_en = datetime.utcnow()

        if validacion.actividad_id:
            actividad = await db.get(Actividad, validacion.actividad_id)
            if actividad:
                actividad.estado_validacion = estado
                actividad.validacion_id = validacion.id
                if estado == "aprobada":
                    actividad.asignado_a_id = validacion.asignado_a_id

        await db.commit()
        await db.refresh(validacion)
        return validacion
