# Plantilla — Reporte de Revisión de Build

**Fecha:** YYYY-MM-DD
**Build:** <titulo corto de la implementacion>
**Autor del build:** <agente o persona>
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/...`
- `frontend/...`
- `modulo_actividades_fork/...`
- `testing/...`
- `docs/...`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| docs-tests-reviewer | <...> | <...> | <...> |
| scope-reviewer | <...> | <...> | (solo si el alcance cambio) |
| backend-reviewer | <...> | <...> | <...> |
| frontend-reviewer | <...> | <...> | <...> |
| mobile-reviewer | <...> | <...> | <...> |
| security-rbac-reviewer | <...> | <...> | <...> |

## 3. Hallazgos bloqueantes

<ninguno / lista>

## 4. Hallazgos no bloqueantes

<ninguno / lista>

## 5. Tests / comandos ejecutados

- `docker compose exec backend pytest testing/backend/...` — PASS / FAIL
- `cd frontend && npm run lint` — PASS / FAIL
- `cd frontend && npm run build` — PASS / FAIL
- `docker compose exec backend alembic upgrade head` — PASS / FAIL

(Si algun comando no se ejecuto, justificar la razon aqui.)

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` (si cambiaron modelos)
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` (si fue decision durable)
- [ ] `docs/bitacora/<YYYY-MM-DD>-<tema>.md` (si la sesion es relevante)
- [ ] `errors_memory.json` (si se registro error o decision)

(Si nada aplica, justificar.)

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos` (riesgos documentados arriba)
- [ ] `bloqueado` (motivos en hallazgos bloqueantes)

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| <accion 1> | <quien> | YYYY-MM-DD |
| <accion 2> | <quien> | YYYY-MM-DD |
