from typing import Any, Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.linea_corporativa import EmpleadoLinea, EquipoMovil, LineaCorporativa
from app.models.linea_corporativa.factura_model import FacturaLinea
from app.services.auditoria.snapshots import modelo_a_dict_auditoria


class RecursoNoEncontradoLineas(Exception):
    pass


class ConflictoIntegridadLineas(Exception):
    pass


class ErrorPersistenciaLineas(Exception):
    pass


class RecursoEnUsoLineas(ConflictoIntegridadLineas):
    pass


class EntradaModelo(Protocol):
    def model_dump(self, **kwargs: Any) -> dict[str, Any]: ...


class LineasCorporativasMaestrosService:
    @staticmethod
    async def listar_equipos(db: AsyncSession) -> list[EquipoMovil]:
        return list((await db.execute(select(EquipoMovil))).scalars().all())

    @staticmethod
    async def crear_equipo(
        db: AsyncSession, entrada: EntradaModelo
    ) -> EquipoMovil:
        equipo = EquipoMovil(**entrada.model_dump())
        db.add(equipo)
        await LineasCorporativasMaestrosService._confirmar(db, refrescar=equipo)
        return equipo

    @staticmethod
    async def actualizar_equipo(
        db: AsyncSession, equipo_id: int, entrada: EntradaModelo
    ) -> tuple[EquipoMovil, dict[str, Any]]:
        equipo = await db.get(EquipoMovil, equipo_id)
        if not equipo:
            raise RecursoNoEncontradoLineas("Equipo no encontrado")
        antes = modelo_a_dict_auditoria(equipo)
        for campo, valor in entrada.model_dump(exclude_unset=True).items():
            setattr(equipo, campo, valor)
        db.add(equipo)
        await LineasCorporativasMaestrosService._confirmar(db, refrescar=equipo)
        return equipo, antes

    @staticmethod
    async def eliminar_equipo(
        db: AsyncSession, equipo_id: int
    ) -> dict[str, Any]:
        equipo = await db.get(EquipoMovil, equipo_id)
        if not equipo:
            raise RecursoNoEncontradoLineas("Equipo no encontrado")
        antes = modelo_a_dict_auditoria(equipo)
        await db.delete(equipo)
        await LineasCorporativasMaestrosService._confirmar(
            db, conflicto_en_uso=True
        )
        return antes

    @staticmethod
    async def listar_personas(db: AsyncSession) -> list[EmpleadoLinea]:
        return list((await db.execute(select(EmpleadoLinea))).scalars().all())

    @staticmethod
    async def crear_persona(
        db: AsyncSession, entrada: EntradaModelo
    ) -> EmpleadoLinea:
        persona = EmpleadoLinea(**entrada.model_dump())
        db.add(persona)
        await LineasCorporativasMaestrosService._confirmar(db, refrescar=persona)
        return persona

    @staticmethod
    async def actualizar_persona(
        db: AsyncSession, documento: str, entrada: EntradaModelo
    ) -> tuple[EmpleadoLinea, dict[str, Any]]:
        persona = await db.get(EmpleadoLinea, documento)
        if not persona:
            raise RecursoNoEncontradoLineas("Persona no encontrada")
        antes = modelo_a_dict_auditoria(persona)
        for campo, valor in entrada.model_dump(exclude_unset=True).items():
            setattr(persona, campo, valor)
        db.add(persona)
        await LineasCorporativasMaestrosService._confirmar(db, refrescar=persona)
        return persona, antes

    @staticmethod
    async def eliminar_persona(
        db: AsyncSession, documento: str
    ) -> dict[str, Any]:
        persona = await db.get(EmpleadoLinea, documento)
        if not persona:
            raise RecursoNoEncontradoLineas("Persona no encontrada")
        antes = modelo_a_dict_auditoria(persona)
        await db.delete(persona)
        await LineasCorporativasMaestrosService._confirmar(
            db, conflicto_en_uso=True
        )
        return antes

    @staticmethod
    async def eliminar_linea(db: AsyncSession, linea_id: int) -> dict[str, Any]:
        linea = await db.get(LineaCorporativa, linea_id)
        if not linea:
            raise RecursoNoEncontradoLineas("Línea no encontrada")
        historial = await db.execute(
            select(FacturaLinea.id).where(FacturaLinea.linea_id == linea_id).limit(1)
        )
        if historial.scalar_one_or_none() is not None:
            raise RecursoEnUsoLineas(
                "No se puede eliminar una línea con historial de facturación"
            )
        antes = modelo_a_dict_auditoria(linea)
        await db.delete(linea)
        await LineasCorporativasMaestrosService._confirmar(
            db, conflicto_en_uso=True
        )
        return antes

    @staticmethod
    async def _confirmar(
        db: AsyncSession,
        *,
        conflicto_en_uso: bool = False,
        refrescar: Any = None,
    ) -> None:
        try:
            await db.flush()
            if refrescar is not None:
                await db.refresh(refrescar)
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            if conflicto_en_uso:
                raise RecursoEnUsoLineas("El registro tiene relaciones activas") from exc
            raise ConflictoIntegridadLineas("El registro contiene valores duplicados") from exc
        except Exception as exc:
            await db.rollback()
            raise ErrorPersistenciaLineas("No fue posible guardar el registro") from exc
