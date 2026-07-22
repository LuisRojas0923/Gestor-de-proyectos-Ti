# Security/RBAC review: PR22 nómina

Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ❌
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ❌
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

## Findings

### BLOQUEANTE — persisten rutas genéricas de nómina sin autenticación/RBAC (CWE-306, CWE-862, CWE-200)

`backend_v2/app/api/novedades_nomina/nomina_router.py` protege correctamente `GET /historial`, `GET /archivos/{archivo_id}/preview` y `GET /archivos/{archivo_id}/descargar`, pero el mismo router raíz continúa exponiendo sin `obtener_usuario_actual_db` ni `requiere_permiso_nomina_novedades`:

- `POST /archivos` (línea 58): escritura no autenticada de archivos y metadatos, sin límite de tamaño ni lista cerrada de extensiones.
- `POST /archivos/{archivo_id}/procesar` (línea 120): procesamiento y mutación no autenticados.
- `GET /subcategorias/resumen` (línea 228): datos agregados de nómina.
- `GET /subcategorias/{subcat}` (línea 252): devuelve registros normalizados con cédula, nombre y valores.
- `POST /exportar-solid` (línea 346): devuelve cédula, nombre, valor, empresa y concepto.
- `GET /catalogo` (línea 46) también incumple la regla general de que API v2 solo admite las excepciones públicas de auth/health.

Esto permite eludir la protección recién agregada y, en varias rutas, leer PII de nómina o alterar el estado sin token. Debe aplicarse la dependencia RBAC al router genérico completo o a cada ruta sensible, conservando únicamente excepciones públicas expresamente justificadas.

### ALTO — los endpoints modificados aún pueden divulgar excepciones internas (CWE-209)

Los handlers protegidos interpolan `str(e)` en respuestas 500: preview en línea 200, descarga en línea 214 e historial en líneas 317 y 325 de `nomina_router.py`. Un error de SQLAlchemy/driver puede revelar nombres de tablas/columnas y detalles internos. La autenticación no elimina esta divulgación a usuarios con un rol autorizado; deben devolverse mensajes genéricos y registrarse detalles de forma controlada sin PII.

### MEDIO — descarga no fuerza confinamiento al directorio autorizado (CWE-22)

`descargar_archivo` entrega directamente `archivo.ruta_almacenamiento` a `FileResponse` (líneas 219-224). Las rutas creadas por el flujo HDI usan hash/UUID y el nombre original se reduce con `basename`, lo cual es seguro; sin embargo, la descarga no resuelve la ruta ni comprueba que permanezca bajo `uploads/nomina`, y tampoco rechaza enlaces simbólicos. Un registro heredado/corrupto o una futura vía de mass assignment podría convertirlo en lectura arbitraria para un usuario con permiso. Validar `resolve()` contra una raíz configurada.

### MEDIO — ventana de cancelación entre COMMIT y marcado local puede dejar metadatos sin archivo (CWE-662)

El advisory lock transaccional se adquiere antes de escritura/borrado y se mantiene hasta `session.commit()`, por lo que serializa correctamente reemplazos del mismo `subcategoria/año/mes`. No obstante, `commit()` no está protegido frente a cancelación. Si PostgreSQL confirma el commit pero la coroutine recibe `CancelledError` antes de ejecutar `transaccion_confirmada = True`, el bloque de recuperación intenta rollback y elimina el archivo ya referenciado por datos confirmados. Se recomienda blindar el commit y reconciliar su resultado antes de eliminar el archivo.

## Controles verificados

- `requiere_permiso_nomina_novedades` encadena autenticación DB y permiso `nomina_novedades`; el ID existe en `rbac_manifest.py` y coincide exactamente.
- HDI preview/datos heredan RBAC del router y preview conserva rate limit `5/minute`.
- Los diagnósticos `ErrorEstructuraNomina` publicados como 422 contienen únicamente hoja, fila, campo y regla; no incluyen cédula, nombre, valor recibido, rutas ni stack trace. Los demás `ValueError` se convierten a mensaje genérico.
- El archivo HDI se valida por firma/MIME/límites y se persiste con nombre generado; el nombre original se normaliza con `basename`.
- `pg_advisory_xact_lock(hashtextextended(:scope, 0))` usa parámetro SQL, clave estable normalizada y lock de transacción. La prueba de integración demuestra espera entre dos sesiones hasta el commit de la primera.
- No se introdujeron secrets, dependencias ni cambios de Docker/env. `.gitignore` excluye `.env` y permite solo `.env.example`.

## Evidencia

Se inspeccionaron los cambios, los tests 401/403, la prueba PostgreSQL de serialización y las regresiones de errores estructurales. El solicitante reporta 48 tests aprobados; no fueron reejecutados por este revisor porque su política autoriza inspección read-only, no ejecución de pytest.

Findings: 1 BLOQUEANTE, 1 ALTO, 2 MEDIO.

RBAC/config impact: el permiso existente `nomina_novedades` y su manifiesto son consistentes; falta cobertura RBAC en el resto del router genérico. Sin impacto Docker/env/dependencias.

Blocking reasons: rutas genéricas permiten lectura de PII, carga y mutación de nómina sin autenticación ni permiso.

Severity: BLOQUEANTE
