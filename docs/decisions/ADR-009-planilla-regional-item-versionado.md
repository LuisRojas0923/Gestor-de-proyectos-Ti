# ADR-009: ITEM versionado y convivencia de Planilla Regional

**Estado:** Aceptado para planificación
**Fecha:** 2026-07-16
**Rama:** `Modulo_Geoface`
**Especificación:** `docs/specs/2026-07-15_planilla-regional-automatica.md`
**Plan relacionado:** `docs/reviews/plans/2026-07-16_planilla-regional-automatica-ejecucion.md`
**Seguridad operativa:** `docs/specs/2026-07-16_planilla-regional-seguridad-operativa.md`

## Contexto

Planilla Regional combina registros históricos importados desde Excel con filas automáticas generadas por el Planificador semanal. El negocio necesita un ITEM visible, global y permanente, pero los registros pueden corregirse, cambiar de identidad o avanzar por estados oficiales sin perder trazabilidad.

La implementación existente conserva las cargas manuales en `nomina_registros_normalizados`. Tabla Maestra y `exportar-solid` consumen esa tabla, mientras la propuesta automática requiere datos diarios, snapshots contractuales, distribución OT/CC y estados transaccionales que no caben de forma segura en el modelo legacy.

Además, el catálogo actual ya usa `RET` para retardo y `DXT` para descanso por tratamiento. Reutilizar esos conceptos con otro significado reinterpretaría eventos históricos.

## Decisión

### Registro global de ITEM

`nomina_planilla_regional_item` será el único emisor de ITEM para orígenes `ARCHIVO` y `PLANIFICADOR`. ITEM, origen y UUID de registro son inmutables y append-only. Los huecos producidos por rollback o concurrencia son válidos y nunca se reutilizan.

Legacy conserva su tabla actual y referencia el registro global mediante `(item_planilla, origen_planilla)`. Las filas automáticas viven en `nomina_planilla_regional_fila` y referencian el mismo registro global mediante `(item, origen)`.

### Identidad y versionado

La identidad automática es:

```text
cedula + fecha + ubicacion + ot_cc + sub_subc + concepto_interno
```

Cantidad u observación actualizan el mismo ITEM mientras la fila sea BORRADOR. Identidad y snapshots son inmutables desde INSERT; regenerar con fuentes nuevas archiva la versión activa y crea otro ITEM. Una corrección oficial siempre crea un BORRADOR con nuevo ITEM y referencia `reemplaza_item`; al confirmarse, la anterior pasa a `REEMPLAZADO`.

La identidad legacy usa SHA-256 de los valores crudos previos al enriquecimiento ERP. Una segunda huella incluye el contenido normalizado. Repetir ambas huellas conserva ITEM; cambiar solo contenido crea versión; una identidad ausente se archiva.

PostgreSQL protege identidad más versión, ITEM inmutable, `reemplaza_item <> item` y una única versión BORRADOR activa por identidad.

### Preservación de RET y DXT

Los conceptos operativos existentes se mantienen:

- `RET`: retardo, horas.
- `DXT`: descanso por tratamiento, días.

No se actualizan ni renombran filas del catálogo ni eventos existentes. Planilla Regional incorpora conceptos internos nuevos:

- `RETIRO`, cuyo código de salida inicial es `RET`.
- `DEV_TARDANZA`, cuyo código de salida inicial es `DXT`.

El código de salida es un snapshot configurable y no define la semántica interna. La migración verifica antes y después que los conceptos y eventos históricos no hayan cambiado.

### Proyección combinada

Un servicio de consulta construirá una proyección canónica de legacy activo y automático activo. Esta proyección será la única fuente para:

- pantallas 1Q/2Q;
- facetas y resumen;
- exportación oficial;
- Tabla Maestra;
- `exportar-solid` mientras siga soportado.

Las versiones `ARCHIVADO`, `REEMPLAZADO` y `ANULADO` solo aparecen en historial autorizado. No se hace dual-write entre tablas ni deduplicación heurística entre fuentes.

### Snapshots y distribución

Cada fila automática conserva salario, base hora, divisor, vigencia, empresa, ciudad, área, centro de costo, OT/CC, subcentro, especialidad y cliente usados al generarla. Los cambios posteriores en ERP o configuración no reescriben históricos.

La distribución porcentual existente se mantiene por compatibilidad, pero el servidor la convierte a horas con Decimal antes de validar y persistir. Los intervalos que cruzan medianoche se segmentan por fecha antes de resolver activación, quincena, vigencia y concepto.

### Frontera transaccional

Guardar borrador, confirmar cálculo y cambiar workflow tienen un solo propietario exterior de `commit`/`rollback`. Todos los servicios internos, incluido costos OT, usan `flush` y savepoints sin confirmar transacciones.

Un `IntegrityError` se maneja fuera del savepoint abortado. Solo después del rollback del savepoint se relee la versión ganadora bajo advisory lock.

### Migración y activación

La entrega se divide en migraciones expand/validate/activate:

1. Provisionar `btree_gist` fuera del runtime.
2. Crear esquema inactivo e idempotente.
3. Ejecutar backfill por lotes reanudables.
4. Crear constraints `NOT VALID` y validarlos por fase.
5. Crear índices concurrentes fuera de la transacción crítica cuando el volumen lo requiera.
6. Desplegar lectores/escritores con la funcionalidad desactivada.
7. Activar una sola vez en fecha futura 1/16 mediante aprobación humana separada.

El startup puede verificar y fallar si falta una dependencia crítica, pero no instala extensiones ni ejecuta un backfill monolítico.

### Seguridad y archivos

Las rutas nuevas y ramas category-aware de Planilla Regional requieren autenticación, permiso base, permisos granulares y alcance previo. Categorías ajenas no cambian en este diff; su hardening global es prerrequisito separado de activación. Tabla Maestra y Solid reciben permisos dedicados.

Las cargas `.xlsx`/`.xlsm` se leen por chunks. `.xlsm` se conserva por compatibilidad con formularios vigentes, pero las macros nunca se ejecutan; el original queda en cuarentena y la carga falla cerrada si no está disponible el control antimalware requerido.

La auditoría usa un DTO sin PII, HMAC-SHA256 versionado y almacenamiento append-only. Exportación, carga, configuración y denegaciones críticas fallan cerrado si la auditoría no persiste.

## Consecuencias

- ITEM permanece explicable aunque cambien cantidades, identidad o estado.
- Legacy y automático conviven sin borrar ni reescribir datos entre tablas.
- Tabla Maestra y exportaciones requieren migrar a una proyección compartida.
- Se agregan almacenamiento y complejidad por snapshots, a cambio de reconstrucción determinista.
- La migración necesita coordinación operativa y no puede reducirse a un único hook de startup.
- Los roles existentes deben recibir permisos nuevos mediante auto-discovery y una política explícita de asignación.
- Activar la funcionalidad es irreversible y conserva una puerta humana independiente.

## Alternativas Rechazadas

- Reutilizar `RET`/`DXT` con significados nuevos: reinterpreta históricos.
- Guardar automático en `nomina_registros_normalizados`: pierde grano diario y fuerza dual-write.
- Mantener consultas separadas por consumidor: produce divergencias entre pantalla, Tabla Maestra y exportación.
- Reutilizar ITEM al corregir una fila oficial: rompe trazabilidad.
- Calcular snapshots al consultar: reescribe de hecho el pasado cuando cambia ERP.
- Instalar `btree_gist` con el usuario runtime: viola mínimo privilegio.
- Rechazar `.xlsm` sin transición: rompe los formularios regionales vigentes.

## Puertas de Revisión

- La especificación y el plan deben aprobarse antes de crear pruebas o código.
- Cada fase requiere TDD rojo/verde y revisión de build independiente.
- La activación requiere evidencia de migración, rollback/forward-fix, RBAC, auditoría y aprobación humana explícita.
