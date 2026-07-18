# ADR-007: Adaptador del arnes para Google Antigravity

**Estado:** Aceptado
**Fecha:** 2026-07-17
**Autores:** OpenCode

## Contexto

El proyecto ya mantiene revisores canonicos en `.opencode/agent/` y adaptadores read-only en `.codex/agents/`. El equipo tambien usa Google Antigravity, cuyo modelo de personalizacion ofrece reglas, skills y workflows, pero no subagentes personalizados con aislamiento equivalente.

Duplicar checklists en un tercer arnes aumentaria el drift y produciria resultados distintos antes de abrir una PR.

## Decision

1. Mantener `.opencode/agent/*.md` como fuente canonica de routing, mision, referencias, checklist y formato de salida.
2. Crear una skill `.agent/skills/<agente>/SKILL.md` por cada agente canonico. Cada skill solo adapta el rol y referencia la fuente; no copia el checklist.
3. Aplicar guardrails y routing por dominio desde `.agent/rules/`.
4. Orquestar preparacion y validacion de PR mediante `/prepare-pr` y `/validate-pr` en `.agent/workflows/`. La validacion de una candidata no confiable se ejecuta desde un checkout base confiable y no ejecuta codigo de la candidata.
5. Tratar las personas Antigravity como read-only y delegar todas las escrituras al orquestador, porque las skills no constituyen una frontera de seguridad.
6. Validar paridad bidireccional con `scripts/validate_antigravity_harness.py` para cambios propios y confiables; este script no constituye un control de seguridad para ramas no confiables.
7. Configurar activacion Always On, Model Decision o Glob desde la interfaz del IDE; no inventar metadata Markdown no garantizada por la documentacion estable.

## Consecuencias

- Un cambio canonico se refleja en Antigravity sin reescribir criterios.
- La validacion detecta agentes canonicos sin adaptador antes de una PR.
- Antigravity puede ejecutar el mismo orden de routing y revision que los otros arneses.
- Los permisos read-only de las personas dependen de instrucciones y supervision del orquestador, no de aislamiento tecnico.
- La revision de una PR no confiable requiere un checkout separado de la base y se limita a inspeccion estatica.
- El equipo debe configurar una vez la activacion recomendada descrita en `docs/GUIA_ANTIGRAVITY.md`.

## Alternativas consideradas

- Copiar cada checklist a `.agent/skills/`: rechazado por drift y costo de mantenimiento.
- Usar solo `GEMINI.md`: rechazado porque no ofrece personas ni workflows descubribles por tarea.
- Representar skills como subagentes aislados: rechazado porque no coincide con las capacidades actuales de Antigravity.
- Mantener la configuracion solo a nivel global: rechazado porque no seria versionada ni consistente para el equipo.
