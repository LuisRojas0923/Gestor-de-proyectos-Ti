# Rerevisión estática docs/tests/CI — PR #16

**Fecha:** 2026-07-17
**Base:** `f0d3a78ba2698426cf08d0400a885accb5ab6d61`
**Head exacto:** `55aabda4355a4ab97990b153e8afccf08cf03b7f`
**Ref verificada:** `refs/pr/16` resuelve al head exacto
**Worktree confiable:** `C:\Users\AMEJOR~1\AppData\Local\Temp\opencode\gestor-antigravity-main`
**Modo:** revisión estática; no se hizo checkout, ejecución ni edición de la candidata
**Resultado:** `blocked`

## 1. Delta y asuntos corregidos

- El delta base..head contiene 23 archivos: CI nuevo, lógica de Nómina/HDI, frontend y pruebas.
- Quedó corregida la exposición anterior: `d891adeb` elimina
  `.github/scripts/ai_reviewer.py` y `.github/workflows/ai-pr-reviewers.yml`; ninguno
  aparece en el árbol final.
- `testing/backend/test_asignacion_desarrollos_actividades.py:43-100` mejora su
  preparación/limpieza de usuarios, validaciones y notificaciones antes y después
  del módulo.
- El commit final `55aabda` cambia nueve archivos de producto y **ningún** test,
  catálogo ni workflow CI. Por ello no corrige los hallazgos docs/tests previos y
  además desincroniza dos contratos ya probados.

## 2. Hallazgos bloqueantes

### H1 — La evidencia remota está roja y el contrato SALDO_FAVOR sigue contradictorio

La evidencia remota suministrada para este head es **85 failed / 322 passed / 33
skipped / 2 errors**. Los dos fallos focales SALDO_FAVOR son coherentes con el
delta estático:

- `nomina_helper.py:155-174` ahora descuenta el saldo al retirado y persiste
  `valor_cobrar`; `test_hdi_excepciones.py:85-93` todavía exige conservar el valor
  completo de `24922`.
- El caso activo declara que debe conservarse el 24 % en
  `test_hdi_excepciones.py:99-103`, pero después exige `valor_rdc == 0` alrededor
  de `:167-176`. La implementación excluye `SALDO_FAVOR` de las excepciones que
  anulan RDC en `nomina_helper.py:181-191`.

No existe un contrato verificable hasta decidir la regla de negocio y alinear
código, docstring, assertions y catálogo.

### H2 — El test frontend quedó obsoleto en el nuevo head y CI no llega a descubrirlo

`HdiPreview.tsx:102-125` elevó el límite individual de 10 MiB a 15 MiB en
`55aabda`, pero `HdiPreview.test.tsx:80-96` aún crea 11 MiB y espera rechazo. Ese
caso debería aceptar el archivo con el contrato actual.

Además, la evidencia remota reporta **552 problemas ESLint**. Por la topología
secuencial de `.github/workflows/ci.yml:84-98`, el fallo de lint omite TypeScript,
Vitest y build; por tanto no hay evidencia de esos tres gates.

### H3 — La fixture global invalida cobertura sensible y fuga estado

`testing/backend/conftest.py:65-89` ejecuta para todos los tests y
`conftest.py:80` fija `limiter.enabled = False`, sin preservar ni restaurar su
valor. Esto no es un reset: desactiva globalmente el control que deberían probar
las suites de rate limiting y contamina cualquier prueba posterior en el proceso.

### H4 — Las afirmaciones ZIP/SHA/rollback no prueban lo catalogado

- `test_nomina_zip_seguridad.py:64-101` afirma inspeccionar el ZIP sanitizado,
  pero solo comprueba existencia y el nombre externo en DB; nunca abre el ZIP ni
  verifica sus miembros.
- No existe caso con nombres duplicados ni doble ejecución para demostrar SHA-256
  determinístico.
- `test_nomina_zip_seguridad.py:140-143` busca el rollback en
  `uploads/<sha>.zip`, mientras la implementación publica bajo
  `uploads/nomina/<año>/<mes>/<subcategoría>/...` (`nomina_service.py:139-188`).
  La negación puede pasar aunque el archivo real quede huérfano.
- Los tests escriben en `uploads/` y persisten archivos, excepciones y registros
  con `commit`, sin `tmp_path`, transacción revertida ni teardown completo
  (`test_hdi_excepciones.py:17-79`, `test_nomina_zip_seguridad.py:64-257`).

### H5 — El catálogo es materialmente falso/incompleto

`testing/CATALOGO_PRUEBAS.md:50-53` marca las cuatro suites nuevas como
`✅ PASSED`, aunque la evidencia remota está roja y SALDO_FAVOR falla. También:

- atribuye Q1/Q2 a `test_hdi_extractor_grupos.py`, que prueba grupos/tipos, no
  quincenas;
- atribuye path traversal interno, duplicados y SHA determinístico a una suite
  que no contiene esas assertions;
- omite `frontend/src/tests/HdiPreview.test.tsx` en `CATALOGO_PRUEBAS.md:55-65`;
- eliminó la entrada de `test_validate_estados.py`, aunque el archivo sigue en el
  head.

### H6 — El árbol no pasa el gate textual mínimo

`git diff --check base..refs/pr/16` reporta **31 diagnósticos**: 30 espacios al
final y un blank line al EOF. Incluye `.github/workflows/ci.yml:29,35,42,52,56,
71,78,83,87,91,95`, servicios de nómina, frontend y tests. CI tampoco ejecuta
`git diff --check`, por lo que no evita la regresión.

## 3. Riesgos adicionales

1. **Topología backend compartida.** `.github/workflows/ci.yml:43-64` inicia un
   Uvicorn persistente y luego ejecuta toda la suite contra la misma PostgreSQL.
   `db_session` abre sesiones por test, pero no encapsula ni revierte mutaciones;
   esto mezcla tests ASGI, E2E y DB directa en un estado común.
2. **Caso RBAC autorizado débil.** `test_hdi_http_rbac.py:145-215` define un
   `extractor_stub` que no usa, sustituye `procesar_flujo` completo y acepta 200 o
   400 aunque el nombre promete 200. Prueba “no 401/403”, no la ruta autorizada
   real extremo a extremo. Los `dependency_overrides.clear()` de `:97`, `:136` y
   `:205` tampoco restauran únicamente las claves propias.
3. **Instalación no reproducible.** `.github/workflows/ci.yml:79-82` usa
   `npm ci || npm install`, ocultando un lockfile inconsistente.
4. **Trazabilidad durable ausente.** No hay bitácora/ADR o reporte candidato que
   establezca la regla SALDO_FAVOR activa/retirada ni que registre comandos y
   salidas del head. No cambiaron modelos/esquema, así que
   `docs/ESQUEMA_BASE_DATOS.md` no requiere actualización.
5. El commit de head usa descripción en inglés (`fix: PR remediation...`), contra
   la convención de commits en español. El cambio de
   `.agents/workflows/regla-principal-diseno.md` también duplica reglas del skill
   de diseño fuera de la ruta canónica `.agent/workflows/` documentada por ADR-007.

## 4. Pruebas y CI requeridos

1. Resolver la regla SALDO_FAVOR y obtener verde en ambos casos focales; afirmar
   también `saldo_actual`/historial y los tres valores contables.
2. Actualizar HdiPreview con bordes 15 MiB, 10/11 archivos y total 50 MiB.
3. Rehacer ZIP con `tmp_path`: abrir miembros, comprobar basename y duplicados,
   comparar dos hashes y verificar el destino real tras rollback.
4. Aislar DB con rollback/teardown por test y no desactivar globalmente el limiter;
   habilitarlo explícitamente en sus pruebas de seguridad.
5. Endurecer el caso HTTP autorizado para exigir 200 y atravesar la dependencia
   real de permiso con mocks mínimos.
6. Ejecutar y conservar evidencia del head exacto: suite backend completa,
   `test_infrastructure.py`, `test_regresiones.py`, focales Nómina/HDI, ESLint,
   TypeScript, Vitest y build.
7. Separar gates frontend o usar una topología que ejecute todos y falle al final;
   usar `npm ci` estricto. Separar unit/integration/E2E backend o provisionar DB
   aislada por grupo. Añadir `git diff --check`.

## 5. Documentación requerida

- Reconciliar `testing/CATALOGO_PRUEBAS.md` con suites, cobertura real y estado
  del head; restaurar `test_validate_estados.py` y registrar HdiPreview.
- Registrar comandos, SHA y salidas completas en un build report/bitácora.
- Documentar la decisión durable SALDO_FAVOR para activo/retirado antes de adaptar
  tests o implementación.

## 6. Decisión

```text
Docs/tests review: blocked
Findings: 6 altos/bloqueantes, 4 medios y 2 bajos. Corregida la eliminación de los workflows/scripts AI inseguros; permanecen suite backend roja, contratos SALDO_FAVOR/HdiPreview desalineados, aislamiento global roto, assertions ZIP vacuas, catálogo falso y 31 diagnósticos diff-check.
Required tests: SALDO_FAVOR verde y coherente; bordes 15MiB/10 archivos/50MiB; ZIP real con duplicados/SHA/rollback; limiter habilitado; HTTP autorizado 200; backend completa + health; lint/tsc/Vitest/build.
Required docs: reconciliar catálogo, restaurar validate_estados, registrar HdiPreview y evidencia del SHA, documentar la regla SALDO_FAVOR. ESQUEMA_BASE_DATOS no aplica.
Blocking reasons: 85 failed + 2 errors backend; 552 problemas lint y gates frontend omitidos; dos fallos focales SALDO_FAVOR; test frontend obsoleto; cobertura sensible invalidada; git diff --check falla.
```
