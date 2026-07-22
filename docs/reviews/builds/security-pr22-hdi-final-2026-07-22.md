# Security/RBAC review: PR #22 HDI final

Security/RBAC review: approved_with_risks

**Fecha:** 2026-07-22
**Alcance:** cambios locales de PR #22 para carga/procesamiento HDI, rutas genéricas de archivo, preview, descarga, resumen, detalle, historial y exportación SOLID. Revisión estática; se acepta como evidencia reportada la suite focalizada de 68 pruebas RBAC/path/error aprobadas.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Verificaciones solicitadas

- ✅ Carga `POST /archivos`: exige `Depends(requiere_permiso_nomina_novedades)` en `backend_v2/app/api/novedades_nomina/nomina_router.py:58-62`.
- ✅ Procesamiento `POST /archivos/{archivo_id}/procesar`: mismo permiso en `nomina_router.py:125-128`.
- ✅ Preview genérico: mismo permiso en `nomina_router.py:192-196`; preview/procesamiento HDI y consulta HDI heredan la dependencia a nivel de router en `backend_v2/app/api/novedades_nomina/routers/otros_hdi.py:18-25,68-80`.
- ✅ Descarga: mismo permiso en `nomina_router.py:212-215`.
- ✅ Resumen: mismo permiso en `nomina_router.py:246-250`.
- ✅ Detalle: mismo permiso en `nomina_router.py:275-278`.
- ✅ Historial: mismo permiso en `nomina_router.py:301-304`.
- ✅ Exportar SOLID: mismo permiso en `nomina_router.py:375-378`.
- ✅ La dependencia autentica con `obtener_usuario_actual_db` y comprueba `nomina_novedades` en `backend_v2/app/api/novedades_nomina/dependencies.py:10-19`; el ID coincide con el manifiesto en `backend_v2/app/core/rbac_manifest.py:262-268`.
- ✅ Todos los `HTTPException(500)` de las rutas revisadas devuelven mensajes constantes, sin `str(e)`, en `nomina_router.py:123,139,153,189,210,225,273,299,345,354,394`. El error estructural publicable es 422, acotado a hoja/fila/campo/regla (`nomina_service.py:113-123`; `hdi_extractor.py:164-167`).
- ✅ La descarga resuelve raíz y destino con `strict=True`, exige archivo regular y padre exactamente igual a `uploads/nomina`, rechazando traversal y symlinks que resuelvan fuera: `nomina_router.py:230-243`.
- ✅ El flujo HDI mantiene límites de tamaño/ZIP/hojas/filas/columnas, correlación extensión-contenido y rate limit `5/minute`: `otros_hdi.py:24-51`; `validacion_excel_hdi.py:11-18,60-124,146-167`.
- ✅ La persistencia usa nombre SHA-256 + UUID bajo `uploads/nomina`, lock transaccional por periodo, escritura temporal atómica, rollback/limpieza y commit protegido frente a cancelación: `nomina_service.py:18-28,139-174,176-212,293-303`.

## Findings

### BAJO — catálogo estático continúa público fuera del conjunto sensible validado (CWE-306)

`GET /catalogo` no declara autenticación ni RBAC en `backend_v2/app/api/novedades_nomina/nomina_router.py:46-56`. Solo expone constantes de categorías/subcategorías, sin PII ni capacidad de mutación, y no representa una regresión introducida por las reparaciones finales. Aun así, incumple la regla global del proyecto que limita las rutas API v2 públicas a health/auth expresamente autorizadas.

### BAJO — deuda previa de detalle interno en logging del cargador genérico (CWE-532)

Aunque ninguna respuesta 500 revisada interpola excepciones, el cargador genérico aún registra `str(e)` al fallar la escritura física o la consulta de duplicados en `backend_v2/app/api/novedades_nomina/nomina_router.py:82-84,100-101`, y conserva `str(e)` en `error_log` al fallar el procesamiento genérico en `nomina_router.py:184-188`. No pertenece al camino especializado HDI y no es una exposición HTTP, pero conviene sustituirlo por logging estructurado/redactado y diagnósticos internos controlados.

## Evidencia y conclusión

- La prueba parametrizada cubre 401 y 403 para las ocho operaciones sensibles en `testing/backend/test_nomina_rbac_concurrencia.py:21-51`.
- Las regresiones de no divulgación y confinamiento están en `testing/backend/test_nomina_rbac_concurrencia.py:221-248`.
- Se acepta la evidencia aportada de **68 pruebas focalizadas aprobadas**; este revisor no las reejecutó porque su rol no autoriza ejecutar pytest.
- No se detectan secretos, nuevas dependencias, cambios Docker/env ni regresiones de seguridad relevantes en el flujo HDI.

Findings: 0 BLOQUEANTE, 0 ALTO, 0 MEDIO, 2 BAJO.

RBAC/config impact: el flujo usa el permiso existente `nomina_novedades`, registrado y consistente con el manifiesto; sin impacto de configuración o infraestructura.

Blocking reasons: ninguno.

Severity: BAJO
