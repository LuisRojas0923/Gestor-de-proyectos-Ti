# Security/RBAC review: approved

**Fecha:** 2026-07-22
**Alcance:** diff efectivo contra `main` del flujo Excel HDI, almacenamiento compartido de nómina y pruebas asociadas. Se verificó nuevamente que `AGENTS.md`, Otros Gerencia, Medicina Prepagada y Pólizas Vehículos no difieren de `main` y quedan fuera del alcance del PR. Evidencia suministrada: 25 pruebas HDI pasan; este revisor no ejecutó pytest por restricciones del rol.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Remaining findings

Ninguno dentro del alcance efectivo revisado.

## Controles confirmados

- ✅ HDI GET/POST hereda `Depends(requiere_permiso_nomina_novedades)`; el módulo `nomina_novedades` existe en el manifiesto.
- ✅ El POST conserva rate limit `5/minute`.
- ✅ El extractor realiza una carga primaria por hoja y evita los seis parseos repetidos anteriores.
- ✅ `TIPO` inválido, encabezados inválidos, exceso de dimensiones y grupos sin exactamente un titular abortan el archivo completo.
- ✅ El error del extractor se devuelve como HTTP 422 genérico sin cédula ni detalle interno.
- ✅ Validación estructural y extracción bloqueante se ejecutan mediante `asyncio.to_thread`.
- ✅ La ruta usa SHA-256 + UUID + extensión controlada; se elimina la carrera por ruta compartida solo por hash.
- ✅ La publicación normal usa temporal exclusivo, `fsync` y `os.replace`, con limpieza del temporal propio ante fallo.
- ✅ La escritura corre en una tarea conservada y esperada bajo `shield`; ante cancelación se espera su finalización, se registra propiedad y se propaga la cancelación.
- ✅ El manejador de `BaseException` protege rollback y borrado de la ruta UUID propia mediante `asyncio.shield`.
- ✅ Hay regresiones para fallo DB posterior a escritura y cancelación, ambas verificando rollback y directorio sin residuos.
- ✅ No se introdujeron secretos, dependencias ni cambios de Docker/env.

RBAC/config impact: el PR añade protección correcta a HDI con `nomina_novedades`; no modifica efectivamente los routers hermanos ni configuración de infraestructura.

Blocking reasons: ninguno.

Severity: BAJO
