"""Parámetros editables de reglas de cálculo de horas extras."""
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Dict, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras import NominaParametroLegal
from ...models.novedades_nomina.schemas_horas_extras import (
    ParametroCalculoRead,
    ParametrosCalculoRead,
    ParametrosCalculoUpdateRequest,
)


@dataclass(frozen=True)
class DefinicionParametroCalculo:
    codigo: str
    nombre: str
    valor: str
    tipo_dato: str
    norma_soporte: str
    grupo: str


@dataclass(frozen=True)
class ReglasCalculoHorasExtras:
    fecha_vigencia_jornada_42: date
    horas_ordinarias_semanales_previas: float
    horas_ordinarias_semanales_vigente: float
    divisor_hora_ordinaria_previo: float
    divisor_hora_ordinaria_vigente: float
    horas_ordinarias_diarias: float
    max_he_diarias: float
    max_he_semanales: float
    max_he_anuales: float
    hora_nocturna_inicio: int
    hora_nocturna_fin: int


DEFINICIONES_PARAMETROS_CALCULO: List[DefinicionParametroCalculo] = [
    DefinicionParametroCalculo("FECHA_VIGENCIA_JORNADA_42", "Fecha inicio jornada 42h", "2026-07-16", "FECHA", "Ley 2101/2021 y confirmación GH", "Jornada semanal"),
    DefinicionParametroCalculo("HORAS_ORDINARIAS_SEMANALES_PREVIAS", "Horas semanales antes de vigencia", "44", "NUMERICO", "Confirmación GH/Nómina", "Jornada semanal"),
    DefinicionParametroCalculo("HORAS_ORDINARIAS_SEMANALES_VIGENTE", "Horas semanales vigentes", "42", "NUMERICO", "Ley 2101/2021 y confirmación GH", "Jornada semanal"),
    DefinicionParametroCalculo("DIVISOR_HORA_ORDINARIA_PREVIO", "Divisor mensual anterior", "220", "NUMERICO", "Confirmación GH/Nómina", "Valor hora"),
    DefinicionParametroCalculo("DIVISOR_HORA_ORDINARIA_VIGENTE", "Divisor mensual vigente", "210", "NUMERICO", "Confirmación GH/Nómina", "Valor hora"),
    DefinicionParametroCalculo("HORAS_ORDINARIAS_DIARIAS", "Referencia diaria ordinaria", "8", "NUMERICO", "CST Art. 161", "Topes"),
    DefinicionParametroCalculo("MAX_HE_DIARIAS", "Máximo de horas extras diarias", "2", "NUMERICO", "CST Art. 161", "Topes"),
    DefinicionParametroCalculo("MAX_HE_SEMANALES", "Máximo de horas extras semanales", "12", "NUMERICO", "CST Art. 161", "Topes"),
    DefinicionParametroCalculo("MAX_HE_ANUALES", "Máximo de horas extras anuales", "480", "NUMERICO", "CST Art. 161", "Topes"),
    DefinicionParametroCalculo("HORA_NOCTURNA_INICIO", "Inicio jornada nocturna", "19:00", "HORA", "Confirmación GH/Nómina", "Jornada nocturna"),
    DefinicionParametroCalculo("HORA_NOCTURNA_FIN", "Fin jornada nocturna", "06:00", "HORA", "Confirmación GH/Nómina", "Jornada nocturna"),
]

CODIGOS_PARAMETROS_CALCULO = [d.codigo for d in DEFINICIONES_PARAMETROS_CALCULO]


async def listar_parametros_calculo(session: AsyncSession) -> ParametrosCalculoRead:
    existentes = await _parametros_db(session)
    return ParametrosCalculoRead(
        parametros=[_to_read(definicion, existentes.get(definicion.codigo)) for definicion in DEFINICIONES_PARAMETROS_CALCULO]
    )


async def actualizar_parametros_calculo(
    session: AsyncSession,
    payload: ParametrosCalculoUpdateRequest,
    usuario_id: str,
) -> ParametrosCalculoRead:
    definiciones = {d.codigo: d for d in DEFINICIONES_PARAMETROS_CALCULO}
    existentes = await _parametros_db(session)
    hoy = date.today()

    for item in payload.parametros:
        definicion = definiciones.get(item.codigo)
        if definicion is None:
            raise ValueError(f"Parámetro no editable: {item.codigo}")
        _validar_valor(definicion, item.valor)
        parametro = existentes.get(item.codigo)
        if parametro is None:
            parametro = NominaParametroLegal(codigo=item.codigo, vigente_desde=hoy)
        parametro.nombre = definicion.nombre
        parametro.valor = item.valor.strip()
        parametro.tipo_dato = definicion.tipo_dato
        parametro.norma_soporte = definicion.norma_soporte
        parametro.vigente_hasta = None
        parametro.estado = "VIGENTE"
        parametro.observaciones = item.observaciones or f"Actualizado por {usuario_id}"
        session.add(parametro)

    await session.commit()
    return await listar_parametros_calculo(session)


async def obtener_reglas_calculo(session: AsyncSession) -> ReglasCalculoHorasExtras:
    parametros = await listar_parametros_calculo(session)
    valores = {p.codigo: p.valor for p in parametros.parametros}
    return ReglasCalculoHorasExtras(
        fecha_vigencia_jornada_42=_parse_fecha(valores["FECHA_VIGENCIA_JORNADA_42"]),
        horas_ordinarias_semanales_previas=float(valores["HORAS_ORDINARIAS_SEMANALES_PREVIAS"]),
        horas_ordinarias_semanales_vigente=float(valores["HORAS_ORDINARIAS_SEMANALES_VIGENTE"]),
        divisor_hora_ordinaria_previo=float(valores["DIVISOR_HORA_ORDINARIA_PREVIO"]),
        divisor_hora_ordinaria_vigente=float(valores["DIVISOR_HORA_ORDINARIA_VIGENTE"]),
        horas_ordinarias_diarias=float(valores["HORAS_ORDINARIAS_DIARIAS"]),
        max_he_diarias=float(valores["MAX_HE_DIARIAS"]),
        max_he_semanales=float(valores["MAX_HE_SEMANALES"]),
        max_he_anuales=float(valores["MAX_HE_ANUALES"]),
        hora_nocturna_inicio=_parse_hora(valores["HORA_NOCTURNA_INICIO"]).hour,
        hora_nocturna_fin=_parse_hora(valores["HORA_NOCTURNA_FIN"]).hour,
    )


async def _parametros_db(session: AsyncSession) -> Dict[str, NominaParametroLegal]:
    result = await session.execute(
        select(NominaParametroLegal).where(NominaParametroLegal.codigo.in_(CODIGOS_PARAMETROS_CALCULO))
    )
    return {p.codigo: p for p in result.scalars().all()}


def _to_read(
    definicion: DefinicionParametroCalculo,
    parametro: NominaParametroLegal | None,
) -> ParametroCalculoRead:
    return ParametroCalculoRead(
        codigo=definicion.codigo,
        nombre=parametro.nombre if parametro else definicion.nombre,
        valor=parametro.valor if parametro else definicion.valor,
        tipo_dato=parametro.tipo_dato if parametro else definicion.tipo_dato,
        norma_soporte=parametro.norma_soporte if parametro else definicion.norma_soporte,
        grupo=definicion.grupo,
        editable=True,
        vigente_desde=parametro.vigente_desde if parametro else date.today(),
        vigente_hasta=parametro.vigente_hasta if parametro else None,
        observaciones=parametro.observaciones if parametro else None,
    )


def _validar_valor(definicion: DefinicionParametroCalculo, valor: str) -> None:
    limpio = valor.strip()
    if definicion.tipo_dato == "NUMERICO":
        numero = float(limpio)
        if numero < 0:
            raise ValueError(f"{definicion.codigo} no puede ser negativo")
    elif definicion.tipo_dato == "FECHA":
        _parse_fecha(limpio)
    elif definicion.tipo_dato == "HORA":
        _parse_hora(limpio)


def _parse_fecha(valor: str) -> date:
    return datetime.strptime(valor, "%Y-%m-%d").date()


def _parse_hora(valor: str) -> time:
    return datetime.strptime(valor, "%H:%M").time()
