#!/usr/bin/env python3
"""
Ejecuta el CLI de graphify cargando variables desde .env en la raíz del repo.

Uso (desde la raíz):
  py -3.12 scripts/graphify_from_env.py extract docs --out . --backend gemini
  py -3.12 scripts/graphify_from_env.py query "RBAC permisos" --budget 1200

Requiere: pip install graphifyy python-dotenv
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = REPO_ROOT / ".env"


def load_repo_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(ENV_FILE, override=False)
        return
    except ImportError:
        pass

    if not ENV_FILE.exists():
        return

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def main() -> int:
    load_repo_env()

    if len(sys.argv) < 2:
        print(
            "Uso: py -3.12 scripts/graphify_from_env.py <comando graphify> [args...]\n"
            "Ej.: py -3.12 scripts/graphify_from_env.py extract docs --out . --backend gemini",
            file=sys.stderr,
        )
        return 1

    subcmd = sys.argv[1]
    if subcmd == "extract" and not (
        os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    ):
        print(
            "error: define GEMINI_API_KEY en .env (raíz del repo) antes de extract.",
            file=sys.stderr,
        )
        return 1

    cmd = [sys.executable, "-m", "graphify", *sys.argv[1:]]
    return subprocess.call(cmd, cwd=REPO_ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
