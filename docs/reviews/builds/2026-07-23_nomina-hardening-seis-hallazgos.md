# Revisión de build — hardening transversal de nómina

**Fecha:** 2026-07-23
**Rama:** `FIX_HDI`
**Estado:** working tree pendiente de commit

## Alcance

1. Los ocho previews directos usan una primitiva común fail-closed que adquiere
   advisory lock antes de cargar excepciones con `FOR UPDATE`.
2. `SALDO_FAVOR` acumula filas repetidas, incluye estados `AGOTADO` del mismo
   período y conserva un historial único durante reproceso y concurrencia.
3. Los extractores fúnebres, servicios de nómina y `useApi` no registran muestras,
   trazas internas ni fragmentos JWT.
4. El reproceso genérico tiene rate limit, lectura acotada, semáforo, timeout y
   proceso cancelable.
5. La carga genérica usa rutas físicas únicas, compensación propia y una identidad
   PostgreSQL única por hash, subcategoría y período.
6. Las consultas ERP síncronas se ejecutan en threads limitados con una sesión
   creada y cerrada dentro del worker.

## Evidencia

- Backend focal ampliado: **202 passed**.
- Frontend focal: **18 passed**.
- Health: **4 passed, 4 skipped** por credenciales/token opcionales.
- ESLint focalizado: **PASS**.
- Build Vite: **PASS**.
- `compileall`: **PASS**.
- `git diff --check`: **PASS**.
- Auditoría incremental final: 28 archivos; 0 diseño, 2 patrones de seguridad,
  11 avisos de fiabilidad y 0 estructura. Backend y seguridad revisaron el delta
  y aprobaron sin bloqueantes; los patrones restantes incluyen deuda preexistente
  explícitamente fuera del alcance.

## PostgreSQL

- Ocho subcategorías directas se prueban con dos transacciones concurrentes para
  saldo repetido, reproceso idempotente e historial único.
- Ocho subcategorías directas se prueban con reproceso concurrente del mismo hash,
  verificando una sola metadata.
- La migración de identidad se ejecuta simultáneamente desde dos conexiones.
- La migración consolida metadata duplicada y reasigna referencias crudas y
  normalizadas sin pérdida.
- El reproceso genérico cubre éxito, rollback posterior al borrado y dos sesiones
  PostgreSQL concurrentes.

## Documentación

- `docs/ESQUEMA_BASE_DATOS.md` registra
  `uq_nomina_archivo_identidad_periodo` fuera de la sección autogenerada.
- `scripts/sync_docs.py` se intentó, pero el host no dispone de `psycopg2`.
  No se editó manualmente la sección marcada como autogenerada.
- `testing/CATALOGO_PRUEBAS.md` quedó actualizado con las suites y conteos.

## Riesgos residuales

- El seed administrativo preexistente y los logs de vistas frontend fuera del
  delta no forman parte de este hardening.
- Los 25 archivos frontend marcados únicamente por LF/CRLF no tienen diferencia
  efectiva y se excluyen del cambio.
