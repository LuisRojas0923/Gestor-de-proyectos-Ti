# AI Agent Instructions for Gestor-de-proyectos-Ti

## Project Overview

Full-stack project management system with Python backend (FastAPI, SQLAlchemy async, PostgreSQL) and React frontend (TypeScript, Vite, Tailwind CSS). Manages IT developments, tickets, KPIs, expenses, inventory, etc. All database names and user-facing text in Spanish.

## Key Conventions

- **Naming:** All database fields, enums, and strings in Spanish. Commit messages in Spanish.
- **Async:** All backend DB operations async. Frontend API calls async.
- **RBAC:** Register new features in `backend_v2/app/core/rbac_manifest.py` for auto-discovery.
- **Design System:** Use atomic components only; no raw HTML tags. CSS variables for theming.
- **Commits:** Format `<tipo>[ámbito]: <descripción en español>` (feat, fix, ui, refactor, docs, chore).
- **File Size:** Max 550 lines; split larger files.
- **Tests:** TDD for backend; mandatory tests for new features/bugfixes.

## Build/Test Commands

- Docker: `docker compose up --build`
- Backend tests: `pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py`
- Frontend: `cd frontend && npm run dev`

## Architecture Boundaries

- Backend: router → service → model (all async)
- Frontend: pages coordinate, components render, services call API, hooks encapsulate logic
- Database: PostgreSQL async via asyncpg

## Common Pitfalls

- Avoid sync DB calls; always async.
- Use design system components; no hardcoded colors or HTML.
- Register RBAC for new features.
- Run health checks before commits.

## Documentation

- [CLAUDE.md](CLAUDE.md) - Agent rules and overview
- [docs/ARQUITECTURA_FRONTEND.md](docs/ARQUITECTURA_FRONTEND.md) - Frontend architecture
- [docs/ESQUEMA_BASE_DATOS.md](docs/ESQUEMA_BASE_DATOS.md) - Database schema
- [docs/GUIA_DESARROLLO.md](docs/GUIA_DESARROLLO.md) - Development guide

## Subagentes disponibles (opencode harness)

El arnés de opencode expone 8 subagentes especializados en `.opencode/agent/`. Cada uno es de solo lectura y debe invocarse segun el alcance del trabajo (consultar `harness-router` para recomendacion, pero invocacion directa obligatoria):

- `harness-router` — recomienda la matriz de subagentes segun alcance. Read-only, no aprueba ni invoca.
- `scope-reviewer` — valida alcance y subagentes requeridos.
- `backend-reviewer` — revisa `backend_v2/` (FastAPI, SQLAlchemy async, PostgreSQL, RBAC, tests).
- `frontend-reviewer` — revisa `frontend/` (design system, atomic design, mobile-first, performance).
- `mobile-reviewer` — revisa `modulo_actividades_fork/` (React Native, offline, nativo).
- `docs-tests-reviewer` — revisa `docs/`, `testing/`, bitacora, ADRs, MER, evidencia de tests.
- `security-rbac-reviewer` — revisa auth, RBAC, secrets, schemas, PII, infra.
- `error-memory` — memoria persistente de errores y decisiones (`errors_memory.json` + `.opencode/memory/`).

Reportes no triviales se persisten en `docs/reviews/{plans,builds}/` usando las plantillas de `docs/reviews/templates/`.

## Skills

### Skills de proyecto

Usar según dominio: cada skill vive en `.agents/skills/<nombre>/SKILL.md`. Los subagentes listan referencias obligatorias en `.opencode/agent/<revisor>.md`.

### Protocolo del arnés OpenCode

Antes de revisar o implementar con subagentes, leer:

- `.opencode/agent/_shared-discovery.md` — orden de resolución (skills locales → graphify → find-skills)
- `docs/decisions/ADR-006-protocolo-descubrimiento-agentes.md` — matriz skill → subagente

### Exploración del codebase (graphify)

- Generación local (sin API key): `py -3.12 scripts/graphify_build_ast.py` → `graphify-out/GRAPH_REPORT.md`
- Con `GEMINI_API_KEY` en `.env`: `py -3.12 scripts/graphify_from_env.py extract docs --out . --backend gemini` (carga `.env` automáticamente).
- `py -3.12 -m graphify` **no** lee `.env` solo; usar `graphify_from_env.py` o exportar variables a mano.
- Salida esperada: `graphify-out/GRAPH_REPORT.md` y `graphify-out/graph.json` (directorio ignorado por git).
- Los **subagentes read-only** solo consumen artefactos existentes; no ejecutan el pipeline.
- Detalle: `docs/GUIA_DESARROLLO.md` sección 6.

### Descubrimiento externo (find-skills)

- Solo el orquestador/implementación: `npx skills find <query>` cuando no exista skill en `.agents/skills/`.
- No instalar skills sin confirmación del usuario.
- Catálogo: https://skills.sh/

### Push a remoto

- `skill_git_controlled_push`: no hacer `git push` sin instrucción explícita del usuario.
