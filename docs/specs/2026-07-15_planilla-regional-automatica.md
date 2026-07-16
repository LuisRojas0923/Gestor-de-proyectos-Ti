# Especificacion: Planilla Regional automatica

**Fecha:** 2026-07-15
**Estado:** Aprobada contractualmente; pendiente de SHA y autorización de Fase 1P
**Modulo:** Novedades de Nomina / Horas Extras
**Decisiones y plan:** `docs/decisions/ADR-009-planilla-regional-item-versionado.md` y `docs/reviews/plans/2026-07-16_planilla-regional-automatica-ejecucion.md`. Seguridad operativa: `docs/specs/2026-07-16_planilla-regional-seguridad-operativa.md`.

## 1. Objetivo

Alimentar automaticamente las pantallas existentes:

- `/service-portal/novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 1Q`
- `/service-portal/novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 2Q`

Las filas se generan desde el Planificador semanal al guardar un borrador. Las cargas Excel historicas siguen disponibles y se muestran junto con las filas automaticas, sin dual-write ni eliminacion cruzada.

## 2. Reglas Confirmadas

- `ITEM` es un consecutivo numerico global, permanente e inmutable.
- Se aceptan huecos en ITEM por rollback o concurrencia; nunca se reutiliza un numero.
- Dias 1 a 15 alimentan `1Q`; dias 16 a fin de mes alimentan `2Q`.
- Solo se generan datos automaticos desde la activacion de la funcionalidad; no se reconstruye historia.
- La fila aparece al guardar el borrador con estado `BORRADOR`.
- El usuario ve el estado en la aplicacion.
- El Excel oficial solo contiene filas `CONFIRMADO` o posteriores; nunca `BORRADOR`.
- Si cambia novedad u OT/CC, la fila anterior se archiva y la nueva recibe otro `ITEM`.
- Inicialmente el cumplimiento proviene del horario registrado. La fuente se guarda para permitir integrar biometria en una fase posterior.
- `SALARIO` usa las horas pactadas del dia.
- `CMP`, `VAC`, `INC`, `LIC`, `REM`, `AUS`, `PNR`, `SAN`, `RETIRO`, `ARL` y `DEV_TARDANZA` reemplazan `SALARIO` ese día.
- `BASE HORA = SALARIO / divisor legal vigente`, resuelto desde parametros del backend.
- Varias OT/CC se prorratean segun horas asignadas. La suma debe cuadrar con las horas del dia; de lo contrario se bloquea el guardado.
- Sin OT/CC explicita se usa el centro de costo contractual del ERP.
- `ENCARGADOS` corresponde al area contractual del empleado.
- `SUCURSAL` corresponde a la ciudad de contratacion.
- `RESPONSABLE` es el usuario autenticado que guarda el plan.
- `CLIENTE` se obtiene de la OT en `basegeneralcostos`; para CC sin cliente queda vacio.
- La tabla es una vista funcional de la aplicacion, no solamente una exportacion.
- La aplicacion muestra 22 columnas: las 20 originales mas `ESTADO` y `ORIGEN`.
- El Excel oficial conserva exactamente las 20 columnas originales.
- Las cargas manuales no pueden solaparse con fechas cubiertas por la generacion automatica.
- Los historicos incompletos muestran los campos disponibles y dejan vacios los datos que el extractor anterior no conservo.
- Un registro oficial no se modifica: un cambio posterior crea una correccion BORRADOR con nuevo ITEM.
- Los códigos de salida son parametrizables; `RETIRO` y `DEV_TARDANZA` producen inicialmente `RET` y `DXT` sin reinterpretar los conceptos históricos homónimos.

## 3. Grano De Datos

Una fila activa representa:

```text
cedula + fecha + ubicacion(OT|CC) + referencia + novedad
```

Cambios de cantidad u observacion sobre la misma identidad actualizan el mismo `ITEM`. Cambios de novedad, referencia o ubicacion archivan la fila anterior y crean una nueva.

## 4. Modelo De Persistencia

### 4.1 Registro Global De ITEM

Crear `nomina_planilla_regional_item_seq` y `nomina_planilla_regional_item` en PostgreSQL.

- `nomina_planilla_regional_item` contiene `item BIGINT PRIMARY KEY DEFAULT nextval(...)`, `origen VARCHAR(20)`, `registro_uuid UUID UNIQUE` y `UNIQUE (item, origen)` para soportar la FK compuesta PostgreSQL.
- Legacy y automatico usan FK compuesta `(item, origen)` hacia el registro global; el origen tiene CHECK y no puede cambiar.
- Los historicos 1Q/2Q reciben ITEM una sola vez, en orden determinista por ID.
- La migracion ejecuta bajo advisory lock `setval(secuencia, GREATEST(last_value, max(item)), true)`; nunca reduce la secuencia.
- Las futuras cargas manuales y automaticas reservan ITEM con `INSERT ... RETURNING`.
- Otras categorias de nomina no consumen ITEM.
- La aplicacion no acepta ITEM suministrado por el cliente y no permite actualizarlo.

### 4.2 Extension Legacy

Agregar a `nomina_registros_normalizados`:

| Campo | Tipo | Uso |
|---|---|---|
| `item_planilla` | `BIGINT NULL` | ITEM visible y permanente para planillas regionales. |
| `origen_planilla` | `VARCHAR(20)` | `ARCHIVO`; permite union y evita borrado cruzado. |
| `clave_planilla` | `CHAR(64) NULL` | SHA-256 de identidad legacy canónica previa al enriquecimiento ERP. |
| `huella_planilla` | `CHAR(64) NULL` | SHA-256 del contenido normalizado para detectar cambios reales. |
| `calidad_clave_planilla` | `VARCHAR(30) NULL` | `CRUDA` o `PERSISTIDA_NO_RECONCILIABLE`. |
| `estado_planilla` | `VARCHAR(20)` | `CONFIRMADO`, `ARCHIVADO` o `REEMPLAZADO`. |
| `activo_planilla` | `BOOLEAN` | Excluye versiones legacy archivadas sin perder ITEM. |

`item_planilla` es único cuando no es NULL. La identidad preferida usa datos crudos previos a ERP. Una recarga con hashes iguales conserva ITEM; contenido distinto crea versión. Históricos sin crudo reciben ITEM pero quedan `PERSISTIDA_NO_RECONCILIABLE`: nunca se emparejan ni archivan automáticamente hasta remediación auditada. Solo un reemplazo completo confirmado archiva identidades `CRUDA` ausentes. Toda quincena que interseque activación bloquea carga manual.

### 4.3 Filas Automaticas

Crear `nomina_planilla_regional_fila` con:

| Grupo | Campos principales |
|---|---|
| Identidad | `id UUID`, `item BIGINT`, `version INTEGER`, `activo BOOLEAN`, `reemplaza_item BIGINT NULL` |
| Origen | `origen`, `fuente_cumplimiento`, `estado`, `anio_calendario`, `mes`, `anio_iso`, `semana_iso`, `quincena` |
| Empleado | `cedula`, `empleado`, `salario`, `base_hora`, `aplica_he`, `empresa`, `sucursal` |
| Jornada | `fecha`, `cantidad`, `cantidad_horas`, `concepto_interno`, `codigo_salida_snapshot`, `divisor_hora_snapshot`, `parametro_vigente_desde_snapshot`, `parametro_vigente_hasta_snapshot`, `observaciones` |
| Distribucion | `ot_cc`, `sub_subc`, `especialidad_ot`, `ubicacion`, `cliente` |
| Trazabilidad | `responsable_id`, `responsable_nombre`, `encargados`, `calculo_id`, `creado_en`, `actualizado_en`, `confirmado_en` |

Claves y restricciones:

- `id UUID PRIMARY KEY` y `item BIGINT UNIQUE NOT NULL` con FK al registro global.
- `reemplaza_item` referencia el registro global de ITEM; `calculo_id` referencia el calculo semanal cuando exista.
- La identidad canonica usa columnas: `(cedula, fecha, ubicacion, ot_cc, sub_subc, concepto_interno, version)`; `sub_subc` es `NOT NULL DEFAULT ''` para evitar duplicados por semantica NULL.
- `CHECK (ubicacion IN ('OT', 'CC'))`.
- `CHECK (origen = 'PLANIFICADOR')` y `CHECK (quincena IN ('1Q', '2Q'))`.
- `CHECK (estado IN ('BORRADOR', 'CONFIRMADO', 'PAGADO', 'COMPENSADO', 'ANULADO', 'ARCHIVADO', 'REEMPLAZADO'))`.
- Checks de cantidades no negativas y coherencia entre `activo` y estados archivados.
- Checks derivados garantizan que año calendario, mes, quincena, año ISO y semana ISO coincidan con `fecha`.
- Indice unico parcial para una sola version BORRADOR activa por identidad base.
- Indices por `(anio, mes, quincena)`, `cedula`, `fecha`, `estado` y `origen`.
- Salario usa `NUMERIC(16,2)`, base hora `NUMERIC(16,6)` y cantidades `NUMERIC(10,4)`; schemas y dominio usan `Decimal`.
- Fechas de auditoria usan `TIMESTAMPTZ`.

La fecha efectiva se persiste en `nomina_planilla_regional_configuracion`, singleton auditado. Solo puede ser dia 1 o 16 y, si el despliegue ocurre a mitad de quincena, se usa el siguiente limite. Se vuelve inmutable en la misma transaccion que activa la funcionalidad, antes de generar filas. Cada fecha diaria se compara individualmente para soportar semanas que crucen activacion, quincena, mes o anio.

### 4.4 DDL Contractual

El contrato PostgreSQL completo se mantiene en `docs/specs/2026-07-16_planilla-regional-ddl.md`. Incluye tablas, columnas del Planificador, auditoría dedicada, índices, constraints y triggers idempotentes.

La migración converge desde tabla ausente, tabla parcial o definición anterior: inspecciona `pg_catalog`, agrega o corrige cada objeto de forma nombrada y nunca confía únicamente en `CREATE TABLE IF NOT EXISTS`.

Triggers separados impiden modificar ITEM/origen tanto en el registro global como en `nomina_registros_normalizados` y `nomina_planilla_regional_fila`. Configuración solo admite `FALSE -> TRUE`; códigos solo permite cerrar una vigencia dentro de la función que crea su sucesora. El runtime verifica `btree_gist`, pero nunca instala extensiones.

## 5. Contrato De Las Columnas

| Columna | Regla |
|---|---|
| ITEM | Secuencia compartida y permanente. |
| CEDULA | Cedula canonica. |
| EMPLEADO | Nombre ERP. |
| SALARIO | `beneficio.salario` del contrato activo. |
| BASE HORA | Salario dividido por divisor legal vigente. |
| APLICA HE | ERP mas override auditado del horario. |
| EMPRESA | Contrato ERP activo. |
| SUCURSAL | Ciudad de contratacion. |
| FECHA | Fecha calendario derivada de semana ISO y dia. |
| OT / CC | Referencia seleccionada o CC contractual de respaldo. |
| SUB. / SUBC. | `scc` o `sub_indice` ERP. |
| ESPECIALIDAD OT | Clasificacion de la combinacion ERP seleccionada. |
| CANTIDAD | Unidad del concepto: dias para `SALARIO` y ausencias; horas para HE/recargos. |
| UBICACION | `OT` o `CC`. |
| NOVEDAD | `codigo_salida_snapshot`; el concepto interno nunca se expone como etiqueta editable. |
| CANT. HORAS | Horas normalizadas; para unidad dias usa horas pactadas del dia. |
| OBSERVACIONES | Novedad o anotacion del plan. |
| RESPONSABLE | Usuario autenticado que guarda el borrador. |
| ENCARGADOS | Area contractual ERP. |
| CLIENTE | Cliente ERP de la OT; vacio para CC sin cliente. |
| ESTADO | Columna adicional visible y filtrable en la aplicacion. |
| ORIGEN | `ARCHIVO` o `PLANIFICADOR`; solo visible en la aplicacion. |

Las filas legacy activas se proyectan con su `estado_planilla` (`CONFIRMADO` por defecto), `ORIGEN = ARCHIVO` y valores vacios en columnas que no fueron conservadas por el extractor historico. Consulta y exportacion excluyen siempre `activo_planilla = false`; las versiones inactivas solo aparecen en historial. No se intenta deduplicarlas fila a fila contra datos automaticos porque carecen de fecha y referencia.

## 5.1 Parametrizacion De Codigos

Los conceptos internos nuevos son constantes (`SALARIO`, `HED`, `HEN`, `HF`, `HEFD`, `HEFN`, `RN`, `RF`, `CMP`, `VAC`, `INC`, `LIC`, `REM`, `AUS`, `PNR`, `SAN`, `RETIRO`, `ARL`, `DEV_TARDANZA`). La salida usa `nomina_planilla_regional_codigo`, versionada por vigencia. Los conceptos históricos `RET` (retardo) y `DXT` (descanso por tratamiento) permanecen sin cambios y nunca se convierten implícitamente.

| Campo visible de configuracion | Valor inicial |
|---|---|
| Codigo de salario | `SALARIO` |
| Codigo de hora extra diurna | `HED` |
| Codigo de hora extra nocturna | `HEN` |
| Codigo de hora festiva | `HF` |
| Codigo de hora extra festiva diurna | `HEFD` |
| Codigo de hora extra festiva nocturna | `HEFN` |
| Codigo de recargo nocturno | `RN` |
| Codigo de recargo festivo | `RF` |
| Codigo de compensatorio | `CMP` |

Las novedades mantienen inicialmente su código interno como salida, excepto `RETIRO -> RET` y `DEV_TARDANZA -> DXT`. Junto con `ARL` se registran en días crudos, sin distribuir por OT y atribuidas al CC contractual; el sistema de nómina destino aplica su liquidación legal.

La migración no actualiza ni renombra `RET`/`DXT`. Inserta `RETIRO` y `DEV_TARDANZA` como conceptos nuevos de unidad `DIAS`; el seed adopta ambas definiciones para instalaciones nuevas. Antes y después se verifica que eventos históricos con `RET`/`DXT` conserven categoría, unidad y descripción. Planilla Regional no usa `factor_hora_ordinaria` para liquidarlos ni calcula efectos legales.

La pantalla de configuracion presenta los codigos junto a `Inicio jornada nocturna` y `Fin jornada nocturna`. Cambiar un codigo cierra la vigencia anterior y crea otra; solo afecta nuevas salidas. Cada fila guarda `concepto_interno`, `codigo_salida_snapshot`, divisor legal aplicado y vigencias usadas, por lo que no reinterpreta historicos.

## 6. Generacion Y Prorrateo

1. Resolver empleados y datos contractuales ERP en lote, fuera de la transaccion PostgreSQL; prohibido N+1.
2. Segmentar en medianoche y calcular la fecha real de cada tramo antes de resolver activación, quincena, vigencia o concepto.
3. Validar jornada y distribucion OT/CC antes de persistir.
4. Generar `SALARIO` si existe jornada y no hay novedad de reemplazo.
5. Generar conceptos de HE/recargo usando un clasificador diario unico compartido por borrador, precalculo y confirmacion: `HED`, `HEN`, `HF`, `HEFD`, `HEFN`, `RN`, `RF`.
6. Mantener novedades de ausencia/compensacion con su unidad correspondiente.
7. Convertir porcentajes existentes a horas con `horas_pactadas * porcentaje / 100`, validarlos y prorratear `cantidad`/`cantidad_horas`; salario y base hora se repiten como snapshots.
8. Redondear a cuatro decimales con `ROUND_HALF_UP` y aplicar el residuo a la ultima asignacion ordenada por `(ubicacion, ot_cc, sub_subc)`.
9. Si no hay OT, crear una distribucion unica al CC contractual.
10. Usar advisory lock por empleado/semana, savepoint por empleado y upsert PostgreSQL para evitar versiones concurrentes.
11. Upsert de identidad BORRADOR sin cambiar ITEM; archivar identidades que desaparecieron.
12. Si existe una version oficial, crear correccion BORRADOR con nuevo ITEM. Al confirmarla, la anterior pasa a `REEMPLAZADO` y queda almacenada para auditoria.

`guardar_borrador_plan`, `confirmar_plan` y los workflows de pago/compensación/anulación se refactorizan para que el orquestador exterior sea el único propietario de `commit`/`rollback`. Todos sus callees, incluido costos OT, quedan libres de commits profundos; los hooks solo usan `flush` y savepoints.

La obtención de ITEM y el alta ocurren en una transacción. Ante `IntegrityError`, el código sale y revierte el savepoint fallido antes de releer la versión ganadora bajo lock; nunca continúa sobre una transacción abortada.

Si salario, contrato activo o centro de costo de respaldo no pueden resolverse, el empleado queda en error y no genera filas incompletas.

## 7. Estados

| Evento | Estado resultante |
|---|---|
| Guardar horario | `BORRADOR` |
| Ejecutar precalculo | Conserva `BORRADOR`; el precalculo sigue sin persistir estado. |
| Confirmar calculo | `CONFIRMADO` |
| Workflow de pago | `PAGADO` |
| Compensacion | `COMPENSADO` |
| Anulacion | `ANULADO` |
| Cambio de identidad | anterior `ARCHIVADO`, nueva fila en estado correspondiente |
| Correccion de oficial | nueva `BORRADOR`; al confirmar, anterior `REEMPLAZADO` |

La confirmacion actualiza `calculo_id`, estado y reemplazos dentro del mismo savepoint que crea `nomina_calculo_semanal`. Los servicios de workflow `PAGADO`, `COMPENSADO` y `ANULADO` actualizan las filas relacionadas en la misma transaccion. Una falla revierte calculo y Planilla Regional conjuntamente.

## 8. API

### Consulta combinada

```http
POST /api/v2/novedades-nomina/planillas-regionales/{quincena}/consultar
```

El body tipado contiene período, cursor, orden, búsqueda y filtros por las 22 columnas; `quincena` existe solo en el path. La cédula cruda no viaja en URL.

La respuesta de consulta incluye filas, total, cursores, resumen y advertencias, nunca facetas. `POST /planillas-regionales/{quincena}/faceta` calcula únicamente la faceta activa después de alcance y filtros base. Éxitos y errores usan `Cache-Control: no-store, private`.

### Exportacion oficial

```http
POST /api/v2/novedades-nomina/planillas-regionales/{quincena}/exportar
```

- Formato XLSX.
- Allowlist exacta: `CONFIRMADO`, `PAGADO`, `COMPENSADO`. Excluye `BORRADOR`, `ANULADO`, `ARCHIVADO` y `REEMPLAZADO`.
- Respeta filtros del usuario.
- Conserva exactamente las 20 columnas originales.
- Registra auditoria de exportacion sin payload ni PII en logs.
- Neutraliza formulas XLSX, limita filas, aplica rate limit y genera el archivo en memoria con limpieza garantizada.
- Incluye `Cache-Control: no-store, private` y `X-Content-Type-Options: nosniff`.

### Contrato Tipado De Consulta

El contrato completo de proyección, filtros por las 22 columnas, faceta remota, orden estable, paginación, carreras y accesibilidad está en `docs/specs/2026-07-16_planilla-regional-consulta-tabla.md`.

Consulta y exportación comparten el mismo objeto `filtros`; exportación omite paginación/faceta, devuelve `Content-Disposition` y limita a 50.000 filas. La consulta normal no calcula facetas: el cliente solicita únicamente la faceta activa.

### Configuracion

```http
GET  /api/v2/novedades-nomina/planillas-regionales/configuracion
POST /api/v2/novedades-nomina/planillas-regionales/configuracion/codigos
POST /api/v2/novedades-nomina/planillas-regionales/configuracion/activar
```

La activacion exige fecha futura 1/16, es de una sola ejecucion y queda auditada. Los codigos se crean por nueva vigencia; no se actualizan en sitio.

## 9. RBAC Y Seguridad

Registrar en el manifiesto:

- `nomina_horas_extras.planilla_regional.consultar`.
- `nomina_horas_extras.planilla_regional.exportar`.
- `nomina_horas_extras.planilla_regional.salario.consultar`.
- `nomina_horas_extras.planilla_regional.cargar`.
- `nomina_horas_extras.planilla_regional.configurar`.
- `nomina_novedades.tabla_maestra.generar`.
- `nomina_novedades.exportar_solid`.

Las rutas nuevas y ramas category-aware de Planilla Regional exigen autenticación y `nomina_novedades`. Consulta requiere `consultar`; carga `consultar + cargar`; exportación `consultar + exportar + salario.consultar`. El alcance se materializa antes de unión, búsqueda, facetas, resumen, paginación y exportación; `set()` devuelve cero y solo `None` representa bypass admin. El hardening global de categorías ajenas es prerrequisito separado y no se mezcla en este diff.

El adaptador ERP usa `ERP_PLANILLA_DATABASE_URL`, engine y sesión exclusivos, transacción `READ ONLY`, TLS, timeout y SELECT allowlisted. `PlanillaRegionalSettings` es el SSOT aislado de la funcionalidad, sin instanciar configuraciones globales ni fallback. Producción verifica usuario y privilegios. No se cachean salarios fuera del request ni se guardan datos de nómina en el navegador.

La auditoría dedicada registra un DTO allowlisted con actor, acción, `estado_evento`, cantidad, permisos, correlation ID, `kid` y HMAC-SHA256. El middleware genérico excluye estas rutas y no captura bodies. No registra PII/XLSX. Exportación, carga, configuración y denegaciones fallan cerrado; consultas de solo lectura emiten alerta sin PII.

Cuando operan sobre subcategorías Planilla Regional, los endpoints legacy `datos`, `preview`, archivos, historial y resumen aplican autenticación, RBAC, alcance, `no-store` y errores saneados. Tabla Maestra/Solid usan permisos dedicados. Categorías ajenas conservan contrato durante este diff y su hardening global es prerrequisito separado.

Matriz obligatoria para solicitudes cuya categoria/subcategoria sea Planilla Regional:

| Metodo y ruta | Permisos require-all | Alcance y tratamiento |
|---|---|---|
| `GET planillas_regionales_1q|2q/datos` | `consultar` | Alcance previo; sin permiso salario devuelve ambas claves en `null`. |
| `POST planillas_regionales_1q|2q/preview` | `consultar + cargar + salario.consultar` | Valida alcance; preview no persiste ni archiva. |
| `POST /archivos` | `consultar + cargar + salario.consultar` | Solo admite categoría/subcategoría autorizada y límites de archivo. |
| `POST /archivos/{id}/procesar` | `consultar + cargar + salario.consultar` | Resuelve primero categoría del archivo y luego autoriza. |
| `GET /archivos/{id}/preview` | `consultar + cargar + salario.consultar + rol admin` | El original no es segmentable; no se entrega a gestores parciales. |
| `GET /archivos/{id}/descargar` | `consultar + cargar + salario.consultar + rol admin` | Descarga original completa, auditada y `no-store`. |
| `GET /subcategorias/{subcat}` | `consultar` | Alcance antes de filas, totales y paginacion. |
| `GET /subcategorias/resumen` | `consultar` | Solo agrega cédulas autorizadas y omite totales monetarios sin permiso salarial. |
| `GET /historial` | `consultar` | Alcance previo; versiones inactivas solo para usuarios autorizados. |
| `POST /exportar-solid` | `nomina_novedades + nomina_novedades.exportar_solid` | Alcance y auditoría antes de generar salida mensual. |
| `GET /tabla-maestra/validar` | permiso base | Solo disponibilidad, sin PII ni valores. |
| `GET /tabla-maestra/generar` | `nomina_novedades + nomina_novedades.tabla_maestra.generar` | Alcance antes de filas y agregados. |
| `POST planillas-regionales/{q}/consultar` | `consultar` | Alcance previo; salario/base hora presentes en `null` sin permiso. |
| `POST planillas-regionales/{q}/exportar` | `consultar + exportar + salario.consultar` | Alcance previo y Excel oficial. |
| `GET/POST planillas-regionales/configuracion/*` | `configurar` | Solo administradores funcionales; auditoria append-only. |

En rutas compartidas, la rama Planilla exige permiso base/específicos después de derivar subcategoría desde allowlist canónica; las demás ramas no cambian. Nunca se confía en categoría enviada por cliente. La activación queda bloqueada hasta cerrar el hardening global separado o demostrar que ninguna ruta compartida permite eludir esta rama.

`PLANILLA_AUDIT_HMAC_KID` selecciona una clave de mínimo 32 bytes en el gestor externo de secretos. El keyring de verificación conserva claves retiradas por `kid` durante la retención de auditoría; ninguna reutiliza JWT ni se almacena en PostgreSQL, repr o logs. Producción falla cerrado si firma o keyring son inválidos.

Límites, mounts, cuarentena, worker aislado, antimalware, cuotas independientes por usuario/IP, 404 uniforme, eventos de auditoría y rollout RBAC se definen de forma normativa en `docs/specs/2026-07-16_planilla-regional-seguridad-operativa.md`.

## 10. Interfaz

- Reutilizar las rutas actuales de 1Q y 2Q.
- Extraer una vista compartida `PlanillaRegionalView` para evitar duplicacion.
- Conservar carga manual en un panel secundario identificado como origen `ARCHIVO`.
- Tabla principal con 22 columnas en pantalla y filtros remotos multivalor tipo Excel.
- Orden UI exacto: ITEM, CEDULA, EMPLEADO, SALARIO, BASE HORA, APLICA HE, EMPRESA, SUCURSAL, FECHA, OT/CC, SUB./SUBC., ESPECIALIDAD OT, CANTIDAD, UBICACION, NOVEDAD, CANT. HORAS, OBSERVACIONES, RESPONSABLE, ENCARGADOS, CLIENTE, ESTADO, ORIGEN.
- Columnas `CEDULA` y `EMPLEADO` fijadas; scroll horizontal para el resto.
- Paginacion remota para limitar el render; exportacion siempre desde backend.
- Estados de carga, error, vacio inicial y vacio por filtros.
- Mostrar `ESTADO` y `ORIGEN` como badges, aunque `ORIGEN` puede permanecer fuera del orden contractual del Excel.
- En movil se priorizan ITEM, CEDULA, EMPLEADO, FECHA, NOVEDAD, HORAS y ESTADO; las demas quedan disponibles por scroll/selector de columnas.
- CEDULA/EMPLEADO son sticky desde `md`; en movil no son sticky para no consumir el viewport.
- `SALARIO` y `BASE HORA` siempre existen en el DTO; valen `null` y muestran `Restringido` sin permiso.

Estructura frontend prevista:

- `PlanillaRegional/types.ts`.
- `PlanillaRegional/columns.tsx`.
- `PlanillaRegional/hooks/usePlanillaRegional.ts`.
- `frontend/src/services/planillaRegionalService.ts`.
- `PlanillaRegional/components/PlanillaRegionalTable.tsx`.
- `PlanillaRegional/components/PlanillaRegionalToolbar.tsx`.
- `PlanillaRegional/components/PlanillaRegionalResumen.tsx`.
- `PlanillaRegional/components/PlanillaRegionalLegacyPanel.tsx`.
- `PlanillaRegional/PlanillaRegionalView.tsx`.

Los wrappers 1Q/2Q solo pasan `quincena`. Los endpoints se registran en `config/api.ts`. Se reutilizan `FilterDropdown`, `Button`, `Input`, `Select`, `Badge`, `MaterialCard`, `Callout` y `Skeleton/Spinner`, sin copiar HTML/colores legacy.

Ruta y tarjeta exigen permiso base más `consultar`; carga añade `cargar`, salario añade `salario.consultar` y exportación exige los tres permisos específicos. Filas, facetas y exportación usan controladores de solicitud independientes. Cada faceta devuelve `valores`, `total` y `truncada`, autoexcluye su filtro y conserva seleccionados fuera del primer lote.

## 11. Convivencia Con Legacy

- No se modifican ni eliminan archivos historicos.
- No se reconstruyen periodos anteriores a la activacion.
- La consulta combina `ARCHIVO` y `PLANIFICADOR`, pero no intenta deduplicar historicos que perdieron fecha/OT.
- Una proyección combinada única alimenta consulta regional, Tabla Maestra y `exportar-solid`, excluyendo versiones inactivas.
- Se bloquean cargas manuales que se solapen con la fecha de activacion automatica.
- La recarga de periodos legacy conserva ITEM mediante su clave agregada.

## 12. Criterios De Aceptacion

1. Guardar un borrador genera filas visibles en la quincena correspondiente.
2. Repetir el mismo guardado conserva ITEM.
3. Cambiar novedad u OT archiva el ITEM anterior y crea uno nuevo.
4. Una ausencia de reemplazo no genera SALARIO.
5. Varias OT cuadradas conservan el total exacto tras prorrateo.
6. Una distribucion descuadrada bloquea el empleado.
7. Sin OT se utiliza el CC contractual ERP.
8. Salario/base hora usan ERP y divisor legal, nunca valores estimados.
9. La consulta respeta alcance y permisos.
10. El Excel rechaza borradores y exporta solo filas oficiales.
11. Las cargas legacy continúan funcionando sin borrar filas automaticas.
12. 1Q y 2Q se resuelven automaticamente por fecha.
13. Cantidad u observacion cambian sin alterar ITEM; novedad u OT crean nueva version.
14. Ninguna fecha anterior a activacion genera fila automatica.
15. Las filas legacy se proyectan como confirmadas y con campos faltantes vacios.
16. Consulta, facetas, resumen y exportacion no filtran datos fuera del alcance autorizado.
17. Los codigos parametrizados aparecen en nuevas filas y los historicos conservan su snapshot.
18. El XLSX contiene 20 columnas, neutraliza formulas y solo usa la allowlist oficial.
19. Cambiar despues salario/empresa/ciudad/area/CC en ERP, metadata OT, divisor o codigo configurado no altera ningun snapshot historico.
20. Los hooks `*_sin_commit` no confirman transacciones y una falla revierte conjuntamente horario, calculo y planilla.
21. Eventos históricos `RET`/`DXT` conservan su semántica y los conceptos nuevos usan esos valores solo como códigos de salida.
22. Tabla Maestra y `exportar-solid` consumen automático y legacy activo sin incluir versiones archivadas.

### 12.1 Trazabilidad CA A Pruebas

En la columna comando, `B` equivale a `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest`.

| CA | Archivo y test | Comando focal |
|---|---|---|
| CA_01 | `test_planilla_regional_persistencia.py::test_ca_01_guardar_borrador_genera_filas_visibles` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_01_guardar_borrador_genera_filas_visibles -q` |
| CA_02 | `test_planilla_regional_persistencia.py::test_ca_02_replay_conserva_item` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_02_replay_conserva_item -q` |
| CA_03 | `test_planilla_regional_persistencia.py::test_ca_03_cambio_identidad_archiva_y_crea_item` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_03_cambio_identidad_archiva_y_crea_item -q` |
| CA_04 | `test_planilla_regional_dominio.py::test_ca_04_ausencias_reemplazan_salario` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_04_ausencias_reemplazan_salario -q` |
| CA_05 | `test_planilla_regional_dominio.py::test_ca_05_prorrateo_conserva_total` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_05_prorrateo_conserva_total -q` |
| CA_06 | `test_planilla_regional_dominio.py::test_ca_06_descuadre_bloquea_empleado` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_06_descuadre_bloquea_empleado -q` |
| CA_07 | `test_planilla_regional_erp.py::test_ca_07_sin_ot_usa_cc_contractual` | `B testing/backend/test_planilla_regional_erp.py::test_ca_07_sin_ot_usa_cc_contractual -q` |
| CA_08 | `test_planilla_regional_erp.py::test_ca_08_salario_y_base_hora_desde_fuentes` | `B testing/backend/test_planilla_regional_erp.py::test_ca_08_salario_y_base_hora_desde_fuentes -q` |
| CA_09 | `test_planilla_regional_http_security.py::test_ca_09_consulta_aplica_alcance_y_permisos` | `B testing/backend/test_planilla_regional_http_security.py::test_ca_09_consulta_aplica_alcance_y_permisos -q` |
| CA_10 | `test_planilla_regional_exportacion.py::test_ca_10_exporta_solo_estados_oficiales` | `B testing/backend/test_planilla_regional_exportacion.py::test_ca_10_exporta_solo_estados_oficiales -q` |
| CA_11 | `test_planilla_regional_legacy.py::test_ca_11_legacy_no_borra_automaticas` | `B testing/backend/test_planilla_regional_legacy.py::test_ca_11_legacy_no_borra_automaticas -q` |
| CA_12 | `test_planilla_regional_dominio.py::test_ca_12_fecha_resuelve_quincena` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_12_fecha_resuelve_quincena -q` |
| CA_13 | `test_planilla_regional_persistencia.py::test_ca_13_cambio_no_identitario_conserva_item` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_13_cambio_no_identitario_conserva_item -q` |
| CA_14 | `test_planilla_regional_legacy.py::test_ca_14_antes_activacion_no_genera` | `B testing/backend/test_planilla_regional_legacy.py::test_ca_14_antes_activacion_no_genera -q` |
| CA_15 | `test_planilla_regional_legacy.py::test_ca_15_proyeccion_legacy_campos_faltantes` | `B testing/backend/test_planilla_regional_legacy.py::test_ca_15_proyeccion_legacy_campos_faltantes -q` |
| CA_16 | `test_planilla_regional_http_security.py::test_ca_16_agregados_y_exportacion_sin_fugas` | `B testing/backend/test_planilla_regional_http_security.py::test_ca_16_agregados_y_exportacion_sin_fugas -q` |
| CA_17 | `test_planilla_regional_dominio.py::test_ca_17_codigo_versionado_conserva_snapshot` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_17_codigo_versionado_conserva_snapshot -q` |
| CA_18 | `test_planilla_regional_exportacion.py::test_ca_18_xlsx_columnas_formulas_y_allowlist` | `B testing/backend/test_planilla_regional_exportacion.py::test_ca_18_xlsx_columnas_formulas_y_allowlist -q` |
| CA_19 | `test_planilla_regional_erp.py::test_ca_19_snapshots_inmutables_tras_cambio_fuentes` | `B testing/backend/test_planilla_regional_erp.py::test_ca_19_snapshots_inmutables_tras_cambio_fuentes -q` |
| CA_20 | `test_planilla_regional_persistencia.py::test_ca_20_hooks_sin_commit_y_rollback_conjunto` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_20_hooks_sin_commit_y_rollback_conjunto -q` |
| CA_21 | `test_planilla_regional_migracion.py::test_ca_21_ret_dxt_historicos_conservan_semantica` | `B testing/backend/test_planilla_regional_migracion.py::test_ca_21_ret_dxt_historicos_conservan_semantica -q` |
| CA_22 | `test_planilla_regional_tabla_maestra.py::test_ca_22_proyeccion_combinada_alimenta_consolidado` | `B testing/backend/test_planilla_regional_tabla_maestra.py::test_ca_22_proyeccion_combinada_alimenta_consolidado -q` |

La suite `testing/backend/test_planilla_regional_erp.py` añade `test_erp_dsn_dedicada_es_distinta`, `test_erp_transaccion_read_only`, `test_erp_timeout_aplicado`, `test_erp_queries_allowlist`, `test_erp_resuelve_lote_sin_n_plus_one`, `test_erp_cierra_recursos_en_exito` y `test_erp_cierra_recursos_en_error`. Su comando es `B testing/backend/test_planilla_regional_erp.py -q`.

`testing/backend/test_planilla_regional_migracion.py` prueba que la migración agrega `RETIRO`/`DEV_TARDANZA` sin mutar `RET`/`DXT` ni sus eventos. CA_04 parametriza los conceptos nuevos; `test_devuelto_tardanza_genera_una_fila_dias_en_cc_contractual` verifica que varias OT no lo distribuyan. CA_17 cubre que cambiar el código de salida no reescriba históricos.

## 13. Fuera De Alcance

- Escribir datos en el ERP.
- Recalcular cargas historicas.
- Eliminar el cargador Excel legacy.
- Activar biometria como fuente obligatoria en esta entrega.
- Aplicaciones moviles.
