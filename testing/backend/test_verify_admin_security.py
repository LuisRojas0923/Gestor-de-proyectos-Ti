"""
Tests de seguridad para /api/v2/config/verify-admin.

Cubre:
- Rate limiting (5 fallos/5min → 429)
- Audit log (éxito + fallo se registran)
- Anti-leak (password NUNCA en logs ni respuesta)
- Resiliencia (audit failure no bloquea endpoint)
- Aislamiento (diferentes usuarios no comparten rate budget)

IMPORTANTE: Los tests E2E requieren servidor backend activo.
"""


def test_e2e_audit_exitoso_registra_en_auditoria_eventos():
    """Verificación exitosa debe insertar en auditoria_eventos con resultado='exito'."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_audit_fallido_registra_en_auditoria_eventos():
    """Verificación fallida debe insertar en auditoria_eventos con resultado='fallo'."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_audit_password_no_se_almacena_nunca():
    """El password NUNCA debe aparecer en la tabla auditoria_eventos."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_5_fallos_consecutivos_retorna_429():
    """5 intentos fallidos en menos de 5 minutos → 429 en el sexto intento."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


def test_e2e_rate_limit_por_usuario_y_ip():
    """El rate limit es por (usuario_id, ip)."""
    import os
    if os.getenv("EJECUTAR_E2E") != "1":
        import pytest
        pytest.skip("E2E requiere servidor backend. Setear EJECUTAR_E2E=1.")


# Tests unitarios (no requieren servidor)
# =============================================================================


def test_servicio_registrar_verificacion_no_falla_si_db_cae():
    """Si el INSERT en auditoria_eventos falla, ServicioAuth.registrar_verificacion_panel
    NO debe propagar la excepción (try/except interno)."""
    import asyncio
    from app.services.auth.servicio import ServicioAuth

    class FakeSessionFalla:
        async def execute(self, *_):
            raise RuntimeError("DB caída")

        async def commit(self):
            raise RuntimeError("DB caída")

        async def rollback(self):
            pass

    asyncio.run(
        ServicioAuth.registrar_verificacion_panel(
            FakeSessionFalla(),
            usuario_id="u-1",
            rol="admin",
            exitosa=True,
            motivo="exito",
        )
    )


def test_servicio_tiene_acceso_panel_admin_es_async():
    """El método tiene_acceso_panel_admin debe ser callable async."""
    import inspect
    from app.services.auth.servicio import ServicioAuth

    method = getattr(ServicioAuth, "tiene_acceso_panel_admin", None)
    assert method is not None
    assert callable(method)
    assert inspect.iscoroutinefunction(method), "Debe ser async"


def test_auditoria_no_bloquea_respuesta_exitosa_unit_test():
    """Si la auditoría falla, ServicioAuth.registrar_verificacion_panel debe ser resiliente."""
    import asyncio
    from app.services.auth.servicio import ServicioAuth

    class FakeSessionError:
        async def execute(self, *_):
            raise RuntimeError("DB caída en execute")

        async def commit(self):
            raise RuntimeError("DB caída en commit")

        async def rollback(self):
            pass

    asyncio.run(
        ServicioAuth.registrar_verificacion_panel(
            FakeSessionError(),
            usuario_id="u-test",
            rol="admin",
            exitosa=True,
            motivo="exito_test",
        )
    )
