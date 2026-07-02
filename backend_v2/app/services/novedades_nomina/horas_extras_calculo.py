"""
Lógica PURA del cálculo de pre-liquidación de horas extras.

Sin acceso a DB. Recibe el catálogo y el factor prestacional como parámetros
para mantener la función testeable de forma aislada.

Reglas confirmadas por Gestion Humana/Nomina:
  - Revision semanal de la jornada.
  - Desde 2026-07-16: 42h/semana y 210h/mes.
  - La compensacion entre dias aplica si la semana no supera la jornada ordinaria.
  - Jornada nocturna (19:00-06:00) infiere HEN si no se declara código.
  - Carga prestacional: factor por nivel ARL.
"""
from datetime import date
from typing import List, Optional
from ...models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionInput,
    PreLiquidacionResultado,
    DetalleCalculoItem,
)
from .horas_extras_parametros import ReglasCalculoHorasExtras


# ---------------------------------------------------------------------------
# Constantes legales
# ---------------------------------------------------------------------------

FECHA_VIGENCIA_JORNADA_42 = date(2026, 7, 16)
HORAS_ORDINARIAS_DIARIAS = 8
HORAS_ORDINARIAS_SEMANALES_PREVIAS = 44
HORAS_ORDINARIAS_SEMANALES_VIGENTE = 42
DIVISOR_HORA_ORDINARIA_PREVIO = 220
DIVISOR_HORA_ORDINARIA_VIGENTE = 210
HORAS_ORDINARIAS_SEMANALES = HORAS_ORDINARIAS_SEMANALES_VIGENTE
DIVISOR_HORA_ORDINARIA = DIVISOR_HORA_ORDINARIA_VIGENTE
MAX_HE_DIARIAS = 2
MAX_HE_SEMANALES = 12
MAX_HE_ANUALES = 480
HORA_NOCTURNA_INICIO = 19
HORA_NOCTURNA_FIN = 6


def calcular_pre_liquidacion(
    input_data: PreLiquidacionInput,
    catalogo: List[dict],
    factor_prestacional: float,
    reglas: Optional[ReglasCalculoHorasExtras] = None,
) -> PreLiquidacionResultado:
    """
    Lógica pura del cálculo de pre-liquidación.

    `catalogo` se inyecta para mantener la función testeable sin DB.
    Cada item: {codigo, factor_hora_ordinaria, acredita_bolsa, descuenta_bolsa, unidad}
    """
    advertencias: List[str] = []

    # Catálogo indexado por código
    cat_idx = {c["codigo"]: c for c in catalogo}

    reglas_calculo = reglas or _reglas_por_defecto()
    horas_ordinarias_semana, divisor_hora = _parametros_jornada_semana(
        input_data.anio,
        input_data.semana_iso,
        reglas_calculo,
    )
    valor_hora = input_data.salario_base_mensual / divisor_hora

    detalles: List[DetalleCalculoItem] = []
    horas_extras_total = 0.0

    codigos_por_dia = input_data.codigos_por_dia or [[] for _ in range(7)]

    horas_extras_por_dia = _calcular_horas_extras_semanales(
        input_data.horas_por_dia,
        horas_ordinarias_semana,
        reglas_calculo.horas_ordinarias_diarias,
    )

    for dia_idx, horas_extras_dia in enumerate(horas_extras_por_dia):

        if horas_extras_dia <= 0:
            continue

        # Resolver factor: si el usuario reportó códigos, los respetamos;
        # si no, inferimos (HEN si jornada nocturna, HED en caso contrario).
        codigos = codigos_por_dia[dia_idx] if dia_idx < len(codigos_por_dia) else []
        if not codigos:
            codigos = ["HEN" if input_data.es_jornada_nocturna else "HED"]

        # Tope diario: se advierte, pero no se trunca mientras Nomina confirma
        # si el portal debe bloquear, recortar o escalar la excepcion.
        if horas_extras_dia > reglas_calculo.max_he_diarias:
            advertencias.append(
                f"Día {dia_idx + 1}: {horas_extras_dia}h extras exceden el tope diario de {reglas_calculo.max_he_diarias}h."
            )

        # Reportar códigos inválidos ANTES de filtrar
        for codigo in codigos:
            if codigo not in cat_idx:
                advertencias.append(f"Día {dia_idx + 1}: código desconocido '{codigo}' omitido.")

        # Distribuir las horas extras entre los códigos declarados (válidos).
        horas_por_codigo = _distribuir_horas_por_codigos(
            horas_extras_dia, codigos, cat_idx
        )

        for codigo, horas_codigo in horas_por_codigo.items():
            if horas_codigo <= 0:
                continue
            cat = cat_idx[codigo]
            factor = cat["factor_hora_ordinaria"]
            valor_bruto = horas_codigo * valor_hora * factor
            carga = valor_bruto * factor_prestacional
            detalles.append(
                DetalleCalculoItem(
                    codigo_novedad=codigo,
                    horas=horas_codigo,
                    factor_hora_ordinaria=factor,
                    valor_bruto=valor_bruto,
                    carga_prestacional=carga,
                    costo_total=valor_bruto + carga,
                )
            )
            horas_extras_total += horas_codigo

    # Tope semanal: advertencia, no bloqueo automatico.
    if horas_extras_total > reglas_calculo.max_he_semanales:
        advertencias.append(
            f"Total semanal {horas_extras_total}h excede el tope de {reglas_calculo.max_he_semanales}h (Art. 161 CST)."
        )

    # Agregar (los detalles pueden traer mismo código de varios días)
    detalles_agg = _agregar_detalles(detalles)

    total_bruto = sum(d.valor_bruto for d in detalles_agg)
    total_carga = sum(d.carga_prestacional for d in detalles_agg)

    return PreLiquidacionResultado(
        cedula=input_data.cedula,
        anio=input_data.anio,
        semana_iso=input_data.semana_iso,
        nivel_riesgo_arl=input_data.nivel_riesgo_arl,
        factor_prestacional=factor_prestacional,
        salario_base_mensual=input_data.salario_base_mensual,
        valor_hora_ordinaria=valor_hora,
        total_horas_extras=sum(d.horas for d in detalles_agg),
        total_valor_bruto=total_bruto,
        total_carga_prestacional=total_carga,
        total_costo_empresa=total_bruto + total_carga,
        detalles=detalles_agg,
        advertencias=advertencias,
    )


def _parametros_jornada_semana(
    anio: int,
    semana_iso: int,
    reglas: Optional[ReglasCalculoHorasExtras] = None,
) -> tuple[float, float]:
    """Devuelve (horas ordinarias semana, divisor mensual) segun vigencia."""
    reglas_calculo = reglas or _reglas_por_defecto()
    fecha_inicio = date.fromisocalendar(anio, semana_iso, 1)
    if fecha_inicio >= reglas_calculo.fecha_vigencia_jornada_42:
        return reglas_calculo.horas_ordinarias_semanales_vigente, reglas_calculo.divisor_hora_ordinaria_vigente
    return reglas_calculo.horas_ordinarias_semanales_previas, reglas_calculo.divisor_hora_ordinaria_previo


def _reglas_por_defecto() -> ReglasCalculoHorasExtras:
    return ReglasCalculoHorasExtras(
        fecha_vigencia_jornada_42=FECHA_VIGENCIA_JORNADA_42,
        horas_ordinarias_semanales_previas=HORAS_ORDINARIAS_SEMANALES_PREVIAS,
        horas_ordinarias_semanales_vigente=HORAS_ORDINARIAS_SEMANALES_VIGENTE,
        divisor_hora_ordinaria_previo=DIVISOR_HORA_ORDINARIA_PREVIO,
        divisor_hora_ordinaria_vigente=DIVISOR_HORA_ORDINARIA_VIGENTE,
        horas_ordinarias_diarias=HORAS_ORDINARIAS_DIARIAS,
        max_he_diarias=MAX_HE_DIARIAS,
        max_he_semanales=MAX_HE_SEMANALES,
        max_he_anuales=MAX_HE_ANUALES,
        hora_nocturna_inicio=HORA_NOCTURNA_INICIO,
        hora_nocturna_fin=HORA_NOCTURNA_FIN,
    )


def _calcular_horas_extras_semanales(
    horas_por_dia: List[float],
    horas_ordinarias_semana: float,
    horas_ordinarias_diarias: float = HORAS_ORDINARIAS_DIARIAS,
) -> List[float]:
    """Compensa dias dentro de la semana y devuelve HE por dia."""
    total_trabajado = sum(horas_por_dia)
    pendientes = max(0.0, round(total_trabajado - horas_ordinarias_semana, 2))
    extras = [0.0 for _ in horas_por_dia]
    if pendientes <= 0:
        return extras

    # Primero asignar excesos sobre la referencia diaria historica de 8h.
    for idx, horas_dia in enumerate(horas_por_dia):
        if pendientes <= 0:
            break
        capacidad = max(0.0, horas_dia - horas_ordinarias_diarias)
        tomar = min(capacidad, pendientes)
        extras[idx] = round(extras[idx] + tomar, 2)
        pendientes = round(pendientes - tomar, 2)

    # Si la semana supera 42h/44h sin exceder 8h en un dia, asignar el resto
    # a los ultimos dias trabajados para conservar trazabilidad por dia/codigo.
    for idx in range(len(horas_por_dia) - 1, -1, -1):
        if pendientes <= 0:
            break
        capacidad = max(0.0, horas_por_dia[idx] - extras[idx])
        tomar = min(capacidad, pendientes)
        extras[idx] = round(extras[idx] + tomar, 2)
        pendientes = round(pendientes - tomar, 2)

    return extras


def _distribuir_horas_por_codigos(
    horas_extras: float,
    codigos: List[str],
    catalogo: dict,
) -> dict:
    """
    Distribuye las horas extras de un día entre los códigos declarados.
    Si solo hay un código válido, se lleva todo. Si hay varios, se reparten
    en partes iguales.

    Los códigos inválidos se excluyen del resultado pero SÍ cuentan para
    el divisor, de modo que el usuario ve reflejado que declaró un código
    desconocido.
    """
    if not codigos:
        return {}
    codigos_validos = [c for c in codigos if c in catalogo]
    if not codigos_validos:
        return {}
    if len(codigos_validos) == 1:
        return {codigos_validos[0]: horas_extras}
    por_codigo = horas_extras / len(codigos_validos)
    return {c: por_codigo for c in codigos_validos}


def _agregar_detalles(detalles: List[DetalleCalculoItem]) -> List[DetalleCalculoItem]:
    """Agrupa detalles por código sumando horas, valor_bruto, carga."""
    if not detalles:
        return []
    agg: dict = {}
    for d in detalles:
        if d.codigo_novedad not in agg:
            agg[d.codigo_novedad] = DetalleCalculoItem(
                codigo_novedad=d.codigo_novedad,
                horas=0.0,
                factor_hora_ordinaria=d.factor_hora_ordinaria,
                valor_bruto=0.0,
                carga_prestacional=0.0,
                costo_total=0.0,
            )
        a = agg[d.codigo_novedad]
        a.horas += d.horas
        a.valor_bruto += d.valor_bruto
        a.carga_prestacional += d.carga_prestacional
        a.costo_total += d.costo_total
    return list(agg.values())
