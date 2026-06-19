# Frontend review — horas extras selección empleados — 2026-06-19

Frontend review: approved_with_risks

## Findings por severidad

### Media

1. `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft.ts:47-52` + `EmpleadosActivosView.tsx:49-55` — El borrador de `sessionStorage` se parsea con cast directo y luego se usa para construir `Set`/`Map` sin validar forma. Un JSON válido pero con esquema viejo/corrupto puede romper el render al restaurar selección. Riesgo UX: pantalla en blanco en vez de recuperación tolerante.

2. `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx:52-55`, `159-161`, `207-214` — La selección restaurada no se reconcilia contra los empleados cargados ni contra `autoriza_he`. Si una persona seleccionada en el borrador ya no está autorizada o cambió en ERP, queda contada/persistida; el checkbox aparece deshabilitado y no permite quitarla individualmente. Riesgo de estado/persistencia: el planificador puede recuperar empleados obsoletos o no autorizados hasta que el usuario use acciones masivas/limpieza.

3. `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx:201-296` + `frontend/src/components/molecules/DataTable.tsx:315-351` — Cada cambio de selección rehace `columns`, re-renderiza todas las filas visibles y re-sincroniza la grilla. Con hasta 2.000 empleados cargados (`MAX_PAGINAS * LIMITE_PAGINA`) hay riesgo de latencia perceptible. No bloquea, pero conviene medir antes de merge.

### Baja

4. `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx:377-384` — Las acciones masivas no comunican cuántos empleados serán afectados ni cuándo el límite de 200 truncó la inclusión. Riesgo UX: el usuario puede creer que “Incluir visibles” agregó todos los visibles cuando solo agregó hasta el límite.

5. `frontend/src/tests/PlanificadorSemanalView.test.tsx:285-312` — La prueba nueva cubre el happy path de selección y escritura en `sessionStorage`, pero falta cobertura de restauración inicial desde borrador, preservación de campos del planificador (`overrides`, semana, plantilla), deselección/limpieza y empleados no autorizados/límite 200.

6. `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx:391-392` y `frontend/src/components/molecules/DataTable.tsx:250-252` — Persisten colores Tailwind hardcodeados (`red-*`, `blue-500`) en archivos tocados. No parecen introducidos por este cambio, pero siguen siendo deuda frente al sistema de diseño basado en tokens.

## DataTable

- Cambio revisado en `DataTable.tsx:323-327`: quitar `cursor-pointer` cuando no hay `onRowClick` es correcto y reduce falsa affordance.
- No se observan regresiones directas de filtros/sort/sticky header por este cambio puntual.

## Required checks

- No ejecutados por restricciones del subagente.
- Requeridos desde `frontend/`: `npm run lint`, `npm run test -- src/tests/PlanificadorSemanalView.test.tsx`, `npm run test`, `npm run build`.

## Design-system risks

- Uso correcto de átomos/moléculas para la funcionalidad nueva (`Checkbox`, `Button`, `Badge`, `MaterialCard`, `DataTable`).
- Riesgo pendiente: colores hardcodeados existentes en archivos tocados.

## Blocking reasons

- Ninguno. Apruebo con riesgos medios por validación de borrador, reconciliación de selección restaurada y performance en tablas grandes.
