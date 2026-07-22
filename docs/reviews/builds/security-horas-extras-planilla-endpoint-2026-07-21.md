# Security/RBAC review: approved_with_risks

> **Estado histórico:** revisión focal conservada para auditoría. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21 — re-review final
**Scope:** únicamente `GET /calculos/planilla` de Horas Extras, su servicio de lectura, enriquecimiento ERP y pruebas focales.

## Checklist results

- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A — contrato exclusivamente de salida; `calculo_id` es entero.
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Verificaciones favorables

- El endpoint reutiliza `requiere_permiso_he_leer`, que exige autenticación y el permiso exacto `nomina_horas_extras.leer`; los casos HTTP 401/403 aportados fijan el rechazo.
- No se requiere cambio en `rbac_manifest.py`: `nomina_horas_extras.leer` ya cubre consultas de cálculos y está registrado como módulo crítico.
- El alcance por empleado es fail-closed para no administradores: sin filtro se aplica `cedulas_permitidas`; con cédula explícita se normaliza y autoriza antes del servicio; una cédula inválida o fuera de alcance produce 404 genérico. Detalles, horarios y enriquecimiento ERP derivan únicamente de cálculos ya filtrados.
- El rol `admin` conserva el bypass explícito existente. No se observó un IDOR estático ni una consulta ERP por una cédula ajena al resultado autorizado.
- La respuesta salarial/PII declara `Cache-Control: no-store, private`, cubierto por la evidencia focal.
- La identidad de confirmación no es controlada por el cliente: los flujos de confirmación sobrescriben `usuario_confirma` con la identidad autenticada. La planilla resuelve tanto `Usuario.id` como `Usuario.cedula`, incluido el caso probado por cédula.
- Si la identidad histórica no puede resolverse, `responsable` devuelve `null`; ya no expone el ID o la cédula persistida.
- La regresión HTTP de cédula fuera de alcance comprueba 404 genérico y que el servicio de planilla —por tanto, sus consultas y enriquecimientos ERP— no sea invocado.
- Las consultas ERP observadas son `SELECT`; los valores de cédula/OT se envían mediante parámetros enlazados y los nombres de placeholders se generan internamente. Los filtros locales usan SQLAlchemy, no SQL interpolado.
- Los fallos de empleados y OT se capturan por separado y la respuesta degrada a datos locales con enriquecimientos nulos, sin exponer la excepción al cliente.

## Findings

### MEDIO — La lectura ERP no está forzada a una conexión de solo lectura (CWE-250, CWE-284)

`horas_extras_consultas.py:69-82` inyecta `obtener_erp_db_opcional`, que en `database.py:162-180` abre la sesión ERP general mediante `SessionErp`. El worktree ya contiene una conexión separada `SessionErpLectura`, pero este endpoint no la usa ni ejecuta `SET TRANSACTION READ ONLY`. El código actual solo emite `SELECT`, por lo que no se detectó una escritura ERP, pero la garantía depende del código y de los privilegios de la credencial general, no de una barrera de base de datos.

Recomendación: usar una dependencia ERP opcional basada en credencial `CONNECT + SELECT` y transacción `READ ONLY`, manteniendo la degradación a `None` cuando no esté disponible.

### MEDIO — Degradación ERP disponible pero sin contención de fallos repetidos (CWE-400, CWE-770)

Cada lectura autorizada puede realizar varias sondas de esquema, el bulk de empleados y el bulk de OT. No hay rate limit focal, circuit breaker ni caché de capacidades; una caída o latencia del ERP se reintenta en cada petición. Existe `statement_timeout=30000` y paginación local máxima de 200 cálculos, pero las esperas repetidas todavía pueden presionar threads y pools.

Recomendación: añadir contención de frecuencia y circuit breaker/timeout corto para el enriquecimiento, sin cachear la respuesta de nómina. Si se cachea metadata ERP, separar estrictamente esa caché de salarios, cédulas y observaciones.

### MEDIO — El error inicial de conexión ERP se registra sin sanitizar (CWE-532)

`database.py:167-170`, alcanzado por este endpoint, interpola la excepción completa en el log. El driver puede incluir host, usuario, nombre de base o detalles de red. Los `except` del servicio sí usan mensajes genéricos y no registran PII.

Recomendación: registrar un código/mensaje genérico y conservar detalles solo tras sanitización explícita.

### BAJO — Validación semántica incompleta de `anio` y `estado` (CWE-20)

`semana_iso`, `limit` y `offset` están acotados; la cédula termina validada como dígitos por `normalizar_cedula`. Sin embargo, `anio` no tiene rango y `estado` no tiene enum/pattern ni longitud máxima. Además, `anio=0` y `cedula=` son valores falsy y omiten el filtro, ensanchando la consulta al alcance completo. Esto no rompe RBAC y no habilita inyección, pero contradice la semántica de filtro exacto.

Recomendación: aplicar el rango de año usado por los schemas de nómina, un enum de estados y validación explícita de cadenas vacías.

## RBAC/config impact

- **Permiso:** reutilización correcta de `nomina_horas_extras.leer`.
- **Manifest:** sin cambios requeridos; no se crea una capacidad funcional nueva.
- **Datos:** el alcance por empleado se conserva antes del enriquecimiento.
- **ERP:** comportamiento actual de lectura por código y degradación segura para el cliente, con riesgo residual por no usar credencial/transacción read-only y por reintentos no contenidos.

## Evidencia

- Evidencia informada: suite de planilla, **16 passed**.
- Evidencia informada: suite ERP, **18 passed / 1 skipped**.
- Incluye pruebas focales de 401/403, `Cache-Control: no-store, private`, identidad no resoluble → `null` y cédula fuera de alcance → 404 sin invocar el servicio/enriquecimiento ERP.
- Revisión estática; este subagente no reejecutó tests.

## Blocking reasons

Ninguno. No se confirmó bypass de autenticación/RBAC, IDOR, exposición del identificador del confirmador, inyección SQL, cacheabilidad de la respuesta salarial ni escritura ERP. Los riesgos residuales de menor privilegio ERP, disponibilidad, logging y validación deben corregirse antes de ampliar volumen o audiencia.

**Severity:** MEDIO
