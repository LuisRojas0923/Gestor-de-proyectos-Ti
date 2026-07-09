# Docs/tests review — actividades, selector de áreas y registro

Fecha: 2026-07-06
Scope: tests y documentación para anulación lógica de actividades y cambios de selector de área/registro.
Outcome: blocked

## Findings

1. **High** — `testing/backend/test_actividad_delete.py:42-244` cubre el servicio `actividad_delete_service` y schemas, pero no ejercita la lógica nueva de router para `GET /actividades/{id}/preview`, `DELETE /actividades/{id}` ni el bloqueo de `PATCH` sobre actividad anulada. La lógica no cubierta está en `backend_v2/app/api/desarrollos/actividades_router.py:267-268` y `backend_v2/app/api/desarrollos/actividades_router.py:453-496`.
2. **High** — `docs/ESQUEMA_BASE_DATOS.md:323-347` omite `anulada`, `anulada_en` y `anulada_por_id` en el diagrama Mermaid de `ACTIVIDADES`, aunque el diccionario sí los declara en `docs/ESQUEMA_BASE_DATOS.md:1318-1320`; la sección auto-generada queda inconsistente con el modelo.
3. **Medium** — `testing/CATALOGO_PRUEBAS.md:14-40` registra solo la nueva suite backend `test_actividad_delete.py`; no cataloga las suites Vitest nuevas `DeleteActivityModal.test.tsx`, `AreaAutocomplete.test.tsx` y `RegisterSidebar.test.tsx` pese a que son pruebas nuevas del alcance.

## Verification evidence reviewed

- Reportado por orquestador: `testing/backend/test_actividad_delete.py` — 9 passed.
- Reportado por orquestador: `DeleteActivityModal.test.tsx` — 1 passed.
- Reportado por orquestador: `npm build` — passed.
- Reportado por orquestador: eslint focal — warnings only.

## Required tests

- Añadir cobertura backend API para preview/delete/PATCH-anulada con `client` o equivalente, incluyendo permisos del delegador y conteo/estado de anulación.

## Required docs

- Regenerar o corregir `docs/ESQUEMA_BASE_DATOS.md` para que el Mermaid y el diccionario coincidan.
- Registrar las nuevas suites frontend en `testing/CATALOGO_PRUEBAS.md` o en la sección/catálogo frontend correspondiente.

## Blocking reasons

- Cobertura obligatoria faltante para lógica backend nueva expuesta por endpoints.
- Documentación de esquema inconsistente en sección auto-generada.
