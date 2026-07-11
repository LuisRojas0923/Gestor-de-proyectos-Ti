"""Logica transaccional del catalogo y aplicacion de plantillas."""
import hashlib
import json
from typing import Iterable, Optional
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.auth.usuario import Usuario
from ...models.novedades_nomina.horas_extras import NominaHorarioPactado
from ...models.novedades_nomina.horas_extras_horario_dia import NominaHorarioPactadoDia
from ...models.novedades_nomina.plantillas_horario import (
    NominaAplicacionPlantillaEmpleado,
    NominaAplicacionPlantillaHorario,
    NominaPlantillaHorario,
    NominaPlantillaHorarioDia,
    NominaPlantillaHorarioHistorial,
    OperacionIdempotente,
)
from ...models.novedades_nomina.schemas_plantillas_horario import (
    AplicacionPlantillaRead,
    PlantillaHorarioCreate,
    PlantillaHorarioDiaIn,
    PlantillaHorarioRead,
    PlantillaHorarioUpdate,
)
from ...models.novedades_nomina.turnos import minutos_jornada
from ..auth.alcance_empleados_service import autorizar_lote, normalizar_lote
from .horario_lock_service import bloquear_horario_empleado

TIPO_APLICACION = "APLICAR_PLANTILLA_HORARIO"


def validar_dias_plantilla(dias: Iterable[PlantillaHorarioDiaIn]) -> list[PlantillaHorarioDiaIn]:
    ordenados = sorted(dias, key=lambda dia: dia.dia_semana)
    if [dia.dia_semana for dia in ordenados] != list(range(1, 8)):
        raise ValueError("La plantilla debe contener exactamente los días 1 a 7")
    return ordenados


def _normalizar_nombre(nombre: str) -> str:
    valor = " ".join(nombre.strip().split())
    if not valor:
        raise ValueError("El nombre es obligatorio")
    return valor


def _dia_dict(dia) -> dict:
    return {
        "dia_semana": dia.dia_semana,
        "hora_entrada": dia.hora_entrada.isoformat() if dia.hora_entrada else None,
        "hora_salida": dia.hora_salida.isoformat() if dia.hora_salida else None,
        "minutos_almuerzo": dia.minutos_almuerzo,
        "cruza_medianoche": dia.cruza_medianoche,
    }


def _snapshot(plantilla: NominaPlantillaHorario, dias: Iterable) -> dict:
    return {
        "id": str(plantilla.id),
        "nombre": plantilla.nombre,
        "descripcion": plantilla.descripcion,
        "version": plantilla.version,
        "esta_activa": plantilla.esta_activa,
        "dias": [_dia_dict(dia) for dia in sorted(dias, key=lambda item: item.dia_semana)],
    }


def _snapshot_horario(dias: Iterable) -> list[dict]:
    por_dia = {dia.dia_semana: dia for dia in dias}
    return [
        _dia_dict(por_dia[dia]) if dia in por_dia else {
            "dia_semana": dia,
            "hora_entrada": None,
            "hora_salida": None,
            "minutos_almuerzo": 0,
            "cruza_medianoche": False,
        }
        for dia in range(1, 8)
    ]


async def _dias(session: AsyncSession, plantilla_id: UUID) -> list[NominaPlantillaHorarioDia]:
    return list((await session.execute(
        select(NominaPlantillaHorarioDia)
        .where(NominaPlantillaHorarioDia.plantilla_id == plantilla_id)
        .order_by(NominaPlantillaHorarioDia.dia_semana)
    )).scalars().all())


async def obtener_plantilla(session: AsyncSession, plantilla_id: UUID) -> PlantillaHorarioRead:
    plantilla = await session.get(NominaPlantillaHorario, plantilla_id)
    if plantilla is None:
        raise LookupError("Plantilla no encontrada")
    dias = await _dias(session, plantilla_id)
    return PlantillaHorarioRead(**plantilla.model_dump(), dias=dias)


async def listar_plantillas(
    session: AsyncSession, limit: int, offset: int, incluir_inactivas: bool = False,
    q: str | None = None,
) -> tuple[list[PlantillaHorarioRead], int]:
    filtro = [] if incluir_inactivas else [NominaPlantillaHorario.esta_activa.is_(True)]
    if q and q.strip():
        patron = f"%{q.strip()}%"
        filtro.append(
            NominaPlantillaHorario.nombre.ilike(patron)
            | NominaPlantillaHorario.descripcion.ilike(patron)
        )
    total = int(await session.scalar(
        select(func.count()).select_from(NominaPlantillaHorario).where(*filtro)
    ) or 0)
    pagina_ids = (
        select(NominaPlantillaHorario.id)
        .where(*filtro)
        .order_by(NominaPlantillaHorario.nombre, NominaPlantillaHorario.id)
        .limit(limit)
        .offset(offset)
        .subquery()
    )
    filas = (await session.execute(
        select(NominaPlantillaHorario, NominaPlantillaHorarioDia)
        .join(pagina_ids, pagina_ids.c.id == NominaPlantillaHorario.id)
        .outerjoin(
            NominaPlantillaHorarioDia,
            NominaPlantillaHorarioDia.plantilla_id == NominaPlantillaHorario.id,
        )
        .order_by(
            NominaPlantillaHorario.nombre,
            NominaPlantillaHorario.id,
            NominaPlantillaHorarioDia.dia_semana,
        )
    )).all()
    por_plantilla: dict[UUID, tuple[NominaPlantillaHorario, list]] = {}
    for plantilla, dia in filas:
        entrada = por_plantilla.setdefault(plantilla.id, (plantilla, []))
        if dia is not None:
            entrada[1].append(dia)
    items = [
        PlantillaHorarioRead(
            **plantilla.model_dump(),
            dias=sorted(dias, key=lambda dia: dia.dia_semana),
        )
        for plantilla, dias in por_plantilla.values()
    ]
    return items, total


async def crear_plantilla(
    session: AsyncSession, payload: PlantillaHorarioCreate, actor: Usuario,
    accion: str = "CREADA",
) -> PlantillaHorarioRead:
    dias = validar_dias_plantilla(payload.dias)
    plantilla = NominaPlantillaHorario(
        nombre=_normalizar_nombre(payload.nombre), descripcion=payload.descripcion,
        creado_por_id=actor.id, actualizado_por_id=actor.id,
    )
    try:
        session.add(plantilla)
        await session.flush()
        filas = [NominaPlantillaHorarioDia(
            plantilla_id=plantilla.id, **dia.model_dump()
        ) for dia in dias]
        session.add_all(filas)
        await session.flush()
        session.add(NominaPlantillaHorarioHistorial(
            plantilla_id=plantilla.id, accion=accion, version=1,
            actor_usuario_id=actor.id, snapshot=_snapshot(plantilla, filas),
        ))
        await session.commit()
        return await obtener_plantilla(session, plantilla.id)
    except Exception:
        await session.rollback()
        raise


async def editar_plantilla(
    session: AsyncSession, plantilla_id: UUID,
    payload: PlantillaHorarioUpdate, actor: Usuario,
) -> PlantillaHorarioRead:
    try:
        plantilla = (await session.execute(
            select(NominaPlantillaHorario)
            .where(NominaPlantillaHorario.id == plantilla_id).with_for_update()
        )).scalar_one_or_none()
        if plantilla is None:
            raise LookupError("Plantilla no encontrada")
        if plantilla.version != payload.version_esperada:
            raise RuntimeError("La plantilla fue modificada por otro usuario")
        cambios = payload.model_dump(exclude_unset=True, exclude={"version_esperada", "dias"})
        if "nombre" in cambios:
            cambios["nombre"] = _normalizar_nombre(cambios["nombre"])
        for campo, valor in cambios.items():
            setattr(plantilla, campo, valor)
        if payload.dias is not None:
            nuevos = validar_dias_plantilla(payload.dias)
            existentes = {dia.dia_semana: dia for dia in await _dias(session, plantilla_id)}
            for dia in nuevos:
                fila = existentes[dia.dia_semana]
                for campo, valor in dia.model_dump().items():
                    setattr(fila, campo, valor)
        plantilla.version += 1
        plantilla.actualizado_por_id = actor.id
        plantilla.actualizado_en = func.now()
        await session.flush()
        dias = await _dias(session, plantilla_id)
        session.add(NominaPlantillaHorarioHistorial(
            plantilla_id=plantilla.id, accion="EDITADA", version=plantilla.version,
            actor_usuario_id=actor.id, snapshot=_snapshot(plantilla, dias),
        ))
        await session.commit()
        return await obtener_plantilla(session, plantilla.id)
    except Exception:
        await session.rollback()
        raise


async def desactivar_plantilla(
    session: AsyncSession, plantilla_id: UUID, actor: Usuario
) -> PlantillaHorarioRead:
    try:
        plantilla = (await session.execute(
            select(NominaPlantillaHorario).where(
                NominaPlantillaHorario.id == plantilla_id
            ).with_for_update()
        )).scalar_one_or_none()
        if plantilla is None:
            raise LookupError("Plantilla no encontrada")
        if plantilla.esta_activa:
            plantilla.esta_activa = False
            plantilla.version += 1
            plantilla.actualizado_por_id = actor.id
            plantilla.actualizado_en = func.now()
            dias = await _dias(session, plantilla_id)
            session.add(NominaPlantillaHorarioHistorial(
                plantilla_id=plantilla.id, accion="DESACTIVADA", version=plantilla.version,
                actor_usuario_id=actor.id, snapshot=_snapshot(plantilla, dias),
            ))
        await session.commit()
        return await obtener_plantilla(session, plantilla_id)
    except Exception:
        await session.rollback()
        raise


async def duplicar_plantilla(
    session: AsyncSession, plantilla_id: UUID, nombre: str, actor: Usuario
) -> PlantillaHorarioRead:
    original = await obtener_plantilla(session, plantilla_id)
    return await crear_plantilla(session, PlantillaHorarioCreate(
        nombre=nombre, descripcion=original.descripcion, dias=original.dias,
    ), actor, accion="DUPLICADA")


def _hash_aplicacion(plantilla_id: UUID, cedulas: list[str]) -> str:
    contenido = json.dumps(
        {"plantilla_id": str(plantilla_id), "cedulas": cedulas},
        sort_keys=True, separators=(",", ":"),
    )
    return hashlib.sha256(contenido.encode("utf-8")).hexdigest()


async def aplicar_plantilla(
    session: AsyncSession, plantilla_id: UUID, solicitud_id: UUID,
    cedulas: Iterable[str], actor: Usuario,
) -> AplicacionPlantillaRead:
    normalizadas = normalizar_lote(cedulas)
    payload_hash = _hash_aplicacion(plantilla_id, normalizadas)
    try:
        await session.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:clave, 0))"), {"clave": str(solicitud_id)})
        ledger = await session.get(OperacionIdempotente, (solicitud_id, TIPO_APLICACION))
        if ledger:
            if ledger.actor_usuario_id != actor.id or ledger.recurso_objetivo != str(plantilla_id) or ledger.payload_hash != payload_hash:
                raise RuntimeError("Conflicto de idempotencia")
            datos = dict(ledger.resultado)
            datos["idempotente"] = True
            return AplicacionPlantillaRead(**datos)

        await autorizar_lote(session, actor, normalizadas)

        plantilla = (await session.execute(select(NominaPlantillaHorario).where(
            NominaPlantillaHorario.id == plantilla_id,
            NominaPlantillaHorario.esta_activa.is_(True),
        ).with_for_update())).scalar_one_or_none()
        if plantilla is None:
            raise LookupError("Plantilla no encontrada")
        dias = await _dias(session, plantilla_id)
        validar_dias_plantilla(dias)
        minutos_por_dia = [
            minutos_jornada(
                dia.hora_entrada,
                dia.hora_salida,
                dia.minutos_almuerzo,
                dia.cruza_medianoche,
            )
            for dia in dias
        ]
        total_semanal = round(sum(minutos_por_dia) / 60.0, 2)
        minutos_ordinarios = next(
            (minutos for minutos in minutos_por_dia if minutos > 0), 480
        )
        horarios_padre = {
            cedula: await bloquear_horario_empleado(session, cedula)
            for cedula in normalizadas
        }

        ledger = OperacionIdempotente(
            solicitud_id=solicitud_id, tipo_operacion=TIPO_APLICACION,
            actor_usuario_id=actor.id, recurso_objetivo=str(plantilla_id),
            payload_hash=payload_hash, estado="EN_PROCESO",
        )
        aplicacion = NominaAplicacionPlantillaHorario(
            solicitud_id=solicitud_id, plantilla_id=plantilla.id,
            plantilla_version=plantilla.version, plantilla_nombre=plantilla.nombre,
            actor_usuario_id=actor.id, cantidad_empleados=len(normalizadas), estado="APLICADA",
        )
        session.add_all([ledger, aplicacion])
        await session.flush()
        aplicado = _snapshot_horario(dias)
        for cedula in normalizadas:
            anteriores = list((await session.execute(select(NominaHorarioPactadoDia).where(
                NominaHorarioPactadoDia.cedula == cedula
            ).order_by(NominaHorarioPactadoDia.dia_semana))).scalars().all())
            snapshot_anterior = _snapshot_horario(anteriores)
            padre = horarios_padre[cedula]
            padre.minutos_jornada_ordinaria = minutos_ordinarios
            padre.horas_semana_ordinaria = total_semanal
            padre.fuente_sincronizacion = "MANUAL"
            for dia in dias:
                valores = dict(
                    cedula=cedula, dia_semana=dia.dia_semana,
                    hora_entrada=dia.hora_entrada, hora_salida=dia.hora_salida,
                    minutos_almuerzo=dia.minutos_almuerzo,
                    cruza_medianoche=dia.cruza_medianoche,
                )
                await session.execute(pg_insert(NominaHorarioPactadoDia.__table__).values(**valores).on_conflict_do_update(
                    index_elements=["cedula", "dia_semana"], set_=valores,
                ))
            session.add(NominaAplicacionPlantillaEmpleado(
                aplicacion_id=aplicacion.id, empleado_cedula=cedula,
                snapshot_anterior=snapshot_anterior, snapshot_aplicado=aplicado,
                estado="APLICADA",
            ))
        resultado = AplicacionPlantillaRead(
            aplicacion_id=aplicacion.id, plantilla_id=plantilla.id,
            plantilla_version=plantilla.version,
            cantidad_empleados=len(normalizadas), estado="APLICADA",
        )
        ledger.estado = "FINALIZADA"
        ledger.resultado = resultado.model_dump(mode="json")
        ledger.finalizado_en = func.now()
        await session.commit()
        return resultado
    except Exception:
        await session.rollback()
        raise
