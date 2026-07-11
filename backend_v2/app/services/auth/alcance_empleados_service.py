"""SSOT de normalizacion, relaciones y autorizacion por empleado ERP."""
import hashlib
import json
import re
from typing import Iterable
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.auth.relacion_gestor_empleado import (
    HistorialRelacionGestorEmpleado,
    RelacionGestorEmpleado,
)
from ...models.auth.schemas_alcance_empleados import (
    CambioRelacionesValidado,
    GestorAlcanceRead,
    RelacionesGestorResultado,
)
from ...models.auth.usuario import Usuario
from ...models.novedades_nomina.plantillas_horario import OperacionIdempotente
from ...models.novedades_nomina.horas_extras import NominaCalculoSemanal
from ...models.novedades_nomina.horas_extras_novedad_evento import NominaNovedadEvento

TIPO_OPERACION_RELACIONES = "RELACIONES_GESTOR_EMPLEADO"
_CEDULA_RE = re.compile(r"^[0-9]{1,50}$")


def normalizar_cedula(cedula: str) -> str:
    valor = str(cedula or "").strip().replace(".", "")
    if not _CEDULA_RE.fullmatch(valor):
        raise ValueError("cédula inválida")
    return valor


def usuario_tiene_bypass_alcance(usuario: Usuario) -> bool:
    return getattr(usuario, "rol", None) == "admin"


def normalizar_lote(cedulas: Iterable[str]) -> list[str]:
    resultado = sorted({normalizar_cedula(cedula) for cedula in cedulas})
    if len(resultado) > 200:
        raise ValueError("El lote no puede superar 200 cédulas")
    return resultado


def validar_cambio_relaciones(
    gestor_id: str,
    actor_id: str,
    actor_es_admin: bool,
    cedulas_agregar: Iterable[str],
    cedulas_quitar: Iterable[str],
) -> CambioRelacionesValidado:
    if not actor_es_admin and gestor_id == actor_id:
        raise PermissionError("No puede modificar su propio alcance")
    agregar = normalizar_lote(cedulas_agregar)
    quitar = normalizar_lote(cedulas_quitar)
    if set(agregar) & set(quitar):
        raise ValueError("Una cédula no puede aparecer en agregar y quitar")
    if len(set(agregar) | set(quitar)) > 200:
        raise ValueError("El lote no puede superar 200 cédulas")
    return CambioRelacionesValidado(
        gestor_id=gestor_id,
        cedulas_agregar=agregar,
        cedulas_quitar=quitar,
    )


async def cedulas_permitidas(
    session: AsyncSession, usuario: Usuario
) -> set[str] | None:
    if usuario_tiene_bypass_alcance(usuario):
        return None
    rows = (await session.execute(
        select(RelacionGestorEmpleado.empleado_cedula).where(
            RelacionGestorEmpleado.gestor_usuario_id == usuario.id,
            RelacionGestorEmpleado.esta_activa.is_(True),
        )
    )).scalars().all()
    return set(rows)


async def autorizar_cedula(
    session: AsyncSession, usuario: Usuario, cedula: str
) -> str:
    normalizada = normalizar_cedula(cedula)
    permitidas = await cedulas_permitidas(session, usuario)
    if permitidas is not None and normalizada not in permitidas:
        raise PermissionError("Empleado no encontrado")
    return normalizada


async def autorizar_lote(
    session: AsyncSession, usuario: Usuario, cedulas: Iterable[str]
) -> list[str]:
    normalizadas = normalizar_lote(cedulas)
    permitidas = await cedulas_permitidas(session, usuario)
    if permitidas is not None and not set(normalizadas).issubset(permitidas):
        raise PermissionError("Uno o más empleados no están disponibles")
    return normalizadas


async def autorizar_calculo_id(
    session: AsyncSession, usuario: Usuario, calculo_id: int
) -> str:
    cedula = await session.scalar(
        select(NominaCalculoSemanal.cedula).where(NominaCalculoSemanal.id == calculo_id)
    )
    if cedula is None:
        raise LookupError("Recurso no encontrado")
    try:
        return await autorizar_cedula(session, usuario, cedula)
    except (PermissionError, ValueError) as exc:
        raise LookupError("Recurso no encontrado") from exc


async def autorizar_novedad_id(
    session: AsyncSession, usuario: Usuario, novedad_id: int
) -> str:
    cedula = await session.scalar(
        select(NominaNovedadEvento.cedula).where(NominaNovedadEvento.id == novedad_id)
    )
    if cedula is None:
        raise LookupError("Recurso no encontrado")
    try:
        return await autorizar_cedula(session, usuario, cedula)
    except (PermissionError, ValueError) as exc:
        raise LookupError("Recurso no encontrado") from exc


async def tiene_relaciones_activas(session: AsyncSession, usuario: Usuario) -> bool:
    if usuario_tiene_bypass_alcance(usuario):
        return True
    total = await session.scalar(select(func.count()).select_from(RelacionGestorEmpleado).where(
        RelacionGestorEmpleado.gestor_usuario_id == usuario.id,
        RelacionGestorEmpleado.esta_activa.is_(True),
    ))
    return bool(total)


async def listar_gestores_alcance(
    session: AsyncSession,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[GestorAlcanceRead], int]:
    filtros = [Usuario.esta_activo.is_(True)]
    if q:
        filtros.append(Usuario.nombre.ilike(f"%{q.strip()}%"))
    total = int(
        await session.scalar(select(func.count()).select_from(Usuario).where(*filtros))
        or 0
    )
    conteos = (
        select(
            RelacionGestorEmpleado.gestor_usuario_id.label("gestor_id"),
            func.count().label("cantidad"),
        )
        .where(RelacionGestorEmpleado.esta_activa.is_(True))
        .group_by(RelacionGestorEmpleado.gestor_usuario_id)
        .subquery()
    )
    filas = (await session.execute(
        select(Usuario, func.coalesce(conteos.c.cantidad, 0))
        .outerjoin(conteos, conteos.c.gestor_id == Usuario.id)
        .where(*filtros)
        .order_by(Usuario.nombre, Usuario.id)
        .limit(limit)
        .offset(offset)
    )).all()
    return [
        GestorAlcanceRead(
            id=usuario.id,
            nombre=usuario.nombre,
            rol=usuario.rol,
            relaciones_activas=int(cantidad),
        )
        for usuario, cantidad in filas
    ], total


async def cedulas_relacionadas_gestor(
    session: AsyncSession, gestor_id: str
) -> set[str]:
    gestor = await session.get(Usuario, gestor_id)
    if gestor is None or not gestor.esta_activo:
        raise LookupError("Gestor no encontrado")
    filas = (await session.execute(
        select(RelacionGestorEmpleado.empleado_cedula).where(
            RelacionGestorEmpleado.gestor_usuario_id == gestor_id,
            RelacionGestorEmpleado.esta_activa.is_(True),
        )
    )).scalars().all()
    return set(filas)


def _hash_payload(gestor_id: str, agregar: list[str], quitar: list[str]) -> str:
    canonico = json.dumps(
        {"gestor_id": gestor_id, "agregar": agregar, "quitar": quitar},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonico.encode("utf-8")).hexdigest()


async def obtener_resultado_relaciones_idempotente(
    session: AsyncSession,
    solicitud_id: UUID,
    gestor_id: str,
    actor: Usuario,
    cedulas_agregar: Iterable[str],
    cedulas_quitar: Iterable[str],
) -> RelacionesGestorResultado | None:
    """Resuelve un replay antes de depender del ERP, o detecta su conflicto."""
    cambio = validar_cambio_relaciones(
        gestor_id,
        actor.id,
        usuario_tiene_bypass_alcance(actor),
        cedulas_agregar,
        cedulas_quitar,
    )
    objetivo = gestor_id.strip()
    payload_hash = _hash_payload(
        objetivo, cambio.cedulas_agregar, cambio.cedulas_quitar
    )
    ledger = await session.get(
        OperacionIdempotente, (solicitud_id, TIPO_OPERACION_RELACIONES)
    )
    if ledger is None:
        return None
    if (
        ledger.actor_usuario_id != actor.id
        or ledger.recurso_objetivo != objetivo
        or ledger.payload_hash != payload_hash
    ):
        raise RuntimeError("Conflicto de idempotencia")
    if ledger.estado != "FINALIZADA" or not ledger.resultado:
        raise RuntimeError("Operación idempotente incompleta")
    resultado = dict(ledger.resultado)
    resultado["idempotente"] = True
    return RelacionesGestorResultado(**resultado)


async def cambiar_relaciones(
    session: AsyncSession,
    solicitud_id: UUID,
    gestor_id: str,
    actor: Usuario,
    cedulas_agregar: Iterable[str],
    cedulas_quitar: Iterable[str],
) -> RelacionesGestorResultado:
    cambio = validar_cambio_relaciones(
        gestor_id, actor.id, usuario_tiene_bypass_alcance(actor),
        cedulas_agregar, cedulas_quitar,
    )
    objetivo = gestor_id.strip()
    payload_hash = _hash_payload(objetivo, cambio.cedulas_agregar, cambio.cedulas_quitar)
    try:
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:clave, 0))"),
            {"clave": f"solicitud:{solicitud_id}"},
        )
        ledger = await session.get(OperacionIdempotente, (solicitud_id, TIPO_OPERACION_RELACIONES))
        if ledger:
            if ledger.actor_usuario_id != actor.id or ledger.recurso_objetivo != objetivo or ledger.payload_hash != payload_hash:
                raise RuntimeError("Conflicto de idempotencia")
            resultado_guardado = dict(ledger.resultado)
            resultado_guardado["idempotente"] = True
            return RelacionesGestorResultado(**resultado_guardado)

        cedulas_objetivo = sorted(
            set(cambio.cedulas_agregar) | set(cambio.cedulas_quitar)
        )
        for cedula in cedulas_objetivo:
            await session.execute(
                text("SELECT pg_advisory_xact_lock(hashtextextended(:clave, 0))"),
                {"clave": f"relacion:{objetivo}:{cedula}"},
            )

        gestor = await session.get(Usuario, objetivo)
        if gestor is None or not gestor.esta_activo:
            raise LookupError("Gestor no encontrado")
        ledger = OperacionIdempotente(
            solicitud_id=solicitud_id, tipo_operacion=TIPO_OPERACION_RELACIONES,
            actor_usuario_id=actor.id, recurso_objetivo=objetivo,
            payload_hash=payload_hash, estado="EN_PROCESO",
        )
        session.add(ledger)
        resultado = RelacionesGestorResultado(gestor_id=objetivo)
        operaciones = {
            **{cedula: True for cedula in cambio.cedulas_agregar},
            **{cedula: False for cedula in cambio.cedulas_quitar},
        }
        for cedula in cedulas_objetivo:
            activar = operaciones[cedula]
            relacion = (await session.execute(select(RelacionGestorEmpleado).where(
                RelacionGestorEmpleado.gestor_usuario_id == objetivo,
                RelacionGestorEmpleado.empleado_cedula == cedula,
            ).with_for_update())).scalar_one_or_none()
            anterior = bool(relacion and relacion.esta_activa)
            if relacion is None and activar:
                relacion = RelacionGestorEmpleado(
                    gestor_usuario_id=objetivo, empleado_cedula=cedula, esta_activa=True,
                    creado_por_id=actor.id, actualizado_por_id=actor.id,
                )
                session.add(relacion)
                await session.flush()
                resultado.agregadas += 1
                accion = "ALTA"
            elif relacion is not None and anterior != activar:
                relacion.esta_activa = activar
                relacion.actualizado_por_id = actor.id
                relacion.actualizado_en = func.now()
                resultado.reactivadas += int(activar)
                resultado.desactivadas += int(not activar)
                accion = "REACTIVACION" if activar else "BAJA"
            else:
                resultado.sin_cambio += 1
                continue
            session.add(HistorialRelacionGestorEmpleado(
                relacion_id=relacion.id, actor_usuario_id=actor.id, accion=accion,
                estado_anterior=anterior, estado_nuevo=activar,
            ))
        await session.flush()
        ledger.estado = "FINALIZADA"
        ledger.resultado = resultado.model_dump()
        ledger.finalizado_en = func.now()
        await session.commit()
        return resultado
    except Exception:
        await session.rollback()
        raise
