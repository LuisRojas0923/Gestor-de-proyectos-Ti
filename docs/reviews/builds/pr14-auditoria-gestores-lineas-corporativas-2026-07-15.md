# Revisión Build PR #14: auditoría y gestores de líneas corporativas

**Fecha:** 2026-07-15
**PR:** `#14 Lineas_corporativas`
**Base integrada:** `origin/main` mediante `21b7ce12`
**Modo:** build

## Cambios validados

- Todos los endpoints de líneas corporativas requieren autenticación y permiso `lineas_corporativas`.
- Las mutaciones, importaciones y migración legacy exigen además rol `admin` en backend.
- El CRUD de equipos y personas usa servicios async con commit, rollback y conflictos de integridad controlados.
- La eliminación de líneas se bloquea cuando existe historial facturado.
- Los esquemas normalizan identificadores vacíos y validan modelo, documento y nombre.
- La auditoría resuelve entidades anidadas y redacta documento, nombre, IMEI, serial, identificador y ruta de personas sin alterar otros módulos.
- Los errores internos no se exponen al cliente y las alertas degradan de forma segura si el ERP opcional no responde.
- Los gestores frontend usan `DataTable`, filtros por columna, máximo 200 filas y estados separados de carga, error y vacío.
- `SearchableSelect` usa portal, semántica combobox/listbox y navegación por teclado.
- Las eliminaciones de equipos y personas requieren confirmación accesible y bloquean acciones durante el proceso.
- Las rutas de API del módulo están centralizadas y se eliminó la simulación local de personas ERP.
- Los Excel se limitan a 25 MB, extensión/firma válida y 100 MB descomprimidos.
- El lockfile incluye el peer opcional de Redux requerido para que `npm ci` sea reproducible.

## Evidencia automatizada

Instalación reproducible:

```powershell
docker run --rm -v "<worktree>\frontend:/app" -v "gestor-pr14-node-modules:/app/node_modules" -w /app node:20-alpine npm ci --no-audit --no-fund
```

Frontend focal:

```text
Test Files  7 passed (7)
Tests       16 passed (16)
```

```powershell
docker run --rm -v "<worktree>\frontend:/app" -v "gestor-pr14-node-modules:/app/node_modules" -w /app node:20-alpine npm run test -- --run src/components/atoms/SearchableSelect.test.tsx src/components/molecules/__tests__/DataTable.test.tsx src/components/molecules/__tests__/Modal.test.tsx src/pages/CorporateLines/components/CorporateLinesManagers.test.tsx src/pages/CorporateLines/components/InvoiceDispersionView.test.tsx src/pages/CorporateLines/useCorporateLines.test.tsx src/tests/Subfiltering.test.tsx
```

Lint focal de los archivos TypeScript/TSX modificados:

```text
0 errores
```

```powershell
npx eslint src/components/atoms/MaterialCard.tsx src/components/atoms/SearchableSelect.tsx src/components/atoms/SearchableSelect.test.tsx src/components/molecules/Modal.tsx src/components/molecules/FilterDropdown.tsx src/components/molecules/DataTable.tsx src/components/molecules/__tests__/DataTable.test.tsx src/components/molecules/__tests__/Modal.test.tsx src/config/api.ts src/pages/CorporateLines/CorporateLinesManager.tsx src/pages/CorporateLines/components/EquiposManager.tsx src/pages/CorporateLines/components/LineDetailForm.tsx src/pages/CorporateLines/components/PersonasManager.tsx src/pages/CorporateLines/components/CorporateDeleteConfirmModal.tsx src/pages/CorporateLines/components/CorporateLinesManagers.test.tsx src/pages/CorporateLines/components/InvoiceDispersionView.tsx src/pages/CorporateLines/components/InvoiceDispersionView.test.tsx src/pages/CorporateLines/components/InvoiceRawDataView.tsx src/pages/CorporateLines/useCorporateLines.ts src/pages/CorporateLines/useCorporateLines.test.tsx
```

Comprobación TypeScript de aplicación:

```powershell
npx tsc -p tsconfig.app.json --noEmit
```

La comprobación global se detiene por errores preexistentes fuera de la PR, primero en `RequirementsTab.tsx:262,272`. Una configuración temporal limitada al grafo corporativo no reportó errores en archivos de esta PR; solo deuda histórica importada desde componentes compartidos (`AdminLoginLock`, `DevelopmentEditModal`, `MaterialSearchBar`, `PasswordSetupModal`, `NotificationsContext` y tipos Vite).

Build de producción:

```text
3976 modules transformed
built in 1m 46s
```

```powershell
npm run build
```

La advertencia de chunk principal mayor a 500 kB es deuda transversal preexistente y no bloquea esta PR.

Backend focal contra un backend temporal de la PR:

```text
30 passed, 1 skipped, 11 warnings
```

```powershell
pytest testing/backend/test_lineas_corporativas.py testing/backend/test_lineas_corporativas_seguridad.py -q
```

Suite completa de auditoría:

```text
27 passed, 1 skipped, 2 warnings
```

```powershell
pytest testing/backend/test_auditoria_acciones.py testing/backend/test_auditoria_snapshots_orm.py testing/backend/test_auditoria_stats_fallos.py testing/backend/test_auditoria_estadisticas.py testing/backend/test_auditoria_estadisticas_rbac.py testing/backend/test_auditoria_estadisticas_http.py -q
```

Infraestructura y regresiones:

```text
4 passed, 4 skipped, 2 warnings
```

```powershell
pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q
```

Los skips corresponden al archivo real de factura y a escenarios que requieren datos opcionales del entorno. No hubo fallos finales.

Suite frontend transversal, excluyendo tres archivos con seis fallos históricos ajenos a esta PR:

```text
Test Files  28 passed (28)
Tests       116 passed, 2 skipped
```

```powershell
npx vitest --run --exclude src/tests/MyDevelopmentsRequirements.test.tsx --exclude src/tests/MyDevelopmentsReview.test.tsx --exclude src/pages/Login/RegisterSidebar.test.tsx
```

Los archivos excluidos fallan por mocks/copy históricos de `MyDevelopments` y registro. `Subfiltering.test.tsx`, inicialmente afectado por la mejora semántica de `DataTable`, fue corregido y pasa junto con la suite focal.

## Revisores

| Revisor | Estado | Notas |
|---|---|---|
| backend-reviewer | Aprobado | Sin hallazgos vigentes. |
| frontend-reviewer | Aprobado con riesgos | Recorte, foco, duplicados y contratos tipados corregidos; deuda visual adyacente documentada. |
| security-rbac-reviewer | Aprobado con riesgos | Sin bloqueantes; persiste deuda baja de logs heredados fuera del flujo corregido. |
| docs-tests-reviewer | Aprobado con riesgos | Evidencia consistente; TypeScript global y exclusiones históricas documentados. |
| frontend-table-specialist | Aprobado con riesgos | Sin bloqueantes; virtualización queda como mejora futura. |
| scope-reviewer | Aprobado con riesgos | Alcance coherente, sin artefactos generados ni archivos sobre 550 líneas. |

## Riesgos residuales

- El bundle principal conserva una advertencia de tamaño mayor a 500 kB.
- El lint global, TypeScript global y seis pruebas frontend mantienen deuda histórica fuera del alcance; lint, build y suites relevantes de esta PR están limpios.
- La consulta de alertas depende de un ERP externo y devuelve alertas vacías con indicador de indisponibilidad cuando falla.

## Decisión

`aprobado_con_riesgos`. No quedan hallazgos bloqueantes.
