# Guardrails del proyecto

Aplica estas reglas en todo el workspace:

1. Lee `AGENTS.md`, `CLAUDE.md` y `.opencode/agent/_shared-discovery.md` antes de trabajo no trivial.
2. Trata `.opencode/agent/*.md` como fuente canonica de routing, misiones, checklists y formatos de salida. Los adaptadores Antigravity no los sustituyen.
3. Consulta la persona `harness-router` para determinar revisores y ejecuta directamente cada persona obligatoria. El router no aprueba ni invoca revisores.
4. Conserva cambios ajenos del worktree. No reviertas, sobrescribas ni incluyas archivos no relacionados.
5. No leas `.env` ni variantes ignoradas. Usa solo plantillas versionadas como `.env.example`.
6. No instales dependencias ni hagas peticiones de red durante una revision.
7. Nunca ejecutes `git push` sin una instruccion explicita del usuario.
8. Antigravity no aisla personas como subagentes personalizados. Durante revisiones, opera read-only y devuelve reportes o escrituras propuestas al orquestador.
