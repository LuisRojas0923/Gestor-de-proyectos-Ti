# Rerevisión final docs/tests — Fase 1P

**Fecha:** 2026-07-17
**Alcance:** reporte Fase 1P, ADR-010, operación DB, plan MCP, catálogo y `task.md`
**Modo:** read-only sobre producto; solo se persiste este reporte
**Resultado docs/tests:** `approved_with_risks`

## 1. Veredictos separados

1. **Calidad técnica/documental: APROBADA.** La evidencia y los documentos
   canónicos permiten revisar y operar Fase 1P. Las inconsistencias restantes
   son de trazabilidad/histórico y no invalidan el comportamiento documentado.
2. **Gate humano/ERP: PENDIENTE.** Faltan la aprobación humana, el SHA propio y
   ejecutar los cuatro casos omitidos en el entorno ERP objetivo o registrar un
   waiver explícito (`task.md:49-51`). Esta puerta posterior no se usa como
   bloqueo de calidad documental.

## 2. Conformidades verificadas

- La separación migrador/runtime coincide entre `ADR-010:15-24`,
  `OPERACION_MIGRACIONES_DB.md:3-17,53-72`, `task.md:9-11,34-47` y el reporte
  `2026-07-16_planilla-regional-fase-1p.md:10-18,140-152`.
- La instrucción de startup de `PLAN_SERVIDOR_MCP.md:139` ya exige
  `python -m app.manage migrate` antes de FastAPI y startup verify-only; coincide
  con `ADR-010:15-21` y `OPERACION_MIGRACIONES_DB.md:97-99`.
- El docstring de `rbac_discovery.py:48-52` ya identifica la sincronización como
  exclusiva del job migrador.
- El reporte conserva la evidencia ejecutada sin sumar reruns como casos nuevos:
  **44 passed** focales (`reporte:53-54`), rerun endpoint **6 passed**
  (`:55-56`), aceptación final **1 passed / 195.17 s** (`:57-58`) y legacy
  **9 passed / 3 failed / 179.04 s**, con `WinError 64` del PostgreSQL compartido
  y Redis local ausente (`:126-130`).
- Graphify coincide exactamente: reporte `:131` y
  `graphify-out/GRAPH_REPORT.md:7` registran **4824 nodos / 9407 aristas /
  356 comunidades**.
- El límite de **500 líneas** para código y pruebas está fijado en
  `task.md:60` y explicado en el reporte `:133-138`. Se verificó directamente
  `test_auth_escalation.py` en 500 líneas, `test_startup_migration_roles.py` en
  496 y la separación de la aceptación en helper/test.
- La deuda fuera de alcance está explícita y accionable en el reporte
  `:161-177`; no se presenta como cobertura cerrada por Fase 1P.
- Las suites nuevas están registradas en `testing/CATALOGO_PRUEBAS.md:71-74`.
  El esquema refleja `configuracion_seguridad_runtime` y los campos de sesión en
  `docs/ESQUEMA_BASE_DATOS.md:2301-2305,3521-3537`. ADR-010 cubre la decisión
  durable. No hubo cambio de skills/agentes, por lo que ADR-006 no aplica.
- Un build report reemplaza la necesidad de una bitácora adicional para esta
  sesión. No corresponde añadir una decisión duplicada a `errors_memory.json`.

## 3. Hallazgos no bloqueantes

### MEDIO — El catálogo no conserva la misma granularidad temporal de la evidencia

`testing/CATALOGO_PRUEBAS.md:71-74` afirma 30 + 9 + 6 pruebas pasadas por archivo,
mientras el reporte registra el run combinado exacto como 44 y luego un rerun de
6 (`2026-07-16_planilla-regional-fase-1p.md:53-56`). La recolección read-only
actual encuentra **30 + 9 + 6 = 45** casos; esto indica que el inventario vigente
creció un caso respecto del run combinado de 44, no que el reporte deba
reescribirse a 45. Para trazabilidad estricta, el catálogo debería marcar el
estado como “44 passed en run combinado; endpoint 6 passed en rerun; 45 casos
vigentes recolectados”, o registrar el pase posterior del caso número 45.

### MEDIO — `PLAN_SERVIDOR_MCP.md` conserva snippets históricos incompatibles

Aunque la instrucción de migración quedó corregida en `PLAN_SERVIDOR_MCP.md:139`,
el documento sigue etiquetado como plan en revisión y contiene ejemplos previos
a Fase 1P: persiste el JWT en claro (`:249-253`), hace la auditoría fail-open en
otra transacción (`:317-337`) y propone copiar el secreto de firma al JSON del
cliente (`:680-705`). Esto contradice el hash de sesión y atomicidad aceptados en
`ADR-010:38-47` y reportados en el build `:76-85`. No bloquea Fase 1P porque
ADR-010 y el runbook son canónicos, pero el plan debe llevar un aviso de snippets
históricos/supersedidos antes de reutilizarse para implementar el servidor MCP.

### BAJO — El docstring RBAC quedó parcialmente obsoleto

`backend_v2/app/services/auth/rbac_discovery.py:53-55` aún dice “SELECT + INSERT”
y atribuye la concurrencia a workers Uvicorn. El código usa
`INSERT ... ON CONFLICT` (`:71-75`) y la función es exclusiva del migrador
(`:48-52`). Corregir esas dos líneas evitaría drift, sin impacto operativo.

## 4. Verificación de pruebas

Este revisor no ejecutó suites por su alcance read-only. Ejecutó únicamente
`python -m pytest --collect-only`:

- `test_startup_migration_roles.py`: 30 recolectadas.
- `test_phase1p_auth_security.py`: 9 recolectadas.
- `test_phase1p_endpoint_security.py`: 6 recolectadas.
- `test_startup_migration_roles_postgres.py`: 1 recolectada.

No se requieren pruebas nuevas para aprobar calidad Fase 1P. Como puerta
posterior permanecen los cuatro casos ERP o su waiver y, para eliminar la
ambigüedad del catálogo, un rerun focal vigente de los 45 casos.

## 5. Salida

```text
Docs/tests review: approved_with_risks
Findings: 0 críticos, 0 altos, 2 medios y 1 bajo; calidad técnica/documental APROBADA.
Required tests: ninguna prueba nueva; gate posterior de 4 casos ERP o waiver, y recomendable rerun focal vigente de 45 casos para reconciliar catálogo.
Required docs: marcar snippets históricos del PLAN_SERVIDOR_MCP como supersedidos; alinear catálogo con la cronología 44 + rerun 6; corregir dos líneas del docstring RBAC.
Blocking reasons: ninguno para calidad técnica/documental. Gate humano/ERP PENDIENTE: aprobación, SHA propio y ERP/waiver.
```
