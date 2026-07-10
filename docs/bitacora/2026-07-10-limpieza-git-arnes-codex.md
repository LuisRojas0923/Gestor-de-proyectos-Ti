# Bitacora - Limpieza Git y arnes Codex

**Fecha:** 2026-07-10
**Alcance:** ramas locales fusionadas, dependencias moviles ignoradas y adaptadores de subagentes Codex.

## Decision

`.opencode/agent/*.md` permanece como fuente canonica del roster de ocho subagentes. `.codex/agents/*.toml` contiene adaptadores de solo lectura que cargan esas reglas; cualquier persistencia se delega al orquestador.

## Cambios

- Se eliminaron seis referencias locales ya contenidas en `main`; no se eliminaron ramas remotas.
- Se conservo el worktree `feature/autogestion-usuarios-erp` porque contiene cambios sin confirmar.
- Se ignora `movil/node_modules/` y la memoria local `.codex/agent-memory/`.
- Se alineo el routing para backend, frontend y los arboles moviles `modulo_actividades_fork/` y `movil/`.
- Se prohibio a los subagentes leer archivos `.env` ignorados.

## Evidencia

- Parseo con `tomllib` -> 8 TOML validos, nombres unicos, roster completo y sandboxes de solo lectura.
- `codex doctor --summary --ascii` -> 17 OK, 1 idle, 0 warnings y 0 fallos.
- Smoke routing multidominio -> backend, frontend, mobile, security y docs-tests seleccionados correctamente.
- Busqueda de secretos, rutas absolutas y referencias al especialista eliminado -> sin coincidencias.
- No se ejecutaron pruebas de aplicacion porque no cambiaron backend, frontend ni comportamiento funcional.
