from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
VALIDATOR_PATH = REPO_ROOT / "scripts" / "validate_antigravity_harness.py"
SPEC = importlib.util.spec_from_file_location("validate_antigravity_harness", VALIDATOR_PATH)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)

EXPECTED_WORKFLOW_REQUIREMENTS = {
    "prepare-pr.md": (
        "solicita autorizacion explicita del usuario",
        "No hagas commit ni `git push` salvo instruccion explicita del usuario",
    ),
    "validate-pr.md": (
        "checkout base confiable",
        "no ejecutes codigo, scripts, tests, builds, hooks ni binarios",
        "No modifiques archivos, no apruebes ni fusiones la PR y nunca ejecutes `git push`",
    ),
}
EXPECTED_RULES = {
    "00-project-guardrails.md",
    "10-backend-routing.md",
    "20-frontend-routing.md",
    "30-mobile-routing.md",
    "40-docs-harness-routing.md",
    "50-security-routing.md",
}


def write(path: Path, content: str = "") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_valid_harness(root: Path, agents: tuple[str, ...] = ("reviewer",)) -> None:
    for name in agents:
        write(root / ".opencode" / "agent" / f"{name}.md", "# Canonical\n")
        write(
            root / ".agent" / "skills" / name / "SKILL.md",
            "\n".join(
                (
                    "---",
                    f"name: {name}",
                    "description: Test adapter.",
                    "---",
                    ".opencode/agent/_shared-discovery.md",
                    f".opencode/agent/{name}.md",
                )
            ),
        )

    for name in EXPECTED_RULES:
        write(
            root / ".agent" / "rules" / name,
            "# Rule\n.opencode/agent/harness-router.md\n",
        )
    for name, guards in EXPECTED_WORKFLOW_REQUIREMENTS.items():
        write(
            root / ".agent" / "workflows" / name,
            "\n".join(
                (
                    "---",
                    "description: Test workflow.",
                    "---",
                    ".agent/skills/harness-router/SKILL.md",
                    *guards,
                )
            ),
        )
    for relative_path in VALIDATOR.REQUIRED_DOCS:
        references = VALIDATOR.REQUIRED_DOC_REFERENCES.get(relative_path, ())
        write(root / relative_path, "# Doc\n" + "\n".join(references))


def test_valid_harness_passes(tmp_path: Path) -> None:
    build_valid_harness(tmp_path, ("reviewer", "router"))

    assert VALIDATOR.validate(tmp_path) == []


def test_expected_workflow_guards_are_independent() -> None:
    assert VALIDATOR.WORKFLOW_REQUIREMENTS == EXPECTED_WORKFLOW_REQUIREMENTS


def test_expected_rule_roster_is_independent() -> None:
    assert VALIDATOR.REQUIRED_RULES == EXPECTED_RULES


@pytest.mark.parametrize(
    ("mutation", "expected"),
    (
        ("missing", "Missing Antigravity adapter"),
        ("orphan", "Orphan Antigravity adapter"),
        ("reference", "Missing canonical reference"),
        ("shared", "Missing shared discovery reference"),
        ("frontmatter", "Invalid or missing name"),
        ("malformed", "Invalid or missing name"),
        ("quoted", "Invalid or missing name"),
        ("guard", "Workflow lacks required guard"),
        ("rule", "Missing Antigravity rule"),
        ("empty_rule", "Rule lacks canonical routing reference"),
        ("extra_rule", "Unexpected Antigravity rule"),
        ("workflow", "Missing Antigravity workflow"),
        ("extra_workflow", "Unexpected Antigravity workflow"),
        ("unsafe", "unqualified dangerous directive"),
        ("unsafe_markdown", "unqualified dangerous directive"),
        ("unsafe_clause", "unqualified dangerous directive"),
        ("doc", "Missing Antigravity documentation"),
        ("doc_ref", "Missing required documentation reference"),
    ),
)
def test_invalid_harness_returns_actionable_error(
    tmp_path: Path, mutation: str, expected: str
) -> None:
    build_valid_harness(tmp_path)
    adapter = tmp_path / ".agent" / "skills" / "reviewer" / "SKILL.md"
    if mutation == "missing":
        adapter.unlink()
    elif mutation == "orphan":
        write(
            tmp_path / ".agent" / "skills" / "orphan" / "SKILL.md",
            "---\nname: orphan\ndescription: Orphan.\n---\n",
        )
    elif mutation == "reference":
        adapter.write_text(
            adapter.read_text(encoding="utf-8").replace(
                ".opencode/agent/reviewer.md", ".opencode/agent/other.md"
            ),
            encoding="utf-8",
        )
    elif mutation == "shared":
        adapter.write_text(
            adapter.read_text(encoding="utf-8").replace(
                ".opencode/agent/_shared-discovery.md", ".opencode/agent/other.md"
            ),
            encoding="utf-8",
        )
    elif mutation == "frontmatter":
        adapter.write_text("---\nname: reviewer\n", encoding="utf-8")
    elif mutation == "malformed":
        adapter.write_text(
            "---\nname: reviewer\ndescription: Valid.\nnot yaml\n---\n"
            ".opencode/agent/_shared-discovery.md\n"
            ".opencode/agent/reviewer.md\n",
            encoding="utf-8",
        )
    elif mutation == "quoted":
        adapter.write_text(
            "---\nname: reviewer\ndescription: \"unterminated\n---\n"
            ".opencode/agent/_shared-discovery.md\n"
            ".opencode/agent/reviewer.md\n",
            encoding="utf-8",
        )
    elif mutation == "guard":
        workflow = tmp_path / ".agent" / "workflows" / "validate-pr.md"
        workflow.write_text(
            workflow.read_text(encoding="utf-8").replace(
                "checkout base confiable", "checkout cualquiera"
            ),
            encoding="utf-8",
        )
    elif mutation == "rule":
        (tmp_path / ".agent" / "rules" / sorted(VALIDATOR.REQUIRED_RULES)[0]).unlink()
    elif mutation == "empty_rule":
        write(
            tmp_path / ".agent" / "rules" / sorted(VALIDATOR.REQUIRED_RULES)[0],
            "",
        )
    elif mutation == "extra_rule":
        write(
            tmp_path / ".agent" / "rules" / "unexpected.md",
            ".opencode/agent/harness-router.md\n",
        )
    elif mutation == "workflow":
        (tmp_path / ".agent" / "workflows" / "prepare-pr.md").unlink()
    elif mutation == "extra_workflow":
        write(
            tmp_path / ".agent" / "workflows" / "unsafe.md",
            "---\ndescription: Extra.\n---\n",
        )
    elif mutation == "unsafe":
        workflow = tmp_path / ".agent" / "workflows" / "prepare-pr.md"
        workflow.write_text(
            workflow.read_text(encoding="utf-8") + "\nEjecuta git push ahora.\n",
            encoding="utf-8",
        )
    elif mutation == "unsafe_markdown":
        workflow = tmp_path / ".agent" / "workflows" / "prepare-pr.md"
        workflow.write_text(
            workflow.read_text(encoding="utf-8") + "\nEjecuta `git push` ahora.\n",
            encoding="utf-8",
        )
    elif mutation == "unsafe_clause":
        workflow = tmp_path / ".agent" / "workflows" / "prepare-pr.md"
        workflow.write_text(
            workflow.read_text(encoding="utf-8")
            + "\nNo revises este cambio; ejecuta git push.\n",
            encoding="utf-8",
        )
    elif mutation == "doc":
        (tmp_path / sorted(VALIDATOR.REQUIRED_DOCS)[0]).unlink()
    elif mutation == "doc_ref":
        write(tmp_path / "CLAUDE.md", "# Missing Antigravity references\n")

    assert any(expected in error for error in VALIDATOR.validate(tmp_path))


def test_cli_reports_failure_and_nonzero_exit(tmp_path: Path) -> None:
    build_valid_harness(tmp_path)
    (tmp_path / ".agent" / "skills" / "reviewer" / "SKILL.md").unlink()

    result = subprocess.run(
        [sys.executable, str(VALIDATOR_PATH), "--root", str(tmp_path)],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 1
    assert "Antigravity harness validation: FAIL" in result.stdout
    assert "Missing Antigravity adapter" in result.stdout
