---
description: Prepara cambios locales para una PR con routing, revisiones directas, checks y evidencia, sin commit ni push automaticos.
---

# Prepare PR

1. Lee `AGENTS.md`, `CLAUDE.md`, `.agent/rules/00-project-guardrails.md` y `.opencode/agent/_shared-discovery.md`.
2. Inspecciona `git status`, `git diff` y el historial relevante. Separa cambios ajenos y no los modifiques ni incluyas.
3. Carga `.agent/skills/harness-router/SKILL.md` en modo `build` con la lista de archivos modificados.
4. Ejecuta directamente cada persona obligatoria indicada por el router. `docs-tests-reviewer` siempre es obligatorio en build; agrega `scope-reviewer` si el alcance cambio.
5. Corrige solo hallazgos dentro del alcance autorizado y repite las revisiones afectadas. Las personas revisoras permanecen read-only; el orquestador aplica cambios.
6. Propone los checks relevantes definidos por `AGENTS.md` y por los revisores. Solicita autorizacion explicita del usuario antes de ejecutar Docker, builds, servidores, instalaciones, red, comandos que carguen `.env` o codigo no confiable. Para cambios propios y confiables del arnes, ejecuta `py -3.12 scripts/validate_antigravity_harness.py`.
7. Verifica documentacion, ADR, bitacora y reporte de build cuando apliquen.
8. Devuelve resumen de archivos, revisores, hallazgos y resultados de checks. No hagas commit ni `git push` salvo instruccion explicita del usuario.
