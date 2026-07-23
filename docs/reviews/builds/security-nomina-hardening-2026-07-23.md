# Security/RBAC review: blocked

**Fecha:** 2026-07-23
**Alcance:** working tree de nómina; PII/JWT/logging, abuso de reproceso, atomicidad de carga y migración de identidad de archivos.
**Método:** revisión estática de cambios staged/unstaged/untracked y del código vigente alcanzado por esos flujos. No se ejecutaron tests ni servicios.

## Checklist results

- Auth en endpoints: ✅ — los routers revisados heredan `requiere_permiso_nomina_novedades`; reproceso y cargas tienen rate limit.
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ❌ — quedan excepciones y detalles internos en logs del alcance.
- Secrets guard: ❌ — persiste una credencial administrativa predecible en inicialización.
- No print(): ✅
- PII redacted: ❌ — errores Axios completos y trazas backend aún pueden contener JWT, parámetros o PII.

## Findings

### 1. BLOQUEANTE — Credencial administrativa pública y predecible

- **Archivo/línea:** `backend_v2/app/core/migrations/manager.py:90-98`
- **Evidencia:** el startup crea `admin` con contraseña literal `admin123` cuando no encuentra la cuenta.
- **Impacto:** toma de control con privilegios administrativos en cualquier despliegue donde el seed se ejecute sin una rotación inmediata y verificable.
- **CWE:** CWE-798, CWE-521.

### 2. ALTO — El frontend de nómina registra objetos Axios completos con el Bearer token

- **Archivos/líneas representativas:**
  - `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/BogotaLibranzaPreview.tsx:90-92,121-123`
  - `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/BeneficiarPreview.tsx:91,122`
  - `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/CamposantoPreview.tsx:99,130`
  - `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/ExcepcionesPreview.tsx:81,104,142,167,194`
  - `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/NominaUploadView.tsx:64`
  - patrón equivalente en 55 llamadas `console.*` bajo el directorio de nómina.
- **Evidencia:** `frontend/src/services/nominaApi.ts:20-26` inserta `Authorization: Bearer ...` en la configuración Axios; los `catch` imprimen `err`, que puede incluir `error.config.headers`, URL, parámetros y cuerpo/respuesta. El saneamiento nuevo de `useApi.ts:80-118` no protege estas llamadas Axios directas.
- **Impacto:** exposición de JWT y potencial PII de nómina en DevTools, capturas, soporte remoto o recolectores de consola.
- **CWE:** CWE-532, CWE-200.

### 3. ALTO — Timeout ERP agotable: cuatro consultas colgadas bloquean indefinidamente el módulo

- **Archivo/línea:** `backend_v2/app/services/novedades_nomina/nomina_helper.py:25-43`
- **Evidencia:** la espera del semáforo ocurre fuera de cualquier timeout; la consulta en hilo está protegida con `shield`, y el permiso se libera únicamente cuando termina el hilo. Si el driver ERP no retorna, después de cuatro timeouts quedan ocupados los cuatro permisos y solicitudes posteriores esperan indefinidamente en `acquire()`.
- **Impacto:** un ERP degradado —o reprocesos repetidos por usuarios autorizados— puede causar denegación de servicio persistente para cargas de nómina. El rate limit por endpoint no limita la cola global ni recupera hilos colgados.
- **CWE:** CWE-400, CWE-667.

### 4. ALTO — La nueva unicidad rompe el reproceso idéntico de ocho flujos directos

- **Archivos/líneas:**
  - restricción: `backend_v2/app/models/novedades_nomina/nomina.py:13-20`
  - inserciones incondicionales: `cooperativas_beneficiar.py:195-204`, `cooperativas_grancoop.py:237-245`, `descuentos_control.py:255-260`, `funebres.py:190-219,413-452`, `libranzas_bogota.py:176-195`, `libranzas_davivienda.py:164-172`, `libranzas_occidente.py:164-172`.
- **Evidencia:** cada flujo elimina registros del período y crea siempre otro `NominaArchivo`; al reenviar el mismo contenido/subcategoría/período, la restricción `(hash_archivo, subcategoria, mes_fact, año_fact)` produce `IntegrityError`. No existe recuperación del registro existente en estos routers.
- **Impacto:** reprocesos legítimos fallan con 500. El rollback conserva los registros anteriores, pero deja al operador sin una operación idempotente y facilita presión repetida sobre extracción, ERP y almacenamiento.
- **CWE:** CWE-703, CWE-400.

### 5. MEDIO — Archivo físico y transacción DB no son atómicos en flujos directos

- **Archivo/línea representativa:** `backend_v2/app/api/novedades_nomina/routers/funebres.py:179-222`; mismo patrón en los siete routers directos indicados en el finding 4.
- **Evidencia:** el archivo se escribe antes del `DELETE`/`INSERT`/`COMMIT`; ante fallo DB solo se hace rollback y no se compensa el archivo. La ruta compartida `NominaService.procesar_flujo` sí tiene compensación, pero estos flujos no la usan.
- **Impacto:** archivos huérfanos consumen cuota/disco y pueden acumularse mediante fallos o reprocesos repetidos; la metadata y el almacenamiento dejan de representar el mismo estado.
- **CWE:** CWE-459, CWE-400.

### 6. MEDIO — Migración destructiva y bloqueante se ejecuta completa en cada startup sin timeout

- **Archivos/líneas:** `backend_v2/app/core/migrations/nomina_archivos_migration.py:8-56`; invocación `backend_v2/app/core/migrations/manager.py:57-59`.
- **Evidencia:** toma advisory lock y `SHARE ROW EXCLUSIVE`, recorre/revincula ambas tablas de registros, elimina metadata duplicada y altera la tabla en cada arranque. No configura `lock_timeout`/`statement_timeout`, no omite el saneamiento cuando la constraint ya existe y la invocación no está encapsulada para degradación controlada.
- **Impacto:** despliegue o reinicio puede esperar indefinidamente por locks, bloquear escrituras de nómina o no completar startup. Además, conserva solo la metadata más reciente y elimina las anteriores, por lo que la política de retención/auditoría debe aprobarse explícitamente antes de producción.
- **CWE:** CWE-400, CWE-667.

### 7. MEDIO — Persisten trazas y detalles internos en logging de nómina

- **Archivos/líneas:**
  - `backend_v2/app/api/novedades_nomina/routers/excepciones.py:34,56,68,108,132`
  - `backend_v2/app/api/novedades_nomina/routers/tabla_maestra.py:25-26,58-59`
  - `backend_v2/app/services/novedades_nomina/tabla_maestra_service.py:93,304`
  - `backend_v2/app/services/novedades_nomina/nomina_manual_service.py:126,234,387`
- **Evidencia:** uso de `logger.exception`, `exc_info=True` y `str(e)`. En fallos SQL/ERP pueden registrarse SQL, parámetros, IDs, rutas o estructura interna. El hardening aplicado a `nomina_router.py`, Camposanto, Recordar y `nomina_service.py` es parcial.
- **Impacto:** exposición de detalles internos y potencial PII en logs operativos.
- **CWE:** CWE-532, CWE-209.

## Controles positivos

- `frontend/src/hooks/useApi.ts:80-118` deja de imprimir fragmentos del JWT, query strings y cuerpos de error.
- `nomina_router.py:258-269` agrega auth heredada, rate limit al reproceso y ejecutor acotado.
- `procesamiento_seguro.py:43-119` limita lectura a 20 MiB y mueve extracción genérica a proceso con timeout.
- El reemplazo de registros ocurre dentro de una transacción y el reproceso genérico valida filas antes de borrar; un fallo revierte la sustitución.
- Las rutas de descarga validan que el path resuelto permanezca bajo `uploads/nomina`.
- No se detectaron nuevas claves API, private keys ni JWT literales en los archivos Python revisados. RBAC sigue representado por `nomina_novedades` en `rbac_manifest.py:263-268`.

## RBAC/config impact

No se añadieron módulos ni endpoints sin protección observados. El impacto principal es de disponibilidad, secreto administrativo, logging sensible y consistencia entre filesystem/DB. La migración cambia semántica de retención y debe validarse con operación/auditoría.

## Blocking reasons

1. Seed administrativo con credencial conocida.
2. Riesgo real de exposición de JWT mediante errores Axios completos.
3. Reproceso directo incompatible con la restricción única recién introducida.
4. El wrapper ERP puede quedar agotado indefinidamente.

**Severity:** BLOQUEANTE
**Conteo:** 1 bloqueante, 3 altos, 3 medios, 0 bajos.
