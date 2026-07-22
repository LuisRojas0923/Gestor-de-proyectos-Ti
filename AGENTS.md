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

## Subagentes disponibles (OpenCode/Codex/Antigravity harness)

El arnes canonico expone 8 roles de revision/memoria en `.opencode/agent/`. Codex usa adaptadores con el mismo roster en `.codex/agents/`; esos TOML deben leer su definicion canonica homologa para evitar drift. Antigravity usa personas equivalentes en `.agent/skills/` y workflows en `.agent/workflows/`; no son subagentes aislados, por lo que devuelven reportes y propuestas de escritura al orquestador. Los revisores deben invocarse segun el alcance del trabajo (consultar `harness-router` para recomendacion, pero invocacion directa obligatoria). En OpenCode, `error-memory` es el unico rol con mutacion directa amplia de la memoria central; otros revisores solo pueden persistir reportes o memoria en sus rutas autorizadas. En Codex y Antigravity, los adaptadores delegan todas esas escrituras al orquestador:

- `harness-router` — recomienda la matriz de subagentes segun alcance. Read-only, no aprueba ni invoca.
- `scope-reviewer` — valida alcance y subagentes requeridos.
- `backend-reviewer` — revisa `backend_v2/` (FastAPI, SQLAlchemy async, PostgreSQL, RBAC, tests).
- `frontend-reviewer` — revisa `frontend/` (design system, atomic design, mobile-first, performance).
- `mobile-reviewer` — revisa `modulo_actividades_fork/` y `movil/` (React Native, offline, nativo).
- `docs-tests-reviewer` — revisa `docs/`, `testing/`, bitacora, ADRs, MER, evidencia de tests.
- `security-rbac-reviewer` — revisa auth, RBAC, secrets, schemas, PII, infra.
- `error-memory` — memoria persistente de errores y decisiones (`errors_memory.json` + `.opencode/memory/`).

Ayudante de exploracion canonico:

- `graphify-searcher` — busqueda read-only sobre `graphify-out/`; usa `graphify query/path/explain` antes de Glob/Grep.

Reportes no triviales se persisten en `docs/reviews/{plans,builds}/` usando las plantillas de `docs/reviews/templates/`.

## Skills

### Skills de proyecto

Usar según dominio: cada skill vive en `.agents/skills/<nombre>/SKILL.md`. Los subagentes listan referencias obligatorias en `.opencode/agent/<revisor>.md`.

### Protocolo del arnes OpenCode/Codex/Antigravity

Antes de revisar o implementar con subagentes, leer:

- `.opencode/agent/_shared-discovery.md` — orden de resolución (skills locales → graphify → find-skills)
- `docs/decisions/ADR-006-protocolo-descubrimiento-agentes.md` — matriz skill → subagente
- `.codex/agents/*.toml` — adaptadores Codex; no duplican checklists ni memoria
- `.agent/skills/*/SKILL.md` — adaptadores Antigravity; cada uno referencia su agente canonico
- `.agent/workflows/*.md` — flujos Antigravity para preparar y validar PRs
- `py -3.12 scripts/validate_antigravity_harness.py` — valida paridad y referencias

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

## Protocolo de Rigurosidad Estricto de Desarrollo

Para garantizar que el código entregado sea de nivel de producción y 100% confiable, todo desarrollo o modificación debe cumplir obligatoriamente con los siguientes pasos antes de dar por completada la tarea:

1. **Auditoría Proactiva Obligatoria en 5 Pilares**:
   - **Seguridad y RBAC**: Verificar que los endpoints requieran JWT y permisos de rol adecuados (ej. `requiere_permiso_nomina_novedades`).
   - **Formatos de Datos Reales**: Validar notaciones locales (`es-CO`, ej. `391.085,00`), valores `None`/`NaN`, espacios y encodings reales.
   - **Protección contra Pérdida de Datos**: Garantizar que ante errores de lectura o 0 filas extraídas, la BD no ejecute eliminaciones en caliente.
   - **Límites de Recursos y Seguridad**: Aplicar `@limiter.limit`, límites de peso por archivo (ej. 10MB), total (25MB) y límites de filas/hojas contra bombas de memoria.
   - **Aislamiento de Dominio**: Usar claves compuestas (ej. `(file_idx, sheet_name, cert)`) para evitar que certificados o registros entre distintos archivos/hojas se mezclen.

2. **Pruebas Adversarias y Destructivas (Adversarial Testing)**:
   - Las pruebas unitarias no se limitarán al caso ideal.
   - Se deben incluir casos destructivos: archivos corruptos, PDFs disfrazados con extensión `.xlsx`, notaciones COP complejas, headers desplazados (`skiprows`), etc.

3. **Verificación de Linters y Tipado Estricto**:
   - Backend: Validar que la suite de `pytest` pase al 100%.
   - Frontend: Validar que los archivos TypeScript/React no contengan tipos `any` implícitos/explícitos ni importaciones obsoletas/sin uso según ESLint.

