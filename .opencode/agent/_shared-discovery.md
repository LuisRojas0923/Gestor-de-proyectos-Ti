# Protocolo de descubrimiento — arnés OpenCode

Aplica a **todos** los subagentes en `.opencode/agent/`. Léelo al inicio de cada revisión o consulta de memoria.

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
| Subagentes con `bash: ask` | No ejecutar pipeline salvo instrucción explícita del usuario |

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

## 6. Mantenimiento

Al añadir un skill nuevo en `.agents/skills/`:

1. Referenciarlo en el subagente de dominio correspondiente, **o**
2. Documentarlo en `docs/decisions/ADR-006-protocolo-descubrimiento-agentes.md` (matriz skill → agente).

Al tocar `.agents/skills/` en un build, `docs-tests-reviewer` debe verificar que la matriz ADR o los agentes siguen al día.
