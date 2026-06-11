"""Tests del manifiesto y script de cobertura de auditoría."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_todos_los_modulos_rbac_tienen_cobertura():
    from app.core.auditoria_manifest import (
        AUDITORIA_COBERTURA,
        MODULOS_EXENTOS_AUDITORIA,
    )
    from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY

    rbac_ids = {m["id"] for m in SYSTEM_MODULES_REGISTRY}
    declarados = set(AUDITORIA_COBERTURA) | set(MODULOS_EXENTOS_AUDITORIA)
    assert rbac_ids == declarados, sorted(rbac_ids - declarados)


def test_script_audit_coverage_check_exitoso():
    script = ROOT / "scripts" / "audit_coverage_check.py"
    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
