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

## Skills

Use relevant skills from `.agents/skills/` for specific tasks.
