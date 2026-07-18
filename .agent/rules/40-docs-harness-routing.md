# Routing de documentacion y arnes

Cuando el alcance incluya `docs/`, `testing/`, `.agent/`, `.agents/`, `.opencode/`, `.codex/`, `scripts/validate_antigravity_harness.py`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` o `.gitignore`:

- Consulta `.opencode/agent/harness-router.md` con el alcance actual y ejecuta directamente cada persona requerida.
- Lee la definicion canonica y las referencias obligatorias de cada persona devuelta por el router.
- El orquestador puede ejecutar `py -3.12 scripts/validate_antigravity_harness.py` solo para cambios propios y confiables, no durante la revision estatica de una rama no confiable.
- No mantengas una matriz de routing ni checklists paralelos en esta regla.
