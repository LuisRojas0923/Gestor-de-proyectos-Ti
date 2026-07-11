# ADR-008: Alcance de empleados y aplicacion inmutable de horarios

**Estado:** Aceptado
**Fecha:** 2026-07-10
**Rama:** `Modulo_Geoface`
**Plan relacionado:** `docs/reviews/plans/2026-07-10_horarios-predisenados-relaciones-empleados.md`
**Especificacion:** `docs/specs/2026-07-10_horarios-predisenados-relaciones-empleados.md`

## Contexto

Horarios y la supervision administrativa de GeoFace necesitan limitar cada operacion a empleados ERP autorizados para el gestor autenticado. El sistema ya tiene `relaciones_usuarios`, pero esa estructura representa jerarquia entre cuentas locales. Reutilizarla para empleados externos mezclaria subordinacion, aprobacion y alcance operativo, e impondria una cardinalidad que no corresponde al caso muchos-a-muchos.

Las plantillas semanales tambien requieren trazabilidad. Si el horario aplicado dependiera de la version viva de una plantilla, una edicion posterior reescribiria de hecho el pasado y haria imposible explicar el horario que recibio cada empleado.

## Decision

### Separar jerarquia y alcance

`relaciones_gestor_empleado` expresa exclusivamente autorizacion por fila: un usuario gestor puede consultar u operar una cedula ERP. No representa jefe, subordinado, delegacion ni aprobador. Un empleado puede estar relacionado con varios gestores y la relacion puede desactivarse o reactivarse sin borrado fisico.

La autorizacion combina el permiso funcional del endpoint con el alcance por cedula. Solo el rol canonico `admin` omite el filtro de filas; no omite autenticacion ni RBAC. La resolucion incierta falla cerrada.

### Identidad por cedula canonica

El gestor se identifica con `usuarios.id`; el empleado, con cedula ERP canonica. No se crea una FK entre bases de datos ni una replica local maestra de empleados. La implementacion normaliza cedulas numericas, elimina espacios y puntos, deduplica lotes y valida empleados activos contra ERP antes de activar relaciones.

### Copy-on-apply

Aplicar una plantilla copia sus siete dias a `nomina_horario_pactado` y `nomina_horario_pactado_dia`. La plantilla no queda como referencia viva del horario. Cada aplicacion conserva version y nombre de plantilla, snapshot anterior y snapshot aplicado por cedula. Editar o desactivar el catalogo no modifica aplicaciones previas.

### Ledger idempotente

Las operaciones bulk nuevas usan `operaciones_idempotentes`, cuya clave es `(solicitud_id, tipo_operacion)`. El ledger guarda actor, objetivo, hash SHA-256 del payload canonico, estado y resultado sanitizado. Un replay compatible devuelve el resultado previo; reutilizar la solicitud con actor, objetivo o payload distinto produce conflicto. Ledger, mutacion, historial y resultado se confirman en la misma transaccion.

### Inmutabilidad durable

Los historiales y snapshots son append-only. La migracion instala triggers PostgreSQL que rechazan `UPDATE` y `DELETE` sobre:

- `nomina_plantillas_horario_historial`.
- `nomina_aplicaciones_plantilla_horario`.
- `nomina_aplicaciones_plantilla_empleados`.
- `historial_relaciones_gestor_empleado`.

El catalogo y la relacion activa si son mutables porque representan estado actual; la evidencia historica no lo es.

### Integridad y concurrencia compartidas

La migracion debe converger al mismo esquema aunque `SQLModel.metadata.create_all` haya creado previamente las tablas. Por eso agrega constraints nombrados ausentes mediante `ALTER TABLE`, ademas de crear indices y triggers idempotentes; el fallo de esta fase critica se propaga e impide completar el arranque.

Todos los escritores del horario pactado comparten el mismo protocolo por cedula: advisory lock transaccional, creacion idempotente de la cabecera y `SELECT ... FOR UPDATE`. El snapshot anterior se captura solo despues de adquirir ese bloqueo. Los bulk legacy delimitan cada empleado con savepoint para conservar parciales de negocio sin revertir exitos anteriores.

## Consecuencias

- La jerarquia organizacional puede evolucionar sin cambiar autorizaciones operativas y viceversa.
- Las consultas operativas deben aplicar alcance antes de exponer empleados, conteos o recursos indirectos.
- Cambiar la cedula en ERP equivale a cambiar la identidad externa y requiere administrar la relacion correspondiente.
- La aplicacion ocupa mas almacenamiento por los snapshots, a cambio de reconstruccion y auditoria deterministas.
- Los bulk de relaciones y aplicaciones son atomicos e idempotentes; los bulk legacy conservan sus parciales de negocio despues de autorizar el lote completo.
- El ledger no reemplaza el historial de dominio: uno controla reintentos y el otro explica cambios.

## Alternativas rechazadas

- Reutilizar `relaciones_usuarios`: mezcla jerarquia local con alcance ERP y no representa M:N.
- Crear una tabla maestra local de empleados: duplica la fuente ERP y abre problemas de sincronizacion.
- Guardar solo `plantilla_id`: una edicion posterior alteraria la interpretacion historica.
- Propagar automaticamente cambios de plantilla: viola copy-on-apply y puede modificar horarios sin una accion explicita.
- Confiar solo en auditoria HTTP: no garantiza que la evidencia de dominio se confirme junto con la mutacion.

## Referencias de implementacion

- `backend_v2/app/models/auth/relacion_gestor_empleado.py`
- `backend_v2/app/models/novedades_nomina/plantillas_horario.py`
- `backend_v2/app/services/auth/alcance_empleados_service.py`
- `backend_v2/app/services/novedades_nomina/plantillas_horario_service.py`
- `backend_v2/app/services/novedades_nomina/horario_lock_service.py`
- `backend_v2/app/core/migrations/horarios_relaciones_migration.py`
