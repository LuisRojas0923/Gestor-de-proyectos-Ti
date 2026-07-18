"""Clasificacion diaria compartida por el planificador semanal."""
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras_novedad_evento import (
    NominaNovedadEvento,
)

from ._planificador_common import (
    CODIGOS_NOVEDAD_SUPRESION_PLAN,
    _horas_trabajadas_dia,
)
from .festivos_service import listar_festivos
from .horas_extras_calculo import _calcular_horas_extras_semanales


@dataclass(frozen=True)
class ConceptoDiaPlan:
    codigo: str
    horas: float


@dataclass(frozen=True)
class ClasificacionDiaPlan:
    dia_semana: int
    fecha: date
    dia: Any | None
    horas_trabajadas: float
    horas_ordinarias: float
    horas_extras: float
    codigos_novedad: tuple[str, ...]
    es_festivo: bool
    conceptos: tuple[ConceptoDiaPlan, ...]


def fechas_semana_iso(semana) -> tuple[date, date]:
    inicio = date.fromisocalendar(semana.anio, semana.semana_iso, 1)
    fin = inicio + timedelta(days=6)
    if semana.fecha_inicio != inicio or semana.fecha_fin != fin:
        raise ValueError("Las fechas no corresponden al año y semana ISO indicados")
    return inicio, fin


async def cargar_festivos_semana(
    session: AsyncSession,
    semana,
) -> frozenset[date]:
    """Carga una instantanea del calendario para todos los años de la semana."""
    inicio, fin = fechas_semana_iso(semana)
    anios = {inicio.year, fin.year}
    festivos: set[date] = set()
    for anio in sorted(anios):
        calendario = await listar_festivos(session, anio, fuente="auto")
        festivos.update(item["fecha"] for item in calendario)
    return frozenset(fecha for fecha in festivos if inicio <= fecha <= fin)


async def cargar_novedades_confirmadas_semana(
    session: AsyncSession,
    cedula: str,
    semana,
) -> dict[date, tuple[str, ...]]:
    """Indexa por fecha solo novedades oficiales confirmadas."""
    inicio, fin = fechas_semana_iso(semana)
    eventos = (await session.execute(
        select(NominaNovedadEvento).where(
            NominaNovedadEvento.cedula == cedula,
            NominaNovedadEvento.estado == "CONFIRMADO",
            NominaNovedadEvento.fecha_inicio <= fin,
            NominaNovedadEvento.fecha_fin >= inicio,
        )
    )).scalars().all()
    por_fecha: dict[date, list[str]] = {}
    for evento in eventos:
        desde = max(inicio, evento.fecha_inicio)
        hasta = min(fin, evento.fecha_fin)
        for desplazamiento in range((hasta - desde).days + 1):
            fecha = desde + timedelta(days=desplazamiento)
            por_fecha.setdefault(fecha, []).append(evento.codigo_novedad)
    return {
        fecha: tuple(dict.fromkeys(codigos))
        for fecha, codigos in por_fecha.items()
    }


def clasificar_dias_plan(
    emp_in,
    semana,
    *,
    festivos: frozenset[date],
    horas_semana_ordinaria: float,
    horas_ordinarias_diarias: float,
    jornada_nocturna: bool,
    novedades_confirmadas: dict[date, tuple[str, ...]] | None = None,
) -> list[ClasificacionDiaPlan]:
    """Calcula horas y conceptos por día sin consultar DB ni mutar el payload."""
    inicio, _ = fechas_semana_iso(semana)
    dias_idx = {dia.dia_semana: dia for dia in emp_in.dias}
    datos: list[tuple[int, date, Any | None, float, tuple[str, ...], bool]] = []

    for dia_semana in range(1, 8):
        fecha = inicio + timedelta(days=dia_semana - 1)
        dia = dias_idx.get(dia_semana)
        codigos = (
            novedades_confirmadas.get(fecha, ())
            if novedades_confirmadas is not None
            else tuple(n.codigo_novedad for n in dia.novedades) if dia else ()
        )
        horas = 0.0
        if dia is not None:
            horas = _horas_trabajadas_dia(
                dia.hora_entrada,
                dia.hora_salida,
                dia.minutos_almuerzo,
                dia.cruza_medianoche,
            )
        if any(codigo in CODIGOS_NOVEDAD_SUPRESION_PLAN for codigo in codigos):
            horas = 0.0
        datos.append((dia_semana, fecha, dia, horas, codigos, fecha in festivos))

    extras = _calcular_horas_extras_semanales(
        [dato[3] for dato in datos],
        horas_semana_ordinaria,
        horas_ordinarias_diarias,
    )
    resultado: list[ClasificacionDiaPlan] = []
    for idx, (dia_semana, fecha, dia, horas, codigos, es_festivo) in enumerate(datos):
        horas_extra = round(float(extras[idx]), 2)
        horas_ordinarias = round(max(0.0, horas - horas_extra), 2)
        conceptos: list[ConceptoDiaPlan] = []
        suprimido = any(codigo in CODIGOS_NOVEDAD_SUPRESION_PLAN for codigo in codigos)
        if not suprimido:
            if es_festivo and horas_ordinarias > 0:
                conceptos.append(ConceptoDiaPlan("HF", horas_ordinarias))
            if horas_extra > 0:
                if es_festivo:
                    codigo_extra = "HEFN" if jornada_nocturna else "HEFD"
                else:
                    codigo_extra = "HEN" if jornada_nocturna else "HED"
                conceptos.append(ConceptoDiaPlan(codigo_extra, horas_extra))
        resultado.append(ClasificacionDiaPlan(
            dia_semana=dia_semana,
            fecha=fecha,
            dia=dia,
            horas_trabajadas=round(float(horas), 2),
            horas_ordinarias=horas_ordinarias,
            horas_extras=horas_extra,
            codigos_novedad=codigos,
            es_festivo=es_festivo,
            conceptos=tuple(conceptos),
        ))
    return resultado
