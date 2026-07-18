# Protocolo de descubrimiento — arnés OpenCode/Codex/Antigravity

Aplica a **todos** los subagentes en `.opencode/agent/` y a sus adaptadores en `.codex/agents/` y `.agent/skills/`. Léelo al inicio de cada revisión o consulta de memoria.

## 1. Skills de proyecto

- Ruta: `.agents/skills/*/SKILL.md`
- Si el dominio del alcance no está cubierto por tus "Mandatory references", revisa el frontmatter (`name`, `description`) de cada skill antes de profundizar.
- Los skills listados como obligatorios en tu archivo de subagente tienen **prioridad** sobre descubrimiento ad hoc.

## 2. Skills obligatorios por subagente

- Definidos en `.opencode/agent/<nombre>.md` bajo `Mandatory references`.
- No sustituyas esta lista por búsqueda genérica sin motivo.

## 3. graphify (consumo vs ejecución)

| Rol | Permiso |
|-----|---------|
| Flujo principal (plan/build/implementación) | Puede ejecutar `/graphify` en alcances grandes o módulos desconocidos |
| Subagentes con `bash: deny` | **Solo lectura** de artefactos ya generados |
| Subagentes con `bash: allow` (whitelist) | Pueden leer artefactos; NO ejecutar el pipeline graphify salvo instrucción explícita |

**Artefactos útiles (si existen):**

- `graphify-out/GRAPH_REPORT.md` — resumen en lenguaje natural
- `graphify-out/graph.json` — grafo para consultas estructuradas

Si `graphify-out/` no existe, no bloquees la revisión; indica al orquestador que ejecute `py -3.12 scripts/graphify_build_ast.py` (AST-only) o `/graphify` con LLM en refactors multi-módulo.

## 4. find-skills (solo flujo principal)

- Skill de ecosistema: búsqueda con `npx skills find <query>` (ver skill `find-skills` en el entorno del usuario).
- Los subagentes **read-only** pueden **recomendar** al orquestador que use find-skills si no hay skill local en `.agents/skills/`.
- **Prohibido** instalar skills externos sin confirmación del usuario.

## 5. Orden de resolución

1. Mandatory references del subagente actual
2. Barrido de `.agents/skills/` por palabras clave del alcance
3. `graphify-out/` si existe (solo lectura para revisores)
4. Recomendación de find-skills al orquestador (sin ejecutar)

## 6. Comandos autorizados por subagente

Desde la sesión 2026-06-03, los subagentes tienen permisos ampliados para ejecutar comandos comunes de inspección sin pedir confirmación. Esto elimina la fricción de invocaciones `bash: ask` que relentizaban las revisiones.

### Tabla de permisos

| Subagente | `edit: allow` (paths) | `bash: allow` (comandos) | `bash: deny` |
|-----------|----------------------|--------------------------|--------------|
| `harness-router` | DENY | DENY | todo |
| `scope-reviewer` | DENY | `git status`, `git log`, `git diff`, `ls`, `cat` (read) | network, write, exec |
| `backend-reviewer` | `docs/reviews/builds/` (write report) | `git status`, `git log`, `git diff`, `git show`, `ls`, `cat`, `python -m pytest --collect-only`, `wc -l`, `head`, `tail` | network, `docker compose`, `pip`, `npm` |
| `frontend-reviewer` | `docs/reviews/builds/` (write report) | `git status`, `git log`, `git diff`, `git show`, `ls`, `cat`, `wc -l`, `head`, `tail` | network, `npm install`, build, dev servers |
| `mobile-reviewer` | `docs/reviews/builds/` (write report) | `git status`, `git log`, `git diff`, `ls`, `cat`, `wc -l` | network, `npm install`, build, native |
| `docs-tests-reviewer` | `docs/reviews/builds/`, `docs/bitacora/`, `errors_memory.json`, `.opencode/memory/`, `graphify-out/` | `git status`, `git log`, `git diff`, `ls`, `cat`, `python -m pytest --collect-only` | network, `docker compose`, build, exec |
| `security-rbac-reviewer` | `docs/reviews/builds/` (write report) | `git status`, `git log`, `git diff`, `git show`, `ls`, `cat`, `grep` (read-only) | network, write fuera de reports, `docker compose` |
| `error-memory` | `errors_memory.json`, `.opencode/memory/*.json` (write) | `ls`, `cat`, `mkdir -p`, `wc -l` (read/struct) | network, `git`, `docker`, `npm` |
| `graphify-searcher` | DENY | `graphify query/path/explain/check-update .` desde raíz, `ls`, `cat`, `wc -l` (read); resto: `bash: ask` | network, write, `docker`, `pip`, `npm`, `git push` |
| `deepseek-searcher` | DENY | igual que `graphify-searcher` (experimental A/B) | network, write, `docker`, `pip`, `npm`, `git push` |

### Reglas globales

1. **Read-before-write**: lee el archivo completo antes de modificarlo.
2. **Atomic write**: escribe el archivo completo, no patches parciales.
3. **Nunca ejecutar comandos destructivos**: `rm`, `mv`, `cp` están DENY por defecto en todos los subagentes.
4. **Nunca instalar dependencias**: `pip install`, `npm install` están DENY.
5. **Nunca pushear**: `git push` está DENY (per `skill_git_controlled_push`).
6. **Network denegado**: `webfetch` y `websearch` están DENY en todos los subagentes.
7. **Task denegado**: los subagentes no se invocan entre sí sin el orquestador.
8. **Secrets fuera de contexto**: no leer `.env` ni variantes ignoradas; revisar solo plantillas versionadas como `.env.example`.

### Comandos comunes heredados de AGENTS.md

Estos comandos están pre-autorizados para todos los subagentes con `bash: allow`:

- `git status` — ver estado del repo
- `git log --oneline -N` — ver historial
- `git diff [path]` — ver cambios no stageados
- `git show <hash>` — ver un commit específico
- `ls [path]` — listar archivos
- `cat [path]` — leer archivo
- `wc -l [path]` — contar líneas
- `head -N [path]` / `tail -N [path]` — leer extremos

### Comandos específicos por dominio

- **Backend**: `python -m pytest --collect-only [path]` — listar tests sin ejecutarlos
- **Frontend**: lectura de `package.json`, `tsconfig.json`, `tailwind.config.js`
- **Mobile**: lectura de `modulo_actividades_fork/INSTRUCCIONES_FORK.md` y archivos versionados bajo `movil/`
- **Docs**: lectura de `docs/bitacora/`, `docs/decisions/`
- **Security**: `grep -rn "pattern" path` para buscar patrones peligrosos
- **Graph searchers** (`graphify-searcher`, `deepseek-searcher`): `graphify query/path/explain/check-update .` desde la raíz del repo. **Nunca** ejecutar `graphify update .` — solo recomendar al orquestador cuando el grafo esté stale.

## 7. Memoria persistente

Cada subagente con permisos de escritura puede persistir en `.opencode/memory/<subagente>.json`:

- `operation_history`: lista de operaciones con timestamp
- `stats`: contadores (total_operations, last_operation, etc.)
- Datos específicos del subagente (e.g., `review_history` para revisores)

`error-memory` es el único subagente con permisos de escritura amplios sobre `errors_memory.json` (registro de errores/decision central) y `.opencode/memory/` (registro por subagente).

## 8. Mantenimiento

Al añadir un skill nuevo en `.agents/skills/`:

1. Referenciarlo en el subagente de dominio correspondiente, **o**
2. Documentarlo en `docs/decisions/ADR-006-protocolo-descubrimiento-agentes.md` (matriz skill → agente).

Al tocar `.agents/skills/` en un build, `docs-tests-reviewer` debe verificar que la matriz ADR o los agentes siguen al día.

Al añadir/modificar permisos de un subagente, actualizar esta tabla.

## 9. Adaptadores Codex y Antigravity

- `.opencode/agent/*.md` es la fuente canonica para roles, checklists, routing y memoria.
- `.codex/agents/*.toml` mantiene el mismo roster de ocho agentes y referencia el Markdown homologo; no debe copiar sus reglas completas.
- Todos los adaptadores Codex usan `sandbox_mode = "read-only"` y devuelven sus reportes inline.
- Si una revision o `error-memory` requiere persistencia, devuelve el cambio propuesto al orquestador para aplicarlo solo en las rutas autorizadas.
- La memoria local `.codex/agent-memory/` no forma parte del proyecto y permanece ignorada.
- `.agent/skills/<agente>/SKILL.md` adapta cada definicion canonica para Google Antigravity sin copiar su checklist.
- Antigravity no ofrece aislamiento equivalente a los subagentes personalizados; sus personas deben trabajar read-only y devolver reportes o escrituras propuestas al orquestador.
- `.agent/rules/` enruta el dominio y `.agent/workflows/` orquesta la invocacion directa de cada persona requerida.
- Al agregar, retirar o renombrar un agente canonico, actualizar en el mismo cambio sus adaptadores aplicables y ejecutar `py -3.12 scripts/validate_antigravity_harness.py`.
