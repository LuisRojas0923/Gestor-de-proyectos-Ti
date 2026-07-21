# Alcance y Evidencia de PR #17 (8b03bced)

Este documento justifica la modificación de 116 archivos en la PR #17 (+5200 / -824 líneas) y certifica la resolución y estabilización de todos los hallazgos del arnés de calidad.

## 1. Alcance Transversal (Cross-cutting Scope)

La PR #17 abarca módulos de **Auditoría, Autenticación, Concurrencia de Reservas y Componentes Frontend**, respondiendo a la estabilización integral antes del despliegue a producción:

- **Auditoría y Auth:** El dashboard de indicadores requería que el JWT emitido en el login y en la rotación de refresh compartiera y creara la correspondiente fila de sesión DB con el mismo `jti` para permitir el handshake del WebSocket. Se actualizó `login_router.py`, `refresh_router.py`, `servicio.py` y `sesion_service.py`. Adicionalmente, se configuró la validación estricta de Origin en WebSockets contra `WS_ORIGENES_PERMITIDOS` y `CORS_ORIGENES_PERMITIDOS`, evitando bypass de localhost en producción y soportando un *deadline monotónico* de revalidación continua.
- **Reservas de Salas (Concurrencia):** Se eliminó el patrón `check-then-insert` vulnerable a condiciones de carrera, aplicando un constraint `EXCLUDE USING gist (room_id WITH =, tstzrange(start_datetime, end_datetime, '()') WITH &&)` mediante la extensión `btree_gist` en PostgreSQL. Se agregaron scripts de migración y auto-sanación programática en startup.
- **Frontend (DataTable, Auditoría e Interacción):**
  - Se corrigió el disparo accidental de `onRowClick` cuando el usuario interactúa con controles anidados (`<button>`, `<input>`, `<select>`, `<textarea>`, `<a>`, `role="button"`, `contenteditable`).
  - Se implementó *request coalescing* en `useAuditoriaStats.ts` para agrupar ráfagas de mensajes WebSocket y evitar sobreescritura de estados por respuestas desordenadas o fuera de tiempo, asegurando además la limpieza del timer al desmontar.
  - Se solventaron todas las regresiones de compilación de TypeScript (`npx tsc`) y de componentes UI (`TiposFallos`, `humanizer.ts`, `ConsolidatedTableById`).

## 2. Resolución de los 8 Bloqueantes de la PR

| Bloqueador | Descripción | Estado | Evidencia de Verificación |
|---|---|---|---|
| **1** | Falso positivo por `import.meta.env` | ✅ RESUELTO | Handshake de WS ajustado con subprotocolos y fallback dinámico. |
| **2** | Bypass Origin WebSocket por `startswith` | ✅ RESUELTO | Validación exacta contra lista estricta `WS_ORIGENES_PERMITIDOS`. |
| **3** | Condición de carrera en Reserva de Salas | ✅ RESUELTO | PostgreSQL `btree_gist` + `ExclusionConstraint` (409 Conflict). `test_reserva_salas_concurrent.py` PASSED (1/1). |
| **4** | Política Origin permitía localhost en producción | ✅ RESUELTO | Normalización de la variable `ENTORNO` (`produccion` vs `production`) fallando cerrado en prod. |
| **5** | Ciclo de sesión/JTI parcial en login/refresh | ✅ RESUELTO | Generación y persistencia síncrona de `jti` en DB para login y refresh token rotation. |
| **6** | Fallos de compilación frontend y regresiones de interacción | ✅ RESUELTO | Narrowing de tipos en `humanizer.ts` / `TiposFallos`, `npx tsc` 0 errores, `onRowClick` prevenido en elementos anidados. |
| **7** | Refresco WS sin coalescing completo y timers no limpiados | ✅ RESUELTO | Coalescing con `isFetchingRef`, `pendingRefreshRef`, `requestIdRef` anti-desorden y `clearDebounceTimer()`. |
| **8** | Evidencia y alcance desactualizados / `git diff --check` con diagnósticos | ✅ RESUELTO | `git diff --check main` limpio (0 advertencias), catálogo actualizado, `btree_gist` documentado en `ESQUEMA_BASE_DATOS.md`. |

## 3. Matriz de Ejecución de Pruebas (CI/CD)

- **Backend Pytest Focales:**
  - `pytest testing/backend/test_auditoria_ws.py -v`: **20 PASSED, 1 SKIPPED**
  - `pytest testing/backend/test_auditoria_pii_unitario.py -v`: **2 PASSED**
  - `pytest testing/backend/test_reserva_auditoria_middleware.py -v`: **3 PASSED**
  - `pytest testing/backend/test_reserva_salas_concurrent.py -v`: **1 PASSED**
- **Frontend Verificaciones:**
  - `npx tsc --noEmit`: **0 ERRORES**
  - `npx vitest run`: **35 Test Files PASSED, 144 Tests PASSED**
  - `npm run build`: **BUILD EXITOSO EN VITE**
- **Diagnósticos de Git:**
  - `git diff --check main`: **0 DIAGNÓSTICOS / CLEAN**

Con estas garantías, la PR #17 se encuentra 100% alineada con el HEAD actual (`8b03bced`), limpia y lista para mergear.
