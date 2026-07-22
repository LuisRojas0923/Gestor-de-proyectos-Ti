# Revision docs/tests: Bitacoras operacionales - Fase tecnica 0

**Fecha:** 2026-07-21
**Modo:** build
**Alcance:** exclusivamente Fase tecnica 0 de bitacoras operacionales
**Resultado:** `aprobado_con_riesgos`

## 1. Alcance revisado

- Especificacion: `docs/specs/2026-07-21_bitacoras-operacionales-web.md`.
- Plan: `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md`.
- Backend: `testing/backend/test_bitacoras_operacionales_fase0.py` y `testing/backend/test_notificaciones.py`.
- Frontend: `ProtectedRoute.test.tsx`, `NotificationsContext.test.tsx` y `notificacionesService.test.ts`.
- Registro: filas de Bitacoras Fase 0 en `testing/CATALOGO_PRUEBAS.md`.
- Regresion comunicada: `testing/backend/test_auditoria_acciones.py`.

Se ignoraron los cambios concurrentes ajenos a esta fase. No hay cambios de tablas, columnas ni modelos persistentes en el alcance, por lo que `docs/ESQUEMA_BASE_DATOS.md` no requiere actualizacion para Fase 0.

## 2. Trazabilidad spec/plan

La vinculacion es bidireccional: la especificacion referencia el plan y el plan referencia la especificacion. El plan delimita la Fase tecnica 0 en el paso 3 y declara expresamente que ese hardening transversal fue aprobado aun cuando el modulo funcional completo continua bloqueado por decisiones de negocio.

El reporte de build `docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase0.md` separa correctamente la Fase tecnica 0 ejecutada de las seis decisiones funcionales que mantienen bloqueado el modulo completo. La diferencia entre el estado borrador de la especificacion y esta aprobacion tecnica queda explicada y no bloquea este alcance.

## 3. Evidencia de pruebas y verificaciones

| Evidencia | Revision | Estado |
|---|---|---|
| TDD frontend | RED inicial de 4 fallos y segunda revision de 4 fallos documentadas; GREEN final de 10 casos. | Evidencia persistida |
| TDD backend | RED inicial de 7 fallos y segunda revision de 8 fallos documentadas; GREEN final de 19 casos Fase 0. | Evidencia persistida |
| Notificaciones HTTP aisladas | Identidad autenticada, 404 uniforme, actualizacion propia con commit y ausencia de POST publico. | 4 PASS |
| Regresion auditoria | Suite existente sin regresiones. | 15 PASS |
| Backend combinado | Comando y resumen conservados en el reporte de build. | 38 PASS, 2 warnings |
| Frontend focal | Comando y desglose conservados en el reporte de build. | 3 archivos / 10 PASS |
| Build frontend | Comando conservado; 4040 modulos transformados. | PASS |
| ESLint focal | Comando y lista de archivos conservados. | PASS |
| `py_compile` focal | Comando y lista de modulos backend conservados. | PASS |
| Lint global | 484 errores declarados como deuda preexistente fuera de los archivos focales. | Riesgo no bloqueante |
| Import completo backend local | Sigue limitado por la ausencia local de `pdfplumber`; las suites focales y `py_compile` no dependen del import completo. | Riesgo ambiental |

Comando ejecutado por este revisor, solo de coleccion:

```text
python -m pytest --collect-only testing/backend/test_bitacoras_operacionales_fase0.py testing/backend/test_notificaciones.py testing/backend/test_auditoria_acciones.py -q
38 tests collected in 3.96s
```

Desglose confirmado: 19 Fase 0 + 4 notificaciones + 15 auditoria. La ejecucion verde de esos mismos 38 casos esta persistida en el reporte de build; este revisor solo repitio la coleccion.

## 4. Hallazgos ordenados por severidad

Los dos hallazgos HIGH anteriores quedan cerrados: la DB del handshake usa una sesion corta, el ticket queda ligado al Origin y viaja por subprotocolo, la sesion se revalida, el body de bitacoras se excluye, `ProtectedRoute` conserva all-of bajo bypasses y las cuatro pruebas HTTP privadas pasan.

### MEDIUM-1 - La cobertura WebSocket sigue concentrada en helpers y estructura

Se cubren ticket de un uso, Redis fail-closed, Origin exacto, subprotocolo, ausencia de dependencia DB larga y cierre antes de broadcast para una sesion revocada. Aun no se abre el handler `/ws` en una prueba integrada para demostrar handshake valido, rechazo por Origin/ticket/sesion discordantes, expiracion TTL real, consumo concurrente `GETDEL` o cierre 1013. Es una brecha de profundidad, no un defecto observado en la implementacion actual.

### MEDIUM-2 - Falta una prueba HTTP anonima explicita y persistencia multiusuario real

Las rutas conservan la dependencia de autenticacion y las pruebas aisladas fuerzan una identidad valida. No hay un caso HTTP sin override que demuestre 401, ni una base de prueba con dos usuarios que confirme materialmente listado propio y no modificacion del registro ajeno. El contrato de identidad/404 se demuestra por delegacion y mocks.

### MEDIUM-3 - La exclusion de body y la supresion de auditoria se prueban como primitivas

La ruta futura queda excluida por prefijo y las variantes sin commit/supresion estan cubiertas. Falta una solicitud integrada del middleware que pruebe un unico evento, ausencia del payload operacional en un rechazo previo al handler y rollback conjunto de dominio, notificacion y auditoria.

### LOW-1 - Cobertura frontend asincrona parcial

Los 10 casos cierran bypasses legacy y excepcion del constructor WebSocket. Siguen sin prueba dedicada el fallo al solicitar ticket, `onclose`/`onerror`, temporizador unico, desmontaje o cambio de usuario durante una promesa pendiente y restauracion de `WebSocket`/`localStorage` en `afterEach`.

### LOW-2 - Validaciones globales limitadas por deuda ambiental

El lint focal y build pasan. La atribucion de los 484 errores globales como preexistentes no incluye comparacion automatizada before/after, y el import completo local del backend sigue sin ejecutarse por `pdfplumber`. Ninguno afecta los 38 casos focales ni el `py_compile` reportado.

## 5. Pruebas requeridas

No hay pruebas adicionales bloqueantes para cerrar la Fase tecnica 0. Como hardening posterior se recomiendan:

1. Integracion del handler WebSocket con Redis/DB efimeros para handshake, TTL, concurrencia y codigos de cierre.
2. HTTP anonimo 401 y persistencia multiusuario real para notificaciones.
3. Middleware de auditoria integrado con rechazo temprano, evento unico y rollback conjunto.
4. Matriz frontend de fallo de ticket, cierre/error, cleanup y cambio de usuario.

## 6. Documentacion requerida

Las descripciones, extensiones y conteos de `testing/CATALOGO_PRUEBAS.md` ya estan corregidos. El reporte de build conserva comandos y resultados focales y separa el cierre tecnico de los gates funcionales. No quedan actualizaciones documentales bloqueantes.

No se exige actualizar el MER ni crear una bitacora adicional: este reporte conserva el contexto de la sesion. La decision de tickets WebSocket efimeros ya esta documentada en el plan; un ADR solo sera necesario si se adopta como patron transversal estable fuera de este modulo.

## 7. Veredicto

`aprobado_con_riesgos`

La evidencia final es trazable y consistente: 38 backend, 10 frontend, build, ESLint focal y `py_compile` pasan. Los bloqueos previos de propiedad, Origin, sesion DB larga, revocacion, subprotocolo, RBAC, auditoria y catalogo quedan cerrados. Persisten brechas de integracion profunda y baseline global, documentadas como riesgos no bloqueantes para esta fase tecnica.
