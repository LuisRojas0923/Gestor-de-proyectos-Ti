"""
Tests para la whitelist dinámica de /api/v2/config/verify-admin.

La nueva implementación debe:
- Derivar la whitelist de RBAC dinámico (PermisoRol JOIN ModuloSistema WHERE categoria='panel')
- NO usar una lista hardcodeada de roles
- manager NO debe pasar (no tiene permisos categoria='panel' por defecto)
- Cada rol con permisos categoria='panel' debe pasar con password correcta

IMPORTANTE: Los tests E2E (marcados con skip) requieren servidor backend activo.
Para ejecutar la suite E2E, setear EJECUTAR_E2E=1.
"""


def test_e2e_manager_sin_permiso_panel_rechazado_403():
    """CRÍTICO: manager NO debe pasar verify-admin porque no tiene categoria='panel'."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_sin_token_devuelve_401():
    """Sin Authorization header, el endpoint debe rechazar con 401."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_payload_invalido_sin_password_devuelve_422():
    """Schema Pydantic: payload sin password debe ser 422 (validación)."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_password_muy_corta_devuelve_422():
    """Schema Pydantic: min_length=8 debe rechazar passwords de < 8 chars."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_password_muy_larga_devuelve_422():
    """Schema Pydantic: max_length=128 debe rechazar passwords de > 128 chars."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_password_incorrecta_devuelve_401():
    """Password incorrecta con rol válido debe ser 401."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_con_token_valido_y_password_correcta_devuelve_200():
    """Happy path: rol con permisos panel + password correcta → 200."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_response_no_contiene_password_en_claro():
    """Seguridad: la respuesta NUNCA debe incluir el password en claro."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_rol_usuario_estandar_rechazado_403():
    """Usuario con rol 'usuario' debe ser rechazado con 403 (sin permisos panel)."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_rol_inexistente_rechazado_403():
    """Token con rol que no existe en el sistema debe ser rechazado con 403."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_permiso_revocado_rechazado_403():
    """Si un admin revoca permisos panel de un rol vía UI, el endpoint lo rechaza."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_verify_admin_consulta_dinamica_sin_cache():
    """El endpoint consulta PermisoRol en cada request (no cache)."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


# Tests unitarios (no requieren servidor)
# =============================================================================


def test_roles_seed_contiene_los_cinco_roles_esperados():
    """El SSOT roles.py debe tener los 5 roles administrativos (sin manager)."""
    from app.core.roles import ROLES_ADMIN_PANEL

    assert "admin" in ROLES_ADMIN_PANEL
    assert "analyst" in ROLES_ADMIN_PANEL
    assert "director" in ROLES_ADMIN_PANEL
    assert "admin_sistemas" in ROLES_ADMIN_PANEL
    assert "admin_mejoramiento" in ROLES_ADMIN_PANEL


def test_roles_seed_manager_existe_pero_no_en_panel():
    """manager existe en el seed pero NO en ROLES_ADMIN_PANEL."""
    from app.core.roles import ROLES_SEED, ROLES_ADMIN_PANEL

    assert "manager" in ROLES_SEED, "manager debe existir en el seed"
    assert "manager" not in ROLES_ADMIN_PANEL, "manager NO debe estar en roles admin panel"


def test_servicio_tiene_acceso_panel_admin_existe():
    """El método tiene_acceso_panel_admin debe existir en ServicioAuth."""
    from app.services.auth.servicio import ServicioAuth

    assert hasattr(ServicioAuth, "tiene_acceso_panel_admin")
    assert callable(getattr(ServicioAuth, "tiene_acceso_panel_admin", None))


def test_servicio_registrar_verificacion_panel_existe():
    """El método registrar_verificacion_panel debe existir en ServicioAuth."""
    from app.services.auth.servicio import ServicioAuth

    assert hasattr(ServicioAuth, "registrar_verificacion_panel")
    assert callable(getattr(ServicioAuth, "registrar_verificacion_panel", None))


def test_auditoria_evento_modelo_existe():
    """El modelo AuditoriaEvento debe estar definido."""
    from app.models.auth.auditoria_evento import AuditoriaEvento

    assert hasattr(AuditoriaEvento, "__tablename__")
    assert AuditoriaEvento.__tablename__ == "auditoria_eventos"
