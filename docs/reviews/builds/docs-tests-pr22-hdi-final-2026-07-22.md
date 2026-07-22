# Docs/tests review — cierre final local PR #22 HDI

**Fecha:** 2026-07-22
**Resultado:** `approved_with_risks`
**Alcance:** cobertura de hallazgos previos, catálogo de pruebas, reporte canónico y evidencia final local de PR #22.

## Evidencia aceptada

- Backend focalizado: **68 passed**.
- Health checks: **4 passed, 4 skipped**.
- Frontend focalizado (`HdiPreview.test.tsx`): **5 passed**.
- ESLint focalizado, build frontend, `py_compile` y diff-check: **PASS**.
- La recolección independiente con `python -m pytest --collect-only` no pudo ejecutarse en el host porque no está instalado `pytest`; no se ejecutó Docker por restricción del rol. Los conteos anteriores son evidencia suministrada por el orquestador.

## Cobertura de hallazgos anteriores

| Hallazgo previo | Evidencia actual | Estado |
|---|---|---|
| Tipos exactos HDI | `test_hdi_extractor_grupos.py` rechaza nombres numéricos, booleanos y flotantes, además de primas mal formadas con dígitos y booleanos; `hdi_extractor.py` valida texto y gramática monetaria antes de normalizar. | Cubierto |
| Aborto y preservación ante entrada inválida | La matriz de filas inválidas aborta el DataFrame completo; `test_hdi_excel_security.py` comprueba que una extracción fallida/vacía no ejecuta borrado ni commit. | Cubierto por composición |
| RBAC del router genérico | `test_nomina_rbac_concurrencia.py` parametriza 401 y 403 sobre ocho rutas sensibles: carga, proceso, historial, preview, descarga, resumen, detalle y exportación. | Cubierto |
| Errores 500 seguros | El router reemplaza interpolaciones de `str(e)` por mensajes genéricos y logging; existe regresión HTTP para preview. | Cubierto; no todas las ramas 500 tienen caso HTTP individual |
| Confinamiento de descarga | La ruta se resuelve contra `uploads/nomina`, exige archivo directo bajo la raíz y cuenta con regresión de ruta externa. | Cubierto |
| Cancelación durante commit | `NominaService` protege y espera el commit; la regresión cancela durante commit y comprueba que el archivo confirmado no se elimina. | Cubierto |
| Frontend autenticado, accesible y con errores | Los cinco Vitest cubren GET/POST mediante `useApi`, `FormData`, rechazo de formato, nombre accesible, diagnóstico de POST y error de GET. | Cubierto |

Los bloqueos descritos en `backend-pr22-hdi-latest-rereview-2026-07-22.md`, `security-pr22-nomina-2026-07-22.md` y `docs-tests-pr22-findings-final-2026-07-22.md` corresponden a estados anteriores del árbol. Su cierre está confirmado por `backend-pr22-hdi-final-local-2026-07-22.md` (`approved`), `security-pr22-hdi-final-2026-07-22.md` (`approved_with_risks`), `frontend-pr22-hdi-final-2026-07-22.md` (`approved_with_risks`) y este reporte.

## Cifras y archivos desactualizados

### Reporte canónico `docs/reviews/builds/2026-07-22_pr22-hdi-final.md`

Debe corregirse antes del cierre documental:

1. Reemplazar **25 passed backend** por **68 passed backend focalizados**.
2. Reemplazar **2 passed frontend** por **5 passed frontend**.
3. Mantener health en **4 passed / 4 skipped** y los cuatro gates ESLint focalizado/build/`py_compile`/diff-check en **PASS**.
4. Eliminar o rotular como histórica la cifra de **504 errores** de lint global: no forma parte de la evidencia final actual; la evidencia disponible es ESLint focalizado PASS.
5. Añadir a la lista de archivos:
   - `backend_v2/app/api/novedades_nomina/nomina_router.py`
   - `backend_v2/app/services/novedades_nomina/errores.py`
   - `testing/backend/test_nomina_rbac_concurrencia.py`
6. Actualizar la tabla de subagentes con los reportes finales vigentes: backend `approved`; seguridad, frontend y docs/tests `approved_with_risks`. Enlazar los cuatro reportes finales y rotular las re-revisiones bloqueadas como históricas/superadas.
7. Ampliar la lista de cobertura con contrato estricto de columnas/tipos, RBAC de rutas genéricas, mensajes 500 saneados, confinamiento de descarga y cancelación durante commit.

### Catálogo `testing/CATALOGO_PRUEBAS.md`

- La fila backend de seguridad/concurrencia registra correctamente `test_nomina_rbac_concurrencia.py`.
- La fila frontend de HDI está desactualizada. Sustituir su descripción por: **“Archivo único XLS/XLSX; GET/POST mediante cliente autenticado; contenido FormData; rechazo de formatos; nombre accesible/foco; diagnóstico de procesamiento y error de consulta.”**
- Conviene ampliar la fila backend **Seguros HDI Excel** con: **“encabezados y tipos obligatorios exactos, rechazo atómico de filas inválidas y formatos monetarios estrictos”**.

### Memoria y addenda

- `errors_memory.json`, `ERR-003.evidencia`, aún dice **25 backend / 2 frontend**; actualizar a **68 backend / 5 frontend**, conservando **4 passed / 4 skipped** health y los gates PASS.
- `errors_memory.json`, `ERR-004.evidencia`, aún dice **3 frontend**; actualizar a **5 frontend** e incluir cobertura de errores POST/GET.
- Marcar como **superados por este cierre** los reportes locales que conservan 48/3 o veredictos bloqueados, sin borrar su valor histórico: `docs-tests-pr22-findings-final-2026-07-22.md`, `backend-pr22-hdi-latest-rereview-2026-07-22.md`, `security-pr22-nomina-2026-07-22.md` y `frontend-hdi-preview-authenticated-api-2026-07-22.md`.

## Riesgos no bloqueantes

- Cuatro health checks siguen omitidos por credenciales/token del entorno.
- La prueba PostgreSQL del advisory lock usa `sleep(0.1)` y conserva un riesgo bajo de falso positivo de sincronización.
- La regresión de descarga usa una ruta externa normalmente inexistente y puede salir por `resolve(strict=True)` antes de demostrar la comparación de confinamiento; la implementación estática sí aplica el control.
- Falta un caso positivo explícito para el formato monetario US `1,234,567.89` y parametrizar las demás ramas HTTP 500.
- Frontend aún puede duplicar notificaciones de red entre `useApi` y el componente; un GET fallido no limpia datos anteriores y no se cubren respuestas fuera de orden/StrictMode.
- Persisten deudas no bloqueantes de frontend: selector/banners/spinners fuera de componentes atómicos, botón volver sin nombre accesible y endpoints fuera de `API_ENDPOINTS`.
- `GET /catalogo` sigue público sin PII/mutación, y el cargador genérico conserva detalles internos en logs/`error_log`; la revisión de seguridad los clasifica bajos.
- La aritmética monetaria continúa con `float`; migrar a `Decimal` queda como endurecimiento futuro.

## Documentación no aplicable

- `docs/ESQUEMA_BASE_DATOS.md`: no cambia el esquema ni modelos.
- ADR/ADR-006: no hay decisión arquitectónica nueva ni cambios en skills/agentes.
- Bitácora: este reporte conserva el contexto durable del cierre.

```text
Docs/tests review: approved_with_risks
Findings: los bloqueos previos de tipos HDI, RBAC genérico, errores seguros, confinamiento, cancelación y frontend están cubiertos; persisten cifras y descripciones documentales anteriores al run 68/5.
Required tests: ninguno bloqueante. Recomendados: importe US con decimales, sincronización determinista del segundo advisory lock, ruta externa existente/symlink, ramas HTTP 500 restantes, solicitudes frontend fuera de orden/StrictMode, ausencia de toast duplicado/datos stale y foco por teclado.
Required docs: reconciliar el reporte canónico a 68 backend, 4/4 health y 5 frontend; actualizar catálogo frontend/backend, evidencia ERR-003/ERR-004 y marcar addenda bloqueados como superados.
Blocking reasons: ninguno en pruebas o implementación local; las correcciones documentales enumeradas son requeridas para un cierre canónico trazable.
```
