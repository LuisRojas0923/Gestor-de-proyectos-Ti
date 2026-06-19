"""
Validador pre-commit para evitar regresiones basicas de modo oscuro.

Revisa solo lineas nuevas stageadas en archivos frontend. Esto evita bloquear
deuda historica, pero impide introducir nuevos `bg-white`, `text-slate-*`,
`border-slate-*`, etc. sin `dark:*` o tokens CSS.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


FRONTEND_SOURCE_RE = re.compile(r"(^|[\\/])frontend[\\/]src[\\/].*\.(tsx?|jsx?)$")
HUNK_RE = re.compile(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")

COLOR_TOKEN_RE = re.compile(
    r"(?<![A-Za-z0-9_/-])"
    r"((?:(?:sm|md|lg|xl|2xl|hover|focus|active|disabled|group-hover|peer-checked|peer-focus|after|before|dark):)*"
    r"(?:bg|text|border)-"
    r"(?:white|black|slate|gray|neutral|zinc|stone)"
    r"(?:-\d{2,3})?(?:/\d{1,3})?)"
    r"(?![A-Za-z0-9_/-])"
)

STATE_PREFIXES = {
    "hover",
    "focus",
    "active",
    "disabled",
    "group-hover",
    "peer-checked",
    "peer-focus",
    "after",
    "before",
}

RISKY_BASE_TOKENS = {"bg-white", "bg-black", "text-black"}
RISKY_PREFIXES = (
    "bg-slate-",
    "bg-gray-",
    "bg-neutral-",
    "bg-zinc-",
    "bg-stone-",
    "text-slate-",
    "text-gray-",
    "text-neutral-",
    "text-zinc-",
    "text-stone-",
    "border-slate-",
    "border-gray-",
    "border-neutral-",
    "border-zinc-",
    "border-stone-",
)

SUPPRESSIONS = ("@dark-mode-ok", "@audit-ok", "[CONTROLADO]")


@dataclass(frozen=True)
class AddedLine:
    path: str
    number: int
    text: str


@dataclass(frozen=True)
class DarkModeViolation:
    path: str
    number: int
    token: str
    text: str
    suggestion: str


def normalize_path(path: str) -> str:
    return path.replace("\\", "/")


def is_frontend_source(path: str) -> bool:
    return bool(FRONTEND_SOURCE_RE.search(normalize_path(path)))


def split_token(token: str) -> tuple[tuple[str, ...], str]:
    parts = token.split(":")
    return tuple(parts[:-1]), parts[-1]


def is_risky_base_token(base: str) -> bool:
    if base in RISKY_BASE_TOKENS:
        return True
    return any(base.startswith(prefix) for prefix in RISKY_PREFIXES)


def has_dark_counterpart(line: str, base: str) -> bool:
    category = base.split("-", 1)[0]
    return f"dark:{category}-" in line or f"{category}-[var(" in line


def should_skip_line(line: str) -> bool:
    return any(marker in line for marker in SUPPRESSIONS)


def find_dark_mode_violations(path: str, number: int, line: str) -> list[DarkModeViolation]:
    if should_skip_line(line):
        return []

    violations: list[DarkModeViolation] = []
    for match in COLOR_TOKEN_RE.finditer(line):
        token = match.group(1)
        prefixes, base = split_token(token)
        if "dark" in prefixes or any(prefix in STATE_PREFIXES for prefix in prefixes):
            continue
        if not is_risky_base_token(base):
            continue
        if has_dark_counterpart(line, base):
            continue

        category = base.split("-", 1)[0]
        suggestion = (
            f"Reemplaza `{token}` por `{category}-[var(--color-...)]` "
            f"o agrega una contraparte `dark:{category}-...` en la misma clase."
        )
        violations.append(DarkModeViolation(path, number, token, line.strip(), suggestion))

    return violations


def staged_diff(files: list[str]) -> str:
    cmd = ["git", "diff", "--cached", "--unified=0", "--"]
    cmd.extend(files)
    result = subprocess.run(cmd, check=False, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    return result.stdout


def iter_added_lines(diff_text: str) -> list[AddedLine]:
    current_path: str | None = None
    new_line_number = 0
    added: list[AddedLine] = []

    for raw_line in diff_text.splitlines():
        if raw_line.startswith("+++ b/"):
            current_path = raw_line[6:]
            continue
        if raw_line.startswith("+++ /dev/null"):
            current_path = None
            continue

        hunk = HUNK_RE.match(raw_line)
        if hunk:
            new_line_number = int(hunk.group(1))
            continue

        if raw_line.startswith("+") and not raw_line.startswith("+++"):
            if current_path and is_frontend_source(current_path):
                added.append(AddedLine(current_path, new_line_number, raw_line[1:]))
            new_line_number += 1
            continue

        if raw_line.startswith("-") and not raw_line.startswith("---"):
            continue

        if current_path is not None:
            new_line_number += 1

    return added


def collect_violations(files: list[str]) -> list[DarkModeViolation]:
    frontend_files = [path for path in files if is_frontend_source(path) and Path(path).exists()]
    if not frontend_files:
        return []

    diff_text = staged_diff(frontend_files)
    violations: list[DarkModeViolation] = []
    for added_line in iter_added_lines(diff_text):
        violations.extend(find_dark_mode_violations(added_line.path, added_line.number, added_line.text))
    return violations


def main() -> int:
    files = sys.argv[1:]
    violations = collect_violations(files)
    if not violations:
        print("Dark mode token validation passed.")
        return 0

    print("[DARK MODE] Nuevas clases hardcodeadas sin adaptacion dark/tokens:")
    for violation in violations:
        rel_path = normalize_path(os.path.relpath(violation.path, os.getcwd())) if os.path.isabs(violation.path) else violation.path
        print(f"- {rel_path}:{violation.number} -> {violation.token}")
        print(f"  {violation.suggestion}")
        print(f"  Linea: {violation.text}")

    print(f"\nTotal Dark Mode violations: {len(violations)}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
