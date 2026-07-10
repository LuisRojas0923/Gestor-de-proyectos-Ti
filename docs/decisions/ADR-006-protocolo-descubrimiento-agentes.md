# ADR-006: Protocolo de descubrimiento de skills para los arneses OpenCode y Codex

**Estado:** Aceptado
**Fecha:** 2026-06-02
**Autores:** Cursor (implementación del plan `opencode-agentes-descubrimiento-skills`)
**Plan relacionado:** `docs/reviews/plans/2026-06-02_opencode-agentes-descubrimiento-skills.md`
**Bitácora:** `docs/bitacora/2026-06-02-opencode-descubrimiento-skills.md`

---

## Contexto

Los subagentes en `.opencode/agent/` referenciaban solo un subconjunto de los skills en `.agents/skills/`. `AGENTS.md` indicaba genéricamente "use relevant skills" sin protocolo. No existía distinción entre:

- exploración con **graphify** (grafo del codebase),
- descubrimiento externo con **find-skills** (`npx skills`),
- y revisión read-only con permisos `bash: deny`.

## Decisión

1. Centralizar reglas en `.opencode/agent/_shared-discovery.md`.
2. Cada subagente declara `Protocol (read first): _shared-discovery.md` y amplía `Mandatory references` según la matriz inferior.
3. **graphify:** solo el flujo principal ejecuta el pipeline; revisores leen `graphify-out/` si existe (`graphify-out/` en `.gitignore`).
4. **find-skills:** solo el orquestador/implementación; revisores pueden recomendar, no instalar.
5. `.opencode/agent/*.md` es la fuente canonica de los ocho subagentes. `.codex/agents/*.toml` mantiene adaptadores del mismo roster y referencia esas definiciones para evitar duplicacion y drift.
6. Todos los adaptadores Codex usan sandbox de solo lectura. Cuando una revision o `error-memory` requiere persistencia, devuelve el cambio propuesto al orquestador, que conserva la responsabilidad de escribir solo en las rutas autorizadas.

## Matriz skill → subagente

| Skill | Subagente(s) |
|-------|----------------|
| `skill_backend_master` | backend-reviewer |
| `skill_postgresql` | backend-reviewer |
| `skill_testing_mandate` | backend-reviewer, docs-tests-reviewer |
| `skill_rbac_autodiscovery` | backend-reviewer, security-rbac-reviewer |
| `skill_clean_architecture` | scope-reviewer, backend-reviewer, frontend-reviewer |
| `skill_design_system_ui` | frontend-reviewer |
| `skill_high_performance_tables` | frontend-reviewer |
| `skill_frontend_master` | frontend-reviewer |
| `skill_ux_expert` | frontend-reviewer |
| `skill_sdd_riper` | scope-reviewer |
| `skill_tech_debt_cleaner` | scope-reviewer (opcional) |
| `skill_documentation_master` | docs-tests-reviewer |
| `skill_error_analysis` | docs-tests-reviewer |
| `skill_commit_convention` | docs-tests-reviewer |
| `skill_infrastructure_auditor` | security-rbac-reviewer |
| `skill_devops_master` | security-rbac-reviewer |
| `skill_git_controlled_push` | flujo principal / AGENTS.md (no revisores) |

## Consecuencias

- **Positivas:** menos drift entre skills y revisores; criterio único para graphify/find-skills.
- **Positivas:** paridad de routing y revisiones entre OpenCode y Codex sin duplicar checklists.
- **Negativas:** mantener la matriz al crear skills nuevos (actualizar este ADR o el subagente de dominio).
- **Negativas:** los cambios de roster requieren actualizar el adaptador Codex homologo.
- **Hecho:** grafo AST local vía `scripts/graphify_build_ast.py`; ver `docs/GUIA_DESARROLLO.md` §6.
- **Opcional:** `graphify extract` con LLM para aristas semánticas en documentación.

## Alternativas consideradas

- Duplicar el protocolo completo en cada uno de los 8 `.md` → rechazado (costo de tokens y drift).
- Dar `bash` a todos los revisores para graphify → rechazado (rompe modelo read-only).
