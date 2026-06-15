"""
Tests unitarios del Sprint S1 — Service layer y pre-liquidación.

Cobertura:
  - calcular_pre_liquidacion (función pura, sin DB)
    * jornada normal con HE
    * jornada nocturna (HEN automático)
    * múltiples códigos por día
    * topes legales (2h/día, 12h/semana)
    * códigos desconocidos se omiten con advertencia
    * carga prestacional por nivel ARL
  - Distribución equitativa de horas por código
  - Agregación de detalles
  - Validador de input (7 elementos)
"""
import pytest
from pydantic import ValidationError
from app.models.novedades_nomina.schemas_horas_extras import PreLiquidacionInput
from app.services.novedades_nomina.horas_extras_service import (
    calcular_pre_liquidacion,
    _distribuir_horas_por_codigos,
    _agregar_detalles,
    HORAS_ORDINARIAS_DIARIAS,
    DIVISOR_HORA_ORDINARIA,
    MAX_HE_DIARIAS,
    MAX_HE_SEMANALES,
)


# ---------------------------------------------------------------------------
# Catálogo de prueba (subset del real, con factores que cumplen la ley)
# ---------------------------------------------------------------------------

CATALOGO_TEST = [
    {"codigo": "HED", "factor_hora_ordinaria": 1.25, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    {"codigo": "HEN", "factor_hora_ordinaria": 1.75, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    {"codigo": "HEFD", "factor_hora_ordinaria": 2.05, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    {"codigo": "HEFN", "factor_hora_ordinaria": 2.55, "acredita_bolsa": True, "descuenta_bolsa": True, "unidad": "HORAS"},
    {"codigo": "HF", "factor_hora_ordinaria": 1.80, "acredita_bolsa": True, "descuenta_bolsa": False, "unidad": "HORAS"},
    {"codigo": "VAC", "factor_hora_ordinaria": 1.0, "acredita_bolsa": False, "descuenta_bolsa": False, "unidad": "DIAS"},
]

FACTOR_OP = 0.52436   # ~52.4% nivel III (Operativo)
FACTOR_ADM = 0.51044  # ~51% nivel II (Administrativo)
FACTOR_DIR = 0.50522  # ~50.5% nivel I (Dirección)


def _input(horas_por_dia, **overrides):
    """Helper para construir inputs válidos de pre-liquidación."""
    base = {
        "cedula": "1234567890",
        "anio": 2026,
        "semana_iso": 25,
        "horas_por_dia": horas_por_dia,
        "salario_base_mensual": 3_000_000,
        "nivel_riesgo_arl": "III",
    }
    base.update(overrides)
    return PreLiquidacionInput(**base)


# ---------------------------------------------------------------------------
# Cálculo básico
# ---------------------------------------------------------------------------

class TestCalculoBasico:
    def test_sin_horas_extras_total_cero(self):
        """Jornada exacta de 8h/día no genera extras."""
        horas = [8.0] * 7
        r = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_OP)
        assert r.total_horas_extras == 0.0
        assert r.total_valor_bruto == 0.0
        assert r.detalles == []
        assert r.advertencias == []

    def test_jornada_normal_con_1h_extra_cada_dia(self):
        """8h ordinarias + 1h extra diurna por día, 7 días."""
        horas = [9.0] * 7
        r = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_OP)

        # 1h * 7 días = 7h extras
        assert r.total_horas_extras == 7.0

        # valor_hora = 3_000_000 / 240 = 12_500
        # HED = 1.25, valor_bruto = 7 * 12500 * 1.25 = 109_375
        assert r.valor_hora_ordinaria == 12_500
        assert r.total_valor_bruto == pytest.approx(7 * 12_500 * 1.25, rel=1e-6)
        # carga = valor_bruto * 0.52436
        assert r.total_carga_prestacional == pytest.approx(
            r.total_valor_bruto * FACTOR_OP, rel=1e-6
        )
        assert r.total_costo_empresa == pytest.approx(
            r.total_valor_bruto * (1 + FACTOR_OP), rel=1e-6
        )

    def test_inferencia_HEN_cuando_jornada_nocturna(self):
        """Si es_jornada_nocturna=True y no se declaran códigos, se asume HEN (1.75)."""
        horas = [9.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0]  # 1h extra el lunes
        r = calcular_pre_liquidacion(
            _input(horas, es_jornada_nocturna=True), CATALOGO_TEST, FACTOR_OP
        )
        # Debe usar HEN (1.75) en lugar de HED (1.25)
        assert r.total_horas_extras == 1.0
        assert r.detalles[0].codigo_novedad == "HEN"
        assert r.detalles[0].factor_hora_ordinaria == 1.75

    def test_codigos_explicitos_se_respetan(self):
        """Si el usuario declara HED explícitamente en jornada nocturna, se respeta HED."""
        horas = [9.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0]
        codigos = [["HED"], [], [], [], [], [], []]
        r = calcular_pre_liquidacion(
            _input(horas, codigos_por_dia=codigos, es_jornada_nocturna=True),
            CATALOGO_TEST,
            FACTOR_OP,
        )
        assert r.detalles[0].codigo_novedad == "HED"

    def test_dia_sin_horas_extras_se_omite(self):
        """Un día con 6h (menos de 8h) no genera extras."""
        horas = [8.0, 8.0, 8.0, 6.0, 8.0, 8.0, 8.0]
        r = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_OP)
        assert r.total_horas_extras == 0.0

    def test_dia_con_10h_genera_2h_extras(self):
        """10h trabajadas = 8 ordinarias + 2 extras."""
        horas = [10.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0]
        r = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_OP)
        assert r.total_horas_extras == 2.0


# ---------------------------------------------------------------------------
# Topes legales
# ---------------------------------------------------------------------------

class TestTopesLegales:
    def test_tope_diario_2h_genera_advertencia(self):
        """Si un día tiene >2h extras, se trunca a 2h y se advierte."""
        horas = [11.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0]  # 3h extras el lunes
        r = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_OP)
        assert r.total_horas_extras == 2.0  # truncado
        assert any("tope diario" in a for a in r.advertencias)

    def test_tope_semanal_12h_genera_advertencia(self):
        """Si la suma semanal >12h, se genera advertencia (no se trunca)."""
        horas = [9.0] * 7  # 7h extras (no excede)
        r = calcular_pre_liquidacion(_input(horas), CATALOGO_TEST, FACTOR_OP)
        assert r.total_horas_extras == 7.0
        assert not any("Total semanal" in a for a in r.advertencias)

        # 7 días * 2h = 14h excede 12h semanal
        horas_13 = [10.0] * 7
        r2 = calcular_pre_liquidacion(_input(horas_13), CATALOGO_TEST, FACTOR_OP)
        assert r2.total_horas_extras == 14.0
        assert any("Total semanal" in a and "12h" in a for a in r2.advertencias)


# ---------------------------------------------------------------------------
# Códigos múltiples y desconocidos
# ---------------------------------------------------------------------------

class TestMultiplesCodigos:
    def test_multiples_codigos_reparten_horas(self):
        """Si un día tiene [HED, HEN], las horas se reparten 50/50."""
        horas = [10.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0]  # 2h extras el lunes
        codigos = [["HED", "HEN"], [], [], [], [], [], []]
        r = calcular_pre_liquidacion(
            _input(horas, codigos_por_dia=codigos), CATALOGO_TEST, FACTOR_OP
        )
        # 2h / 2 = 1h a cada uno
        assert len(r.detalles) == 2
        horas_por_codigo = {d.codigo_novedad: d.horas for d in r.detalles}
        assert horas_por_codigo["HED"] == pytest.approx(1.0)
        assert horas_por_codigo["HEN"] == pytest.approx(1.0)

    def test_codigo_desconocido_genera_advertencia(self):
        """Códigos fuera del catálogo no fallan; se omiten con warning."""
        horas = [9.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0]
        codigos = [["INVENTADO"], [], [], [], [], [], []]
        r = calcular_pre_liquidacion(
            _input(horas, codigos_por_dia=codigos), CATALOGO_TEST, FACTOR_OP
        )
        assert r.total_horas_extras == 0.0  # el código no se contó
        assert any("INVENTADO" in a for a in r.advertencias)

    def test_codigos_mixtos_validos_e_invalidos(self):
        """Si se pasa un código válido y uno inválido, el válido toma todas las horas
        (porque es el único válido) y se advierte sobre el inválido."""
        horas = [10.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0]
        codigos = [["HED", "INVENTADO"], [], [], [], [], [], []]
        r = calcular_pre_liquidacion(
            _input(horas, codigos_por_dia=codigos), CATALOGO_TEST, FACTOR_OP
        )
        # Como solo HED es válido, recibe las 2h
        assert any(d.codigo_novedad == "HED" and d.horas == 2.0 for d in r.detalles)
        # Y debe haber advertencia sobre INVENTADO
        assert any("INVENTADO" in a for a in r.advertencias)


# ---------------------------------------------------------------------------
# Carga prestacional por nivel ARL
# ---------------------------------------------------------------------------

class TestCargaPrestacional:
    def test_nivel_operativo_III(self):
        horas = [9.0] * 7
        r = calcular_pre_liquidacion(_input(horas, nivel_riesgo_arl="III"), CATALOGO_TEST, FACTOR_OP)
        assert r.factor_prestacional == FACTOR_OP
        assert r.total_carga_prestacional == pytest.approx(
            r.total_valor_bruto * 0.52436, rel=1e-6
        )

    def test_nivel_direccion_I_menor_carga(self):
        """Nivel I (Dirección) debe tener menor carga prestacional que nivel III."""
        horas = [9.0] * 7
        r_op = calcular_pre_liquidacion(_input(horas, nivel_riesgo_arl="III"), CATALOGO_TEST, FACTOR_OP)
        r_dir = calcular_pre_liquidacion(_input(horas, nivel_riesgo_arl="I"), CATALOGO_TEST, FACTOR_DIR)
        assert r_dir.factor_prestacional < r_op.factor_prestacional
        assert r_dir.total_carga_prestacional < r_op.total_carga_prestacional

    def test_nivel_operativo_V_mayor_carga(self):
        """Nivel V debe tener la mayor carga prestacional."""
        horas = [9.0] * 7
        r_v = calcular_pre_liquidacion(_input(horas, nivel_riesgo_arl="V"), CATALOGO_TEST, 0.56960)
        r_i = calcular_pre_liquidacion(_input(horas, nivel_riesgo_arl="I"), CATALOGO_TEST, FACTOR_DIR)
        assert r_v.total_carga_prestacional > r_i.total_carga_prestacional


# ---------------------------------------------------------------------------
# Distribución de horas
# ---------------------------------------------------------------------------

class TestDistribucionHoras:
    def test_un_solo_codigo_toma_todo(self):
        cat = {"HED": {"factor_hora_ordinaria": 1.25}}
        result = _distribuir_horas_por_codigos(2.0, ["HED"], cat)
        assert result == {"HED": 2.0}

    def test_dos_codigos_reparten_50_50(self):
        cat = {"HED": {}, "HEN": {}}
        result = _distribuir_horas_por_codigos(2.0, ["HED", "HEN"], cat)
        assert result == {"HED": 1.0, "HEN": 1.0}

    def test_codigos_invalidos_se_ignoran(self):
        cat = {"HED": {}}
        result = _distribuir_horas_por_codigos(2.0, ["HED", "INVALIDO"], cat)
        assert result == {"HED": 2.0}

    def test_solo_codigos_invalidos_retorna_vacio(self):
        cat = {"HED": {}}
        result = _distribuir_horas_por_codigos(2.0, ["INVALIDO1", "INVALIDO2"], cat)
        assert result == {}


# ---------------------------------------------------------------------------
# Agregación de detalles
# ---------------------------------------------------------------------------

class TestAgregarDetalles:
    def test_agrega_por_codigo(self):
        from app.models.novedades_nomina.schemas_horas_extras import DetalleCalculoItem
        detalles = [
            DetalleCalculoItem(codigo_novedad="HED", horas=1.0, factor_hora_ordinaria=1.25,
                               valor_bruto=15_625, carga_prestacional=8_193.12, costo_total=23_818.12),
            DetalleCalculoItem(codigo_novedad="HED", horas=2.0, factor_hora_ordinaria=1.25,
                               valor_bruto=31_250, carga_prestacional=16_386.25, costo_total=47_636.25),
            DetalleCalculoItem(codigo_novedad="HEN", horas=1.0, factor_hora_ordinaria=1.75,
                               valor_bruto=21_875, carga_prestacional=11_473.38, costo_total=33_348.38),
        ]
        agg = _agregar_detalles(detalles)
        assert len(agg) == 2
        agg_idx = {d.codigo_novedad: d for d in agg}
        assert agg_idx["HED"].horas == 3.0
        assert agg_idx["HED"].valor_bruto == pytest.approx(46_875, rel=1e-6)
        assert agg_idx["HEN"].horas == 1.0

    def test_lista_vacia_retorna_vacio(self):
        assert _agregar_detalles([]) == []


# ---------------------------------------------------------------------------
# Validador de input
# ---------------------------------------------------------------------------

class TestValidacionInput:
    def test_horas_por_dia_debe_tener_7_elementos(self):
        with pytest.raises(ValidationError):
            PreLiquidacionInput(
                cedula="123", anio=2026, semana_iso=25,
                horas_por_dia=[8.0] * 6,  # solo 6
                salario_base_mensual=2_000_000, nivel_riesgo_arl="III",
            )

    def test_nivel_arl_debe_ser_valido(self):
        with pytest.raises(ValidationError):
            PreLiquidacionInput(
                cedula="123", anio=2026, semana_iso=25,
                horas_por_dia=[8.0] * 7,
                salario_base_mensual=2_000_000, nivel_riesgo_arl="IX",  # inválido
            )

    def test_salario_debe_ser_positivo(self):
        with pytest.raises(ValidationError):
            PreLiquidacionInput(
                cedula="123", anio=2026, semana_iso=25,
                horas_por_dia=[8.0] * 7,
                salario_base_mensual=0, nivel_riesgo_arl="III",
            )

    def test_semana_iso_rango_valido(self):
        with pytest.raises(ValidationError):
            PreLiquidacionInput(
                cedula="123", anio=2026, semana_iso=54,  # inválido
                horas_por_dia=[8.0] * 7,
                salario_base_mensual=2_000_000, nivel_riesgo_arl="III",
            )


# ---------------------------------------------------------------------------
# Constantes del módulo
# ---------------------------------------------------------------------------

class TestConstantes:
    def test_jornada_diaria_8_horas(self):
        assert HORAS_ORDINARIAS_DIARIAS == 8

    def test_divisor_hora_ordinaria(self):
        """CST Art. 144: salario mensual / 30 / 8 = / 240."""
        assert DIVISOR_HORA_ORDINARIA == 240

    def test_tope_diario_2_horas(self):
        """CST Art. 161: máximo 2 horas extras diarias."""
        assert MAX_HE_DIARIAS == 2

    def test_tope_semanal_12_horas(self):
        """CST Art. 161: máximo 12 horas extras semanales."""
        assert MAX_HE_SEMANALES == 12
