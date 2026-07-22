# Revisión final docs/tests — planilla detallada de Horas Extras

> **Estado histórico:** revisión focal conservada para auditoría. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Alcance:** `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`, `testing/CATALOGO_PRUEBAS.md`, `testing/backend/test_horas_extras_calculos_planilla.py`, `testing/backend/test_horas_extras_ot_horarios.py`, `frontend/src/tests/CalculoListView.test.tsx` y `frontend/src/tests/horasExtrasPlanillaService.test.ts`
**Decisión:** **approved_with_risks**
**Estado del reporte:** esta revisión reemplaza el veredicto bloqueado anterior del mismo archivo.

## Evidencia validada

- La especificación conserva comandos y resultados focales exactos:
  - Backend planilla: **16 passed**.
  - Backend OT/ERP automático: **18 passed, 1 skipped**; el omitido es el smoke de producción opt-in.
  - Frontend focal: **10 passed**.
  - ESLint directo sobre seis archivos focales: **sin hallazgos**.
  - Build Vite: **4042 módulos transformados**.
- Este reviewer ejecutó únicamente colección, conforme a las restricciones del rol:
  - `python -m pytest --collect-only -q testing/backend/test_horas_extras_calculos_planilla.py` → **16 tests collected**.
  - `python -m pytest --collect-only -q testing/backend/test_horas_extras_ot_horarios.py` → **19 tests collected**.
- Los archivos frontend contienen **10 casos**: 9 en `CalculoListView.test.tsx` y 1 en `horasExtrasPlanillaService.test.ts`.
- `compileall` fue comunicado como aprobado y aparece como tal en un reporte backend previo, pero su comando exacto no está en la tabla focal de la especificación ni en el catálogo.

## Cierre de hallazgos anteriores

- **Semántica temporal cerrada.** La especificación distingue horas, conceptos e importes del snapshot inmutable frente a CC/SCC/especialidad del planificador vigente y metadatos ERP vivos. Ya no promete inmutabilidad para toda la fila.
- **Estados cerrados.** Salario, base, estado y responsable se atribuyen al cálculo semanal en el estado consultado; el contrato ya no restringe documentalmente la ruta a confirmados.
- **Reparto multi-CC cerrado.** La prueba distribuye novedad y costo entre dos CC de la misma OT y conserva ambos importes.
- **Integridad adicional cerrada.** Un concepto calculado inesperado, aun con hash válido, fuerza fallback al detalle semanal.
- **Privacidad cerrada.** Un confirmador no resoluble produce `responsable=null`, no una cédula/ID cruda.
- **Alcance cerrado.** La cédula fuera de alcance devuelve 404 y se verifica que el servicio de planilla no sea llamado.
- **Contrato UI cerrado.** Se comparan exactamente los 19 encabezados en orden; también se cubren loading, vacío y reinicio del bloque global al limpiar filtros.
- **Evidencia cerrada.** Los antiguos conteos 12/8 y el timeout combinado quedaron sustituidos por ejecuciones focales terminadas 16, 18/1 y 10, con lint y build registrados.

## Hallazgos residuales ordenados por severidad

### MEDIO — La fase roja TDD continúa sin evidencia auditable

Los verdes finales son coherentes con el árbol actual y cubren las regresiones solicitadas, pero no se conserva una ejecución roja previa a la implementación. No corresponde recrearla retroactivamente. Es un riesgo de proceso, no un fallo funcional del snapshot final.

### BAJO — Falta registrar el comando exacto de `compileall`

El resultado “passed” está comunicado, pero `docs/specs/2026-06-01_modulo-horas-extras-novedades.md:507-513` registra solo pytest, Vitest, ESLint y build. Para trazabilidad completa debe añadirse el comando y su resultado, o retirarse `compileall` de la evidencia final declarada.

### BAJO — Quedan bordes recomendables, no bloqueantes

La suite de planilla no prueba directamente cada variante de identidad/período inválido del snapshot; los 401/403 se simulan reemplazando la dependencia; y el frontend aún no cubre recuperación exitosa tras pulsar “Reintentar”, valores exactos de resúmenes filtrados ni error HTTP del servicio. Hash inválido, concepto inesperado, dependencia RBAC declarada, 404 de alcance, loading/vacío y contrato tabular sí están cubiertos.

## Pruebas recomendadas

1. Snapshot con cédula, año, semana o fecha fuera del cálculo.
2. 401/403 con la dependencia real de autenticación/permisos en una integración HTTP.
3. Frontend: reintento exitoso, valores de resumen tras filtrar y error no-2xx del servicio.

Ninguna es bloqueante para el alcance solicitado.

## Documentación requerida

- Añadir el comando/resultado exacto de `compileall` si se desea conservarlo como evidencia del cierre.
- No aplica `docs/ESQUEMA_BASE_DATOS.md`: no hay cambio físico de modelo o esquema en este alcance.
- No se requiere ADR adicional: la semántica snapshot versus proyección viva ya quedó explícita en la especificación funcional.
- Este reporte final aporta la trazabilidad durable; no se requiere bitácora duplicada.

## Veredicto

Docs/tests review: approved_with_risks
Findings: 1 medio y 2 bajos; sin hallazgos altos ni bloqueantes. Los bloqueos previos de semántica, reparto multi-CC, integridad, privacidad, alcance, contrato UI y evidencia quedaron cerrados.
Required tests: ninguno bloqueante; recomendados período/identidad de snapshot, integración RBAC real y reintento/resúmenes/error HTTP frontend.
Required docs: registrar el comando exacto de `compileall` si forma parte de la evidencia final.
Blocking reasons: ninguno.
