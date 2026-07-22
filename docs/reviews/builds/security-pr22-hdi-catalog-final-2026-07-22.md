# Security/RBAC review: PR #22 HDI — cierre de catálogo

Security/RBAC review: approved_with_risks

**Fecha:** 2026-07-22
**Alcance:** cambio final de protección de `GET /catalogo` y regresiones RBAC asociadas, integrado con la revisión final del flujo HDI de PR #22. Revisión estática; se acepta la evidencia reportada de 70 pruebas focalizadas aprobadas.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Resultado

- ✅ `GET /catalogo` exige `Depends(requiere_permiso_nomina_novedades)` en `backend_v2/app/api/novedades_nomina/nomina_router.py:46-49`.
- ✅ La matriz de rutas sensibles incorpora `/api/v2/novedades-nomina/catalogo` en `testing/backend/test_nomina_rbac_concurrencia.py:21-31`.
- ✅ La misma matriz verifica rechazo sin token con 401 y sin permiso con 403 en `testing/backend/test_nomina_rbac_concurrencia.py:34-52`.
- ✅ Con este cambio quedan protegidas por el permiso `nomina_novedades` todas las operaciones solicitadas: catálogo, carga, procesamiento, preview, descarga, resumen, detalle, historial y exportar-solid.
- ✅ Se mantienen los cierres ya verificados: respuestas 500 genéricas sin `str(e)`, descarga confinada a `uploads/nomina`, RBAC consistente con el manifiesto y controles de archivo HDI.

## Findings

No se identifican hallazgos bloqueantes, altos ni medios dentro del alcance de PR #22 HDI.

Permanece únicamente la deuda baja, previa y no expuesta por HTTP, de registrar/conservar `str(e)` en algunos errores del cargador/procesador genérico (`backend_v2/app/api/novedades_nomina/nomina_router.py:85-86,103-104,189-191`). No debilita RBAC, confinamiento de descarga ni el flujo especializado HDI, y no bloquea este PR.

## Evidencia y veredicto

Se acepta la evidencia aportada de **70 passed** en la suite focalizada RBAC/path/error. No fue reejecutada por este revisor porque su rol no autoriza ejecutar pytest.

Findings: 0 BLOQUEANTE, 0 ALTO, 0 MEDIO, 1 BAJO.

RBAC/config impact: cierre correcto de la última ruta pública identificada en el alcance; usa el permiso existente `nomina_novedades`, sin cambios de manifiesto, secretos, dependencias, Docker o entorno.

Blocking reasons: ninguno.

Severity: BAJO
