#!/usr/bin/env python3
"""Validate Antigravity adapters against the canonical OpenCode harness."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


REQUIRED_RULES = {
    "00-project-guardrails.md",
    "10-backend-routing.md",
    "20-frontend-routing.md",
    "30-mobile-routing.md",
    "40-docs-harness-routing.md",
    "50-security-routing.md",
}
REQUIRED_WORKFLOWS = {"prepare-pr.md", "validate-pr.md"}
WORKFLOW_REQUIREMENTS = {
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
REQUIRED_DOCS = {
    "CLAUDE.md",
    "docs/GUIA_ANTIGRAVITY.md",
    "docs/decisions/ADR-007-adaptador-google-antigravity.md",
}
REQUIRED_DOC_REFERENCES = {
    "CLAUDE.md": (
        ".agent/rules/",
        ".agent/skills/",
        ".agent/workflows/",
        "scripts/validate_antigravity_harness.py",
        "docs/GUIA_ANTIGRAVITY.md",
    ),
}
DANGEROUS_WORKFLOW_DIRECTIVE = re.compile(
    r"git\s+(?:push|fetch|merge)|docker|npm\s+install|pip\s+install|"
    r"ejecut(?:a|ar|es)\s+(?:codigo|scripts|tests|builds|hooks|binarios)",
    re.IGNORECASE,
)
SAFETY_QUALIFIERS = (
    "no ",
    "nunca ",
    "autorizacion explicita",
    "solicita autorizacion",
)


def parse_frontmatter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    result: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return result
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line or line.startswith((" ", "\t")):
            return {}
        key, value = line.split(":", 1)
        key = key.strip()
        if not key or key in result:
            return {}
        value = value.strip()
        if value.startswith(('"', "'")):
            quote = value[0]
            if len(value) < 2 or not value.endswith(quote):
                return {}
            value = value[1:-1]
        elif value.endswith(('"', "'")):
            return {}
        result[key] = value
    return {}


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    canonical_dir = root / ".opencode" / "agent"
    adapter_dir = root / ".agent" / "skills"

    canonical_agents = sorted(
        path.stem
        for path in canonical_dir.glob("*.md")
        if not path.name.startswith("_")
    )
    if not canonical_agents:
        errors.append("No canonical agents found in .opencode/agent/.")

    adapter_agents = sorted(
        path.parent.name for path in adapter_dir.glob("*/SKILL.md")
    )
    for name in sorted(set(adapter_agents) - set(canonical_agents)):
        errors.append(f"Orphan Antigravity adapter without canonical agent: {name}")

    for name in canonical_agents:
        adapter = adapter_dir / name / "SKILL.md"
        if not adapter.is_file():
            errors.append(f"Missing Antigravity adapter: {adapter.relative_to(root)}")
            continue

        metadata = parse_frontmatter(adapter)
        if metadata.get("name") != name:
            errors.append(f"Invalid or missing name in {adapter.relative_to(root)}")
        if not metadata.get("description"):
            errors.append(f"Missing description in {adapter.relative_to(root)}")

        body = adapter.read_text(encoding="utf-8")
        canonical_ref = f".opencode/agent/{name}.md"
        if canonical_ref not in body:
            errors.append(f"Missing canonical reference {canonical_ref} in adapter {name}")
        if ".opencode/agent/_shared-discovery.md" not in body:
            errors.append(f"Missing shared discovery reference in adapter {name}")

    rules_dir = root / ".agent" / "rules"
    existing_rules = {path.name for path in rules_dir.glob("*.md")}
    for name in sorted(REQUIRED_RULES - existing_rules):
        errors.append(f"Missing Antigravity rule: .agent/rules/{name}")
    for name in sorted(existing_rules - REQUIRED_RULES):
        errors.append(f"Unexpected Antigravity rule outside canonical roster: {name}")
    for rule in rules_dir.glob("*.md"):
        body = rule.read_text(encoding="utf-8")
        if not body.strip() or ".opencode/agent/" not in body:
            errors.append(
                f"Rule lacks canonical routing reference: {rule.relative_to(root)}"
            )

    workflows_dir = root / ".agent" / "workflows"
    existing_workflows = {path.name for path in workflows_dir.glob("*.md")}
    for name in sorted(REQUIRED_WORKFLOWS - existing_workflows):
        errors.append(f"Missing Antigravity workflow: .agent/workflows/{name}")
    for name in sorted(existing_workflows - REQUIRED_WORKFLOWS):
        errors.append(f"Unexpected Antigravity workflow outside approved roster: {name}")
    for workflow in workflows_dir.glob("*.md"):
        metadata = parse_frontmatter(workflow)
        if not metadata.get("description"):
            errors.append(f"Missing workflow description in {workflow.relative_to(root)}")
        body = workflow.read_text(encoding="utf-8")
        if ".agent/skills/harness-router/SKILL.md" not in body:
            errors.append(f"Workflow does not route reviewers: {workflow.relative_to(root)}")
        for required_text in WORKFLOW_REQUIREMENTS.get(workflow.name, ()):
            if required_text.lower() not in body.lower():
                errors.append(
                    f"Workflow lacks required guard '{required_text}': "
                    f"{workflow.relative_to(root)}"
                )
        for line_number, line in enumerate(body.splitlines(), start=1):
            normalized_line = line.replace("`", "")
            for clause in re.split(r"[,;.!?]", normalized_line):
                if DANGEROUS_WORKFLOW_DIRECTIVE.search(clause) and not any(
                    qualifier in clause.lower() for qualifier in SAFETY_QUALIFIERS
                ):
                    errors.append(
                        "Workflow contains an unqualified dangerous directive at "
                        f"{workflow.relative_to(root)}:{line_number}"
                    )
                    break

    for relative_path in sorted(REQUIRED_DOCS):
        document = root / relative_path
        if not document.is_file():
            errors.append(f"Missing Antigravity documentation: {relative_path}")
            continue
        body = document.read_text(encoding="utf-8")
        for required_text in REQUIRED_DOC_REFERENCES.get(relative_path, ()):
            if required_text not in body:
                errors.append(
                    f"Missing required documentation reference '{required_text}' "
                    f"in {relative_path}"
                )

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Repository root (defaults to the parent of scripts/).",
    )
    args = parser.parse_args()
    errors = validate(args.root.resolve())
    if errors:
        print("Antigravity harness validation: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    canonical_count = len(
        [
            path
            for path in (args.root / ".opencode" / "agent").glob("*.md")
            if not path.name.startswith("_")
        ]
    )
    print(f"Antigravity harness validation: PASS ({canonical_count} adapters)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
