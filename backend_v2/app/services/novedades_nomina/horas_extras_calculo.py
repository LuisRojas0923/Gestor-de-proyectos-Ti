"""
Lógica PURA del cálculo de pre-liquidación de horas extras.

Sin acceso a DB. Recibe el catálogo y el factor prestacional como parámetros
para mantener la función testeable de forma aislada.

Reglas (CST Art. 161, Ley 2466/2025, Decreto 1295/1994):
  - Hora ordinaria: primeras 8h/día o 48h/semana (Ley 2101/2021).
  - Exceso = hora extra.
  - Jornada nocturna (22:00-06:00) infiere HEN si no se declara código.
  - Topes: 2h extras/día, 12h/semana, 480h/año.
  - Carga prestacional: factor por nivel ARL.
"""
from typing import List
from ...models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionInput,
    PreLiquidacionResultado,
    DetalleCalculoItem,
)


# ---------------------------------------------------------------------------
# Constantes legales
# ---------------------------------------------------------------------------

HORAS_ORDINARIAS_DIARIAS = 8  # Ley 2101/2021
HORAS_ORDINARIAS_SEMANALES = 48
DIVISOR_HORA_ORDINARIA = 240
MAX_HE_DIARIAS = 2
MAX_HE_SEMANALES = 12
MAX_HE_ANUALES = 480
HORA_NOCTURNA_INICIO = 22
HORA_NOCTURNA_FIN = 6


def calcular_pre_liquidacion(
    input_data: PreLiquidacionInput,
    catalogo: List[dict],
    factor_prestacional: float,
) -> PreLiquidacionResultado:
    """
    Lógica pura del cálculo de pre-liquidación.

    `catalogo` se inyecta para mantener la función testeable sin DB.
    Cada item: {codigo, factor_hora_ordinaria, acredita_bolsa, descuenta_bolsa, unidad}
    """
    advertencias: List[str] = []

    # Catálogo indexado por código
    cat_idx = {c["codigo"]: c for c in catalogo}

    valor_hora = input_data.salario_base_mensual / DIVISOR_HORA_ORDINARIA

    detalles: List[DetalleCalculoItem] = []
    horas_extras_total = 0.0

    codigos_por_dia = input_data.codigos_por_dia or [[] for _ in range(7)]

    for dia_idx, horas_dia in enumerate(input_data.horas_por_dia):
        horas_ordinarias_dia = min(horas_dia, HORAS_ORDINARIAS_DIARIAS)
        horas_extras_dia = max(0.0, horas_dia - HORAS_ORDINARIAS_DIARIAS)

        if horas_extras_dia <= 0:
            continue

        # Resolver factor: si el usuario reportó códigos, los respetamos;
        # si no, inferimos (HEN si jornada nocturna, HED en caso contrario).
        codigos = codigos_por_dia[dia_idx] if dia_idx < len(codigos_por_dia) else []
        if not codigos:
            codigos = ["HEN" if input_data.es_jornada_nocturna else "HED"]

        # Tope diario: 2h extras (Art. 161 CST)
        if horas_extras_dia > MAX_HE_DIARIAS:
            advertencias.append(
                f"Día {dia_idx + 1}: {horas_extras_dia}h extras exceden el tope diario de {MAX_HE_DIARIAS}h."
            )
            horas_extras_dia = MAX_HE_DIARIAS

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

    # Tope semanal
    if horas_extras_total > MAX_HE_SEMANALES:
        advertencias.append(
            f"Total semanal {horas_extras_total}h excede el tope de {MAX_HE_SEMANALES}h (Art. 161 CST)."
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
