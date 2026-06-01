# Plantilla — Reporte de Revisión de Plan

**Fecha:** YYYY-MM-DD
**Plan:** <titulo corto del plan>
**Autor del plan:** <agente o persona>
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

<descripcion del objetivo>

## 2. No-objetivos

- <cosa 1 que NO se hace>
- <cosa 2 que NO se hace>

## 3. Archivos / modulos afectados

- `backend_v2/...`
- `frontend/...`
- `modulo_actividades_fork/...`
- `testing/...`
- `docs/...`
- `database/...`

## 4. Pasos de implementacion

1. <paso 1>
2. <paso 2>
3. <paso 3>

## 5. Comandos de validacion

- `docker compose exec backend pytest testing/backend/...`
- `cd frontend && npm run lint && npm run build`
- `docker compose exec backend alembic upgrade head`

## 6. Impacto en documentacion

- [ ] `docs/ESQUEMA_BASE_DATOS.md` (si cambian modelos)
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` (si es decision durable)
- [ ] `docs/bitacora/<YYYY-MM-DD>-<tema>.md` (si la sesion es relevante)
- [ ] `README.md` (si cambia uso publico)

## 7. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| <riesgo 1> | M/A/B | <como se mitiga> |
| <riesgo 2> | M/A/B | <como se mitiga> |

## 8. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
scope-reviewer | Siempre en plan | <approved/approved_with_risks/blocked> | <si/no>
backend-reviewer | <motivo> | <...> | <...>
frontend-reviewer | <motivo> | <...> | <...>
mobile-reviewer | <motivo> | <...> | <...>
docs-tests-reviewer | <motivo> | <...> | <...>
security-rbac-reviewer | <motivo> | <...> | <...>
```

## 9. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos` (riesgos documentados arriba)
- [ ] `bloqueado` (motivos en columna "Bloquea")

## 10. Notas adicionales

<opcional>
