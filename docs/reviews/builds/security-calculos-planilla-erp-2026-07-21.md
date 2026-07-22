# Security/RBAC review: approved_with_risks

> **Estado histórico:** revisión focal conservada para auditoría. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Scope:** nuevo `GET /calculos/planilla`, enriquecimiento ERP y pruebas focales en `horas_extras_consultas.py`, `horas_extras_planilla.py`, `schemas_horas_extras_planilla.py`, `empleados_service.py`, `ordenes_trabajo_service.py`.

## Checklist results

- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A — contrato exclusivamente de salida; `calculo_id` es entero.
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅ en los archivos focales
- Permiso `nomina_horas_extras.leer`: ✅
- IDOR/404 uniforme por cédula: ✅
- SQL parametrizado, incluidos `IN` dinámicos: ✅
- Scope antes de consultas locales/ERP: ⚠️ parcial
- Sesión ERP cerrada y trabajo síncrono offloaded: ✅

## Findings por severidad

### MEDIO — El enriquecimiento OT amplía la consulta más allá de las combinaciones exactas autorizadas (CWE-200, CWE-639)

- `backend_v2/app/services/novedades_nomina/horas_extras_planilla.py:53-65`
- `backend_v2/app/services/novedades_nomina/horas_extras_planilla.py:281-287`
- `backend_v2/app/services/novedades_nomina/horas_extras_planilla.py:317-320`
- `backend_v2/app/services/erp/ordenes_trabajo_service.py:173-206`

Las cédulas sí provienen de cálculos ya filtrados por alcance, pero la consulta local de asignaciones combina por separado conjuntos de cédula, año y semana, en vez de limitarse a las tuplas exactas de los cálculos paginados. Luego el bulk ERP recibe claves exactas pero filtra únicamente por `orden`, recuperando todas las combinaciones CC/SCC/subíndice de esa orden. Si no existe coincidencia exacta, `_metadata_ot` elige la primera fila con la misma orden. Esto puede asociar y devolver `cliente`/`descripcion` de otra combinación, además de consultar datos no necesarios. No se observó fuga de otra cédula, pero la frontera de minimización por cálculo/OT no queda preservada.

Recomendación: filtrar asignaciones por tuplas exactas `(cedula, anio, semana_iso)` y hacer que el bulk ERP restrinja las cuatro partes de cada clave; ante una clave incompleta o ambigua, devolver metadatos nulos en lugar de usar la primera coincidencia por orden.

### MEDIO — Cada lectura puede multiplicar consultas ERP sin rate limit, caché o circuit breaker (CWE-400, CWE-770)

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py:63-91`
- `backend_v2/app/services/novedades_nomina/horas_extras_planilla.py:305-322`
- `backend_v2/app/services/erp/empleados_service.py:191-229`

El endpoint está autenticado, paginado y degrada correctamente a datos locales, pero cada solicitud puede ejecutar varias sondas de esquema, la consulta bulk de empleados y la consulta bulk de OT. Una caída o latencia sostenida del ERP se reintenta en cada request autorizado. Los `IN` se parametrizan correctamente, pero el número de órdenes no tiene un límite propio y puede crecer por la sobreselección local descrita arriba.

Recomendación: rate limit focal, timeout/circuit breaker y caché breve de capacidades de esquema/metadata ERP; limitar y deduplicar las claves exactas antes del bulk.

### MEDIO — La dependencia ERP usada por el flujo registra la excepción de inicialización sin sanitizar (CWE-532)

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py:72`
- `backend_v2/app/database.py:162-180`

Los `except` nuevos usan mensajes genéricos y no registran cédulas, salarios, supervisores ni clientes. Sin embargo, `obtener_erp_db_opcional` interpola `str(e)` en el log de inicialización. Dependiendo del driver, el texto puede incluir host, usuario, ruta o detalles de conexión. El cierre en `finally` sí está presente y las consultas síncronas nuevas se descargan al threadpool.

Recomendación: conservar un mensaje genérico/código de error y, si se necesita diagnóstico, sanitizar explícitamente la excepción antes de registrarla.

### BAJO — El GET sensible no declara `Cache-Control: no-store, private` (CWE-525)

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py:63-91`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planilla.py:8-31`

La respuesta contiene cédula, nombre, salario, base hora, empresa, ubicación, supervisor, observaciones, responsable y cliente. No se fija una política explícita para evitar almacenamiento en cachés privados del navegador. El endpoint no consulta salario ni correo del ERP: salario/base provienen del cálculo local ya visible mediante el mismo permiso, y del ERP solo se seleccionan los campos laborales mínimos usados por la planilla.

Recomendación: añadir `Cache-Control: no-store, private` al response de planilla.

### BAJO — Las pruebas no fijan las barreras de seguridad end-to-end (CWE-639, CWE-862)

- `testing/backend/test_horas_extras_calculos_planilla.py:185-260`
- `testing/backend/test_horas_extras_ot_horarios.py:116-131`

Se comprueba que la ruta declara `requiere_permiso_he_leer` y que el set de cédulas se pasa al servicio, pero el servicio se mockea. Faltan regresiones de 401, 403, cédula fuera de alcance → 404, alcance vacío sin consultas locales/ERP, ERP recibiendo solo cédulas/tuplas exactas, ausencia de cliente ante OT ambigua, fallback parcial y cabecera no-store. El test bulk OT solo confirma el mapeo de una fila y no prueba que combinaciones no solicitadas sean excluidas.

## Verificaciones positivas

- `horas_extras_consultas.py:63-91` usa `Depends(requiere_permiso_he_leer)`; el helper exige autenticación y el permiso exacto `nomina_horas_extras.leer`, registrado en `rbac_manifest.py:284-288`.
- La cédula solicitada se normaliza/autoriza antes del servicio y un valor inválido o fuera de alcance responde 404 genérico. Sin filtro explícito, `cedulas_permitidas` llega al `SELECT`; alcance vacío retorna `[]` antes de consultas secundarias o ERP.
- Detalles diarios se consultan por `calculo_id` de resultados autorizados; horarios y empleados se consultan por cédulas derivadas de esos resultados.
- Los valores de los `IN` dinámicos usan bind parameters (`:cN`, `:ordenN`); solo los nombres de placeholders, generados por índice, se interpolan en SQL.
- Los fallos de empleados y OT son independientes y conservan la respuesta local con enriquecimientos nulos. No se propagan excepciones ERP al cliente.
- No se seleccionan correo ni salario ERP en el bulk de planilla. `salario` y `base_hora` salen del snapshot local autorizado; supervisor y cliente son textos mínimos, aunque aplica el riesgo de combinación OT indicado.

## RBAC/config impact

No se requiere módulo nuevo: `nomina_horas_extras.leer` ya representa la consulta de cálculos/costos y permanece como autoridad del endpoint. No hay cambios de secrets o configuración en los archivos focales. El flujo mantiene alcance por empleado, pero debe estrechar la selección por cálculo/clave OT para minimizar datos ERP.

## Blocking reasons

Ninguno: no se confirmó acceso sin autenticación, bypass de `nomina_horas_extras.leer`, IDOR por cédula ni SQL injection. Los riesgos requieren corrección antes de ampliar volumen o audiencia del flujo.

**Severity:** MEDIO

**Validación:** revisión estática; no se ejecutaron tests por las restricciones del subagente.
