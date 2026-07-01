"""
Test unit para F5.4: validación de portal_pending_pwd en core/config.py.

Cubre el field_validator que rechaza el literal inseguro "PORTAL_PENDING_PWD"
y la coerción del flag jit_auto_aprobar desde string/boolean.

NO requiere Docker, DB, ni bcrypt. Pico RAM ~50MB.
"""

import pytest
from pydantic import ValidationError

# Importar desde core (v2) — la fuente de verdad tras el fix de C3.
from app.core.config import Settings


class TestPortalPendingPwdValidator:
    """Tests del field_validator _validar_portal_pending_pwd."""

    def test_rechaza_literal_inseguro_portal_pending_pwd(self):
        """El literal 'PORTAL_PENDING_PWD' es el valor por defecto histórico inseguro.
        Debe ser rechazado siempre, sin importar el entorno, para evitar que un
        deploy use el placeholder por accidente."""
        with pytest.raises(ValidationError) as excinfo:
            Settings(portal_pending_pwd="PORTAL_PENDING_PWD", entorno="desarrollo")

        # El mensaje debe mencionar el problema explícitamente
        error_msg = str(excinfo.value)
        assert "PORTAL_PENDING_PWD" in error_msg
        assert "valor seguro" in error_msg or "no puede ser" in error_msg

    def test_acepta_valor_seguro(self):
        """Cualquier valor distinto al literal inseguro debe pasar."""
        settings = Settings(
            portal_pending_pwd="una-clave-temporal-segura-2026!",
            entorno="desarrollo",
        )
        assert settings.portal_pending_pwd == "una-clave-temporal-segura-2026!"

    def test_acepta_string_vacio_en_desarrollo(self):
        """En desarrollo, el string vacío es válido (placeholder explícito).
        El operador debe proveer valor real antes de prod."""
        settings = Settings(portal_pending_pwd="", entorno="desarrollo")
        assert settings.portal_pending_pwd == ""

    def test_acepta_string_vacio_en_tests(self):
        """En tests, el string vacío también es válido."""
        settings = Settings(portal_pending_pwd="", entorno="tests")
        assert settings.portal_pending_pwd == ""

    def test_acepta_caracteres_especiales_y_unicode(self):
        """Contraseñas con caracteres no-ASCII o símbolos deben pasar."""
        settings = Settings(
            portal_pending_pwd="Clave#Temporal$2026!áéíóú",
            entorno="desarrollo",
        )
        assert "áéíóú" in settings.portal_pending_pwd

    def test_valor_con_espacios_se_preserva(self):
        """El validator NO hace strip (eso lo hace normalizar_cedula).
        portal_pending_pwd puede tener espacios si así se configuró."""
        settings = Settings(
            portal_pending_pwd="clave con espacios",
            entorno="desarrollo",
        )
        assert settings.portal_pending_pwd == "clave con espacios"


class TestJitAutoAprobarCoercion:
    """Tests del field_validator _coercion_jit_flag que convierte string/boolean."""

    def test_string_true_se_coerce_a_bool_true(self):
        """El env var puede llegar como 'true'/'1'/'yes'/'on' desde el .env."""
        for truthy in ("true", "True", "TRUE", "1", "yes", "YES", "on", "ON"):
            settings = Settings(jit_auto_aprobar=truthy, entorno="desarrollo")
            assert settings.jit_auto_aprobar is True, f"Falló para '{truthy}'"

    def test_string_false_se_coerce_a_bool_false(self):
        """Cualquier string que no esté en la lista truthy es False."""
        for falsy in ("false", "False", "FALSE", "0", "no", "off", "", "random"):
            settings = Settings(jit_auto_aprobar=falsy, entorno="desarrollo")
            assert settings.jit_auto_aprobar is False, f"Falló para '{falsy}'"

    def test_bool_pasa_directo(self):
        """Si ya viene como bool, no se transforma."""
        assert Settings(jit_auto_aprobar=True, entorno="desarrollo").jit_auto_aprobar is True
        assert Settings(jit_auto_aprobar=False, entorno="desarrollo").jit_auto_aprobar is False

    def test_string_con_espacios_se_trimea(self):
        """'  true  ' debe coerce a True (defensa contra espacios accidentales)."""
        settings = Settings(jit_auto_aprobar="  true  ", entorno="desarrollo")
        assert settings.jit_auto_aprobar is True


class TestSettingsIntegracionBasica:
    """Tests de smoke: la configuración se puede instanciar y leer campos."""

    def test_instancia_con_defaults(self):
        """Sin parámetros, Settings debe usar valores por defecto razonables."""
        # No pasamos nada — debe tomar del .env o defaults
        settings = Settings()
        assert settings.entorno in ("desarrollo", "produccion", "tests")
        assert isinstance(settings.jit_auto_aprobar, bool)
        assert isinstance(settings.portal_pending_pwd, str)

    def test_entorno_invalido_rechazado(self):
        """El campo entorno está tipado como Literal; valores fuera del enum fallan."""
        with pytest.raises(ValidationError):
            Settings(entorno="staging-invalido")

    def test_es_produccion_property(self):
        """El property es_produccion debe reflejar el campo entorno."""
        assert Settings(entorno="produccion").es_produccion is True
        assert Settings(entorno="desarrollo").es_produccion is False
        assert Settings(entorno="tests").es_produccion is False
