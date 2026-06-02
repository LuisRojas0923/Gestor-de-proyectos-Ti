# Bitácora — Protocolo de descubrimiento del arnés OpenCode

**Fecha:** 2026-06-02
**Tema:** Metaconocimiento de subagentes (skills, graphify, find-skills)
**Plan:** `docs/reviews/plans/2026-06-02_opencode-agentes-descubrimiento-skills.md`
**ADR:** `docs/decisions/ADR-006-protocolo-descubrimiento-agentes.md`

## Cambios realizados (MVP build)

- Creado `.opencode/agent/_shared-discovery.md` con protocolo de descubrimiento.
- Actualizados los 8 subagentes: referencia al protocolo + skills cableados según matriz ADR-006.
- Ampliada sección **Skills** en `AGENTS.md`.
- `graphify-out/` ya estaba en `.gitignore` (sin cambio).

## Fase 3 — graphify (2026-06-02)

- Script reproducible: `scripts/graphify_build_ast.py` (AST-only, sin API key LLM).
- Corpus: `backend_v2/app`, `frontend/src`, `docs`.
- Resultado local: **2928 nodos**, **5147 aristas**, **300 comunidades**.
- Documentado en `docs/GUIA_DESARROLLO.md` sección 6.
- `graphify query` validado (ej. autenticación/RBAC).

## Pendiente

- Extracción semántica con `GEMINI_API_KEY` si se desea enriquecer docs/ADRs en el grafo.
- Re-ejecutar matriz de subagentes en modo build sobre este cambio.

## Validación manual

- [x] Existe `_shared-discovery.md`
- [x] Los 8 agentes referencian el protocolo
- [x] ADR-006 con matriz skill → agente
