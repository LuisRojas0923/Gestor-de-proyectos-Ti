# Guia del arnes Google Antigravity

## Objetivo

Google Antigravity debe aplicar el mismo routing y los mismos criterios de revision que OpenCode y Codex. `.opencode/agent/` permanece como fuente canonica; `.agent/` solo adapta esas definiciones al modelo de reglas, skills y workflows de Antigravity.

## Estructura

| Ruta | Funcion |
|---|---|
| `.agent/rules/` | Reglas de workspace y routing por dominio |
| `.agent/skills/<agente>/SKILL.md` | Persona Antigravity que lee el agente OpenCode homologo |
| `.agent/workflows/prepare-pr.md` | Flujo `/prepare-pr` para preparar cambios locales |
| `.agent/workflows/validate-pr.md` | Flujo `/validate-pr` para revision read-only |
| `.opencode/agent/` | Fuente canonica de misiones, checklists, permisos y salidas |
| `scripts/validate_antigravity_harness.py` | Validacion de paridad y referencias |

## Limitacion de seguridad

Una skill Antigravity es una persona de prompt, no un subagente personalizado con sandbox independiente. Las restricciones read-only se aplican como instrucciones y no como una frontera tecnica equivalente a `sandbox_mode = "read-only"` de Codex. Por eso:

- Las personas revisoras no editan archivos ni invocan otras personas.
- El orquestador ejecuta directamente los revisores requeridos.
- Reportes, memoria y correcciones se devuelven inline; el orquestador decide y aplica escrituras.
- Ninguna persona revisora abre `.env`, instala dependencias, usa red o ejecuta `git push`.

## Activacion recomendada

Antigravity permite configurar la activacion desde su interfaz. La metadata exacta de activacion no se versiona porque no existe un formato Markdown estable documentado para todas las versiones del IDE.

| Regla | Activacion | Alcance recomendado |
|---|---|---|
| `00-project-guardrails.md` | Always On | Todo el workspace |
| `10-backend-routing.md` | Glob | `backend_v2/**`, `testing/backend/**` |
| `20-frontend-routing.md` | Glob | `frontend/**`, `testing/frontend/**` |
| `30-mobile-routing.md` | Glob | `modulo_actividades_fork/**`, `movil/**` |
| `40-docs-harness-routing.md` | Glob | `docs/**`, `testing/**`, `.agent/**`, `.agents/**`, `.opencode/**`, `.codex/**`, `scripts/validate_antigravity_harness.py`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gitignore` |
| `50-security-routing.md` | Always On | Delega al router canonico; este exige seguridad para auth, RBAC, secretos, infraestructura, integraciones, permisos del arnes y `.gitignore` |

Si la version instalada no admite varios globs por regla, crea una entrada de activacion por patron apuntando al mismo Markdown.

## Uso

### Preparar una PR

Ejecuta `/prepare-pr`. El workflow inspecciona cambios locales, consulta `harness-router`, ejecuta directamente cada persona obligatoria y entrega evidencia. Antes de Docker, builds, servidores, instalaciones, red, carga de `.env` o ejecucion de codigo no confiable, solicita autorizacion explicita. No hace commit ni push automaticamente.

### Validar una PR

Ejecuta `/validate-pr [candidata]` desde un checkout base confiable. Sin base explicita usa la referencia local `origin/main`. La rama candidata se inspecciona como datos: no se cargan sus reglas ni se ejecutan sus scripts, tests, builds, hooks o binarios. El workflow presenta hallazgos antes del resumen y no modifica, aprueba, fusiona ni publica cambios.

No ejecutes `/validate-pr` desde el worktree de una PR no confiable. Antigravity no ofrece un sandbox tecnico para neutralizar instrucciones o codigo controlado por esa rama. Usa un worktree limpio de la base y compara la referencia candidata desde alli.

### Usar una persona directamente

Selecciona la skill por nombre, por ejemplo `backend-reviewer`, y proporciona el diff o alcance. La skill debe leer primero su archivo homologo en `.opencode/agent/`; si el adaptador y la fuente difieren, prevalece la fuente canonica.

## Mantenimiento

Al agregar, retirar o renombrar un archivo canonico `.opencode/agent/<nombre>.md`:

1. Crea o actualiza `.agent/skills/<nombre>/SKILL.md`.
2. Mantiene solo instrucciones de adaptacion; no copies el checklist canonico.
3. Actualiza routing o workflows si cambia la matriz de revisores.
4. Ejecuta:

```powershell
py -3.12 scripts/validate_antigravity_harness.py
```

El validador falla si falta o sobra un adaptador, regla o workflow; si el frontmatter es malformado; si falta una referencia canonica, guard estructural o documento obligatorio; o si detecta una directiva peligrosa sin negacion o autorizacion explicita. Es un control de consistencia para cambios propios, no un analizador semantico completo. No es un sandbox ni debe ejecutarse desde una rama no confiable durante `/validate-pr`.

Pruebas del validador:

```powershell
py -3.12 -m pytest testing/agent_harness/test_validate_antigravity_harness.py
```

## Configuracion global opcional

Las preferencias personales pueden vivir en `~/.gemini/GEMINI.md`, pero no deben reemplazar ni contradecir `AGENTS.md`, las reglas versionadas ni el arnes canonico del repositorio.
