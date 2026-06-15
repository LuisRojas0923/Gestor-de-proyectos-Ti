"""
Tests unitarios del Sprint S0 — Módulo Horas Extras y Novedades.

Cobertura:
  - Normalizador de nivel de riesgo ARL (función pura)
  - Invariantes del catálogo de 16 novedades (factores legales)
  - Invariantes de los 5 factores prestacionales (decreto 1295/1994)
  - Parámetros legales base
  - Firma del seed (estructura, no ejecución contra DB)
"""
import pytest
from app.services.erp.empleados_service import _normalizar_nivel_riesgo
from app.services.novedades_nomina.seed_horas_extras import (
    NOVEDADES_CATALOGO,
    FACTORES_PRESTACIONALES,
    PARAMETROS_LEGALES,
)


# ---------------------------------------------------------------------------
# Normalizador de nivel de riesgo ARL
# ---------------------------------------------------------------------------

class TestNormalizarNivelRiesgo:
    def test_devuelve_I_por_defecto_si_none(self):
        assert _normalizar_nivel_riesgo(None) == "I"

    def test_devuelve_I_por_defecto_si_vacio(self):
        assert _normalizar_nivel_riesgo("") == "I"

    def test_reconoce_prefijo_riesgo(self):
        assert _normalizar_nivel_riesgo("Riesgo I 0.522%") == "I"
        assert _normalizar_nivel_riesgo("Riesgo V 6.960%") == "V"

    def test_reconoce_prefijo_nivel(self):
        assert _normalizar_nivel_riesgo("Nivel III 2.436%") == "III"
        assert _normalizar_nivel_riesgo("NIVEL IV 4.350%") == "IV"

    def test_reconoce_codigo_directo(self):
        assert _normalizar_nivel_riesgo("I") == "I"
        assert _normalizar_nivel_riesgo("II") == "II"

    def test_reconoce_por_porcentaje(self):
        assert _normalizar_nivel_riesgo("ARL SURA 0.522%") == "I"
        assert _normalizar_nivel_riesgo("ARL POSITIVA 6,960%") == "V"

    def test_es_case_insensitive(self):
        assert _normalizar_nivel_riesgo("riesgo ii 1.044%") == "II"


# ---------------------------------------------------------------------------
# Catálogo de 16 novedades — factores cumplen normatividad colombiana
# ---------------------------------------------------------------------------

class TestCatalogoNovedades:
    def test_exactamente_16_novedades(self):
        """Decisión: catálogo cerrado con los 16 códigos del Excel regional."""
        assert len(NOVEDADES_CATALOGO) == 16, (
            f"Se esperaban 16 novedades, hay {len(NOVEDADES_CATALOGO)}"
        )

    def test_codigos_esperados_presentes(self):
        esperados = {"HED", "HEN", "HEFD", "HEFN", "HF", "RN", "RF",
                     "LIC", "PNR", "VAC", "INC", "DXT", "AUS", "SAN", "RET", "CMP"}
        reales = {n["codigo"] for n in NOVEDADES_CATALOGO}
        assert esperados == reales, f"Faltan: {esperados - reales} | Sobran: {reales - esperados}"

    def test_codigos_unicos(self):
        codigos = [n["codigo"] for n in NOVEDADES_CATALOGO]
        assert len(codigos) == len(set(codigos)), "Códigos duplicados en el catálogo"

    def test_factores_HE_cumplen_ley_colombiana(self):
        """CST Art. 161 y Ley 2466/2025."""
        factores = {n["codigo"]: n["factor_hora_ordinaria"] for n in NOVEDADES_CATALOGO}
        assert factores["HED"] == 1.25, "HED debe ser 1.25 (25%)"
        assert factores["HEN"] == 1.75, "HEN debe ser 1.75 (75%)"
        assert factores["HEFD"] == 2.05, "HEFD debe ser 2.05 (105%)"
        assert factores["HEFN"] == 2.55, "HEFN debe ser 2.55 (155%)"
        assert factores["HF"] == 1.80, "HF debe ser 1.80 (recargo festivo Art. 179)"
        assert factores["RN"] == 1.35, "RN debe ser 1.35 (recargo nocturno 35%)"

    def test_solo_HE_acreditan_bolsa(self):
        """Decisión H8: solo horas extras (HED/HEN/HEFD/HEFN/HF) acreditan bolsa."""
        creditan = {n["codigo"] for n in NOVEDADES_CATALOGO if n["acredita_bolsa"]}
        assert creditan == {"HED", "HEN", "HEFD", "HEFN", "HF"}, (
            f"Solo HE deben acreditar bolsa, pero: {creditan}"
        )

    def test_CMP_descuenta_bolsa_1_a_1(self):
        """Decisión de Q&A: CMP descuenta 1:1 de la bolsa."""
        cmp = next(n for n in NOVEDADES_CATALOGO if n["codigo"] == "CMP")
        assert cmp["descuenta_bolsa"] is True
        assert cmp["acredita_bolsa"] is False

    def test_PNR_y_AUS_no_pagan(self):
        """Permiso no remunerado y ausencia injustificada no deben pagar."""
        pnr = next(n for n in NOVEDADES_CATALOGO if n["codigo"] == "PNR")
        aus = next(n for n in NOVEDADES_CATALOGO if n["codigo"] == "AUS")
        assert pnr["factor_hora_ordinaria"] == 0.0
        assert aus["factor_hora_ordinaria"] == 0.0

    def test_todas_las_HE_requieren_autorizacion(self):
        he_codes = {"HED", "HEN", "HEFD", "HEFN", "HF"}
        for n in NOVEDADES_CATALOGO:
            if n["codigo"] in he_codes:
                assert n["requiere_autorizacion"] is True, (
                    f"{n['codigo']} debe requerir autorización"
                )

    def test_unidades_validas(self):
        for n in NOVEDADES_CATALOGO:
            assert n["unidad"] in {"HORAS", "DIAS"}, (
                f"{n['codigo']} tiene unidad inválida: {n['unidad']}"
            )

    def test_vacaciones_y_licencias_se_miden_en_dias(self):
        for codigo in ("VAC", "LIC", "PNR", "INC", "DXT", "SAN"):
            nov = next(n for n in NOVEDADES_CATALOGO if n["codigo"] == codigo)
            assert nov["unidad"] == "DIAS", f"{codigo} debe medirse en DÍAS"


# ---------------------------------------------------------------------------
# Factores prestacionales ARL — Decreto 1295/1994
# ---------------------------------------------------------------------------

class TestFactoresPrestacionales:
    def test_exactamente_5_niveles(self):
        assert len(FACTORES_PRESTACIONALES) == 5

    def test_cubre_los_5_niveles_arl(self):
        niveles = {f["nivel_riesgo"] for f in FACTORES_PRESTACIONALES}
        assert niveles == {"I", "II", "III", "IV", "V"}

    def test_porcentajes_arl_coinciden_con_decreto(self):
        """Decreto 1295/1994, Art. 26."""
        esperados = {"I": 0.00522, "II": 0.01044, "III": 0.02436,
                     "IV": 0.04350, "V": 0.06960}
        for f in FACTORES_PRESTACIONALES:
            assert abs(f["porcentaje_arl"] - esperados[f["nivel_riesgo"]]) < 1e-6, (
                f"Nivel {f['nivel_riesgo']}: porcentaje ARL no coincide"
            )

    def test_factor_prestacional_incluye_arl(self):
        """El factor total debe ser >= porcentaje ARL (es solo una de las componentes)."""
        for f in FACTORES_PRESTACIONALES:
            assert f["factor_prestacional"] > f["porcentaje_arl"], (
                f"Nivel {f['nivel_riesgo']}: factor prestacional debe ser > ARL"
            )

    def test_factor_prestacional_en_rango_50_a_60_por_ciento(self):
        """Sanity check: la carga prestacional típica de Colombia es ~50-60%."""
        for f in FACTORES_PRESTACIONALES:
            assert 0.45 <= f["factor_prestacional"] <= 0.65, (
                f"Nivel {f['nivel_riesgo']}: factor {f['factor_prestacional']} fuera de rango"
            )

    def test_macro_niveles_correctos(self):
        """Agrupación macro: I=DIRECCION, II=ADMINISTRATIVO, III/IV/V=OPERATIVO."""
        esperados_macro = {"I": "DIRECCION", "II": "ADMINISTRATIVO",
                           "III": "OPERATIVO", "IV": "OPERATIVO", "V": "OPERATIVO"}
        for f in FACTORES_PRESTACIONALES:
            assert f["nivel_macro"] == esperados_macro[f["nivel_riesgo"]], (
                f"Nivel {f['nivel_riesgo']}: macro esperado "
                f"{esperados_macro[f['nivel_riesgo']]}, real {f['nivel_macro']}"
            )


# ---------------------------------------------------------------------------
# Parámetros legales
# ---------------------------------------------------------------------------

class TestParametrosLegales:
    def test_incluye_topes_horas_extras(self):
        codigos = {p["codigo"] for p in PARAMETROS_LEGALES}
        assert "MAX_HE_DIARIAS" in codigos
        assert "MAX_HE_SEMANALES" in codigos
        assert "MAX_HE_ANUALES" in codigos

    def test_incluye_ley_2101(self):
        codigos = {p["codigo"] for p in PARAMETROS_LEGALES}
        assert "REDUCCION_JORNADA_2101" in codigos
        red = next(p for p in PARAMETROS_LEGALES
                   if p["codigo"] == "REDUCCION_JORNADA_2101")
        assert red["tipo_dato"] == "JSON"

    def test_codigos_unicos(self):
        codigos = [p["codigo"] for p in PARAMETROS_LEGALES]
        assert len(codigos) == len(set(codigos))

    def test_tope_anual_480_horas(self):
        """CST Art. 161: máximo 480 horas extras al año."""
        max_anual = next(p for p in PARAMETROS_LEGALES
                         if p["codigo"] == "MAX_HE_ANUALES")
        assert max_anual["valor"] == "480"
