# Security/RBAC review: approved

**Fecha:** 2026-07-23  
**Alcance:** segunda revisión exclusivamente de bloqueantes causados o no resueltos por el delta actual de hardening de nómina. Revisión estática; no se ejecutaron tests ni servicios.

## Checklist results

- Auth en endpoints: ✅
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500 dentro del delta revisado: ✅
- Secrets guard: N/A — el seed preexistente quedó expresamente fuera del delta solicitado.
- No print(): ✅
- PII/JWT redacted dentro del delta revisado: ✅

## Findings bloqueantes del delta

**Ninguno.**

Se verificó que las correcciones eliminan los bloqueantes atribuibles al cambio:

- Los ocho flujos directos reutilizan metadata mediante `NominaService.obtener_o_crear_archivo`, bajo el lock transaccional del período.
- La carga genérica usa una ruta física UUID propia y elimina únicamente esa ruta ante duplicado o fallo DB.
- Las consultas ERP crean y cierran su sesión dentro del worker; tanto ejecución como espera del semáforo tienen timeout.
- La migración retorna si la constraint existe, revalida tras el advisory lock y limita la espera del lock de tabla.
- Los loggers modificados ya no incluyen `str(e)`, traceback ni IDs/PII variables.
- `useApi` sanea ruta, no imprime JWT/cuerpo/error de refresh, cierra el estado de carga y evita reintentos 401 ilimitados.

## Exclusiones solicitadas

- `admin123`: preexistente y fuera del delta.
- `console.error(err)` en archivos frontend EOL-only: sin cambio semántico en el delta.

## RBAC/config impact

No se observaron endpoints nuevos sin `requiere_permiso_nomina_novedades`, debilitamiento de RBAC ni cambios de tenant/data boundary atribuibles al delta.

## Blocking reasons

Ninguno.

**Severity:** N/A  
**Conteo del delta:** 0 bloqueantes.
