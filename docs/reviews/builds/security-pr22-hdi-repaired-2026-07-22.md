# Security/RBAC review: approved_with_risks

**Fecha:** 2026-07-22
**Alcance:** diff efectivo de PR #22 reparado contra `origin/main`, incluido el árbol de trabajo actual, para endpoints HDI GET/POST, validación Excel, extracción, persistencia y pruebas asociadas. Revisión estática; no se ejecutaron pruebas porque el rol no tiene `pytest` autorizado.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Findings

### MEDIO — amplificación de CPU, memoria y respuesta mediante relecturas y advertencias sin límite

Cada una de hasta 10 hojas se carga completa una vez y puede volver a parsearse hasta seis veces buscando el encabezado. Cada intento agrega una advertencia por fila inválida a una lista global sin límite. Un libro permitido puede provocar cientos de miles de mensajes; si existe al menos una fila válida, la lista completa se devuelve al cliente. El límite de 10 MB, las cotas de 5.000 × 50 × 10, el límite ZIP descomprimido y el rate limit reducen el impacto, pero no evitan esta amplificación para un usuario autorizado.

Recomendación: parsear cada hoja una sola vez, detectar el encabezado sobre el DataFrame ya cargado, limitar/deduplicar advertencias y devolver un conteo resumido con una muestra acotada.

Referencias: `backend_v2/app/services/novedades_nomina/hdi_extractor.py:237-248`, `backend_v2/app/services/novedades_nomina/hdi_extractor.py:231-232`, `backend_v2/app/services/novedades_nomina/nomina_service.py:224-231`. CWE-400, CWE-770.

### MEDIO — carrera entre archivo compartido por hash, rollback y borrado compensatorio

La ruta física es segura frente a traversal porque usa SHA-256 y una extensión controlada, y el nombre original solo se conserva mediante `basename`. Sin embargo, dos solicitudes concurrentes con el mismo contenido comparten ruta. Una puede observar el archivo existente mientras otra lo creó; si la creadora luego falla su transacción, elimina el archivo aunque la otra solicitud llegue a confirmar una referencia DB a esa ruta. Además, `exists()` seguido de apertura exclusiva permite que una carrera legítima produzca 500.

Recomendación: coordinar por hash, registrar propiedad/refcount de blob o usar temporal exclusivo + publicación atómica y reconciliación transaccional antes de borrar.

Referencias: `backend_v2/app/services/novedades_nomina/nomina_service.py:113-121`, `backend_v2/app/services/novedades_nomina/nomina_service.py:131-145`, `backend_v2/app/services/novedades_nomina/nomina_service.py:235-243`. CWE-367, CWE-459.

### BAJO — cobertura adversarial incompleta de los controles críticos

La evidencia nueva confirma 401/403 para GET, rechazo de PDF/ZIP genérico, incompatibilidad de contenedor, dimensiones y un XLS BIFF8 real. No hay regresión focal para POST sin JWT/permiso, respuesta 429, MIME incompatible, ZIP traversal, cifrado, exceso de entradas/bytes/ratio, CRC corrupto ni la carrera de almacenamiento. El código implementa esos controles, por lo que esta carencia de evidencia no bloquea la revisión estática.

Referencias: `testing/backend/test_hdi_excel_security.py:55-83`, `testing/backend/test_hdi_excel_security.py:86-130`, `backend_v2/app/services/novedades_nomina/validacion_excel_hdi.py:60-124`. CWE-693.

## Controles confirmados

- ✅ GET `/hdi/datos` y POST `/hdi/preview` heredan `Depends(requiere_permiso_nomina_novedades)`, que valida JWT y el permiso `nomina_novedades`.
- ✅ `nomina_novedades` está registrado en `backend_v2/app/core/rbac_manifest.py:262-268`.
- ✅ POST tiene rate limit `5/minute`; SlowAPI está registrado y falla cerrado ante indisponibilidad de Redis.
- ✅ Se exige exactamente un archivo y se lee como máximo 10 MB + 1 byte antes de validarlo.
- ✅ Extensión, MIME permitido y contenedor real se correlacionan; PDF disfrazado, ZIP genérico y OLE/XLSX cruzados se rechazan.
- ✅ XLSX valida estructura OOXML, rutas internas, cifrado, cantidad de entradas, tamaño por miembro, tamaño total, ratio de compresión, CRC y dimensiones antes de pandas.
- ✅ XLS exige firma OLE y apertura válida BIFF mediante `xlrd`, además de límites de hojas/filas/columnas.
- ✅ Fórmulas no se ejecutan (`data_only=True`) y los ZIP no se extraen al filesystem.
- ✅ Las respuestas de validación son genéricas y no incluyen excepciones internas, paths ni nombres de tablas; el log modificado ya no interpola `str(e)`.
- ✅ El filesystem usa nombre SHA-256 y extensión validada; el nombre suministrado no controla la ruta.
- ✅ No se introducen secretos, cambios de entorno/compose ni dependencias nuevas; `.env` y `backend_v2/uploads/nomina/` permanecen ignorados.
- ✅ La PII de nómina solo se entrega tras RBAC; no se añadió logging de cédulas, nombres, archivos o tokens en este diff.

RBAC/config impact: protección correcta y consistente con el manifiesto existente `nomina_novedades`; sin cambios de configuración o infraestructura.

Blocking reasons: ninguno. Los riesgos restantes requieren permiso del módulo o concurrencia específica y están acotados, pero deben corregirse para robustez operativa.

Severity: MEDIO
