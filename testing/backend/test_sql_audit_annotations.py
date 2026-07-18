"""Regresiones para anotaciones del auditor en sentencias SQL."""
import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_PATH = ROOT / "backend_v2" / "app" / "core" / "migrations"


def test_anotaciones_auditoria_no_forman_parte_del_sql():
    for path in MIGRATIONS_PATH.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Name)
                and node.func.id == "text"
                and node.args
            ):
                continue
            for literal in ast.walk(node.args[0]):
                if isinstance(literal, ast.Constant) and isinstance(literal.value, str):
                    assert "@audit-ok" not in literal.value, (
                        f"Anotacion de auditoria incluida en SQL: {path.name}:{node.lineno}"
                    )
