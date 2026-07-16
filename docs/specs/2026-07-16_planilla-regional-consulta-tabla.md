# Contrato de Consulta y Tabla - Planilla Regional

**Fecha:** 2026-07-16
**Estado:** Aprobado contractualmente
**Especificación principal:** `docs/specs/2026-07-15_planilla-regional-automatica.md`

## 1. Proyección Canónica

La consulta detallada conserva una fila por ITEM. Tabla Maestra y `exportar-solid` usan una proyección agregada distinta para mantener el contrato legacy.

### 1.1 Detalle de pantalla y XLSX oficial

- Legacy activo se proyecta con ITEM, origen `ARCHIVO`, estado `CONFIRMADO` y campos faltantes vacíos.
- Automático activo conserva fecha, OT/CC, snapshots, estado y origen `PLANIFICADOR`.
- Legacy inactivo y automático archivado/reemplazado/anulado quedan fuera de la relación activa.

### 1.2 Tabla Maestra

Las filas automáticas se agrupan por:

```text
cedula + empleado + empresa + quincena + codigo_salida_snapshot
```

Mapeo exacto:

| Campo Tabla Maestra | Automático |
|---|---|
| `CEDULA` | cédula canónica |
| `NOMBRE` | snapshot de empleado |
| `EMPRESA` | snapshot de empresa |
| `VALOR QUINCENAL` | `0.00`; Planilla Regional reporta tiempo, no liquida dinero |
| `HORAS` | suma `cantidad_horas` |
| `DIAS` | suma `cantidad` solo para conceptos cuya unidad sea días; en los demás, `0` |
| `CONCEPTO` | `"1Q "` o `"2Q "` más `codigo_salida_snapshot` |

Disponibilidad considera Planilla Regional presente cuando existe al menos una fila oficial activa (`CONFIRMADO|PAGADO|COMPENSADO`) del período. BORRADOR no satisface disponibilidad.

### 1.3 `exportar-solid`

Mantiene el shape actual por subcategoría:

```json
{
  "cedula": "string",
  "nombre": "string",
  "valor": 0.0,
  "empresa": "string",
  "concepto": "1Q CODIGO",
  "fecha": "YYYY-MM-DD"
}
```

Para automático se emite una fila diaria por ITEM oficial activo; `valor` es número JSON igual a cero, `concepto` usa código snapshot y `fecha` es la fecha efectiva, no la fecha de creación. Las claves exteriores son exactamente `PLANILLAS REGIONALES 1Q` y `PLANILLAS REGIONALES 2Q`; la API traduce `1Q|2Q` a la convención interna `Q1|Q2` solo en el borde. Legacy conserva su contrato actual.

La respuesta mensual completa es `{mes, año, payload_por_subcategoria, no_clasificado, total_registros}`. `payload_por_subcategoria` solo admite subcategorías de la allowlist persistida y cada lista se ordena por cédula, fecha e ITEM. `no_clasificado` es `{total, items}` y cada item solo contiene `registro_id` opaco, `origen` y `codigo_error`; nunca serializa modelos ORM, payloads, nombres, cédulas o valores.

## 2. Autorización de Tabla Maestra

- `GET /tabla-maestra/validar`: autenticación + `nomina_novedades`; devuelve solo disponibilidad, sin PII ni valores.
- `GET /tabla-maestra/generar`: `nomina_novedades + nomina_novedades.tabla_maestra.generar`; aplica alcance antes de filas y agregados.
- `POST /exportar-solid`: `nomina_novedades + nomina_novedades.exportar_solid`; aplica alcance y auditoría crítica.
- Los dos permisos críticos se registran en RBAC y se asignan inicialmente solo a admin.
- Antes de activar enforcement se aprueba una matriz explícita de roles/usuarios actuales; no existe concesión automática por poseer `nomina_novedades`.

Las respuestas usan `no-store`. Recurso inexistente y recurso fuera de alcance producen el mismo 404 saneado cuando existe identificador. Ningún error devuelve `str(e)`.

En `POST /archivos`, la subcategoría es obligatoria y se resuelve contra una allowlist canónica que determina la categoría; una categoría enviada que no coincida se rechaza. Procesar/preview/descargar deriva permisos desde la subcategoría persistida del archivo. Historial y resumen exigen subcategoría explícita; la consulta global multiclase queda reservada a un permiso administrativo dedicado y fuera de esta entrega.

Cliente genera UUIDv4 `solicitud_id` y lo envía como `Idempotency-Key` en preview. `POST /archivos/manifiestos/preview` persiste manifest durable y devuelve `manifest_id`/digest sin escribir normalizados. Confirmación recibe `{digest,modo}`; solicitud se toma del manifest. Fija subcategoría/año/mes y hasta cinco archivos. Reemplazo completo usa lock/transacción única. Reusar solicitud con digest distinto produce 409.

`POST /archivos/{id}/procesar` queda como compatibilidad PARCIAL por archivo y jamás archiva ausentes; responde 409 si intenta reemplazo completo. Preview/proceso individual no puede confirmar un manifiesto multifile.

## 3. Filtros Tipados

`quincena` existe únicamente en el path (`1Q|2Q`) y nunca en el body. Consulta usa `POST /planillas-regionales/{quincena}/consultar`; faceta usa `POST /planillas-regionales/{quincena}/faceta`.

Body canónico de consulta:

```json
{
  "mes": 7,
  "anio": 2026,
  "limit": 100,
  "cursor": null,
  "orden": "fecha",
  "direccion": "asc",
  "busqueda": "texto",
  "filtros": {
    "item": {"desde": "1", "hasta": "1000"},
    "cedula": {"valor": "123", "modo": "PREFIJO"},
    "empleado": {"valor": "ANA", "modo": "CONTIENE"},
    "salario": {"desde": "1000000.00", "hasta": "3000000.00"},
    "base_hora": {"desde": "5000.000000", "hasta": "20000.000000"},
    "aplica_he": [true, "__VACIO__"],
    "empresas": ["EMPRESA A"],
    "sucursales": ["BOGOTA"],
    "fecha": {"desde": "2026-07-01", "hasta": "2026-07-15"},
    "ot_cc": ["OT-1"],
    "sub_subc": ["001"],
    "especialidades_ot": ["TECNICA"],
    "cantidad": {"desde": "0.0000", "hasta": "15.0000"},
    "ubicaciones": ["OT"],
    "novedades": ["HED"],
    "cantidad_horas": {"desde": "0.0000", "hasta": "120.0000"},
    "observaciones": {"valor": "turno", "modo": "CONTIENE"},
    "responsable": {"valor": "GESTOR", "modo": "CONTIENE"},
    "encargados": ["OPERACIONES"],
    "clientes": ["CLIENTE A"],
    "estados": ["CONFIRMADO"],
    "origenes": ["PLANIFICADOR"]
  }
}
```

Rangos son inclusivos. Decimal siempre viaja como string sin notación científica; fecha usa ISO; booleano usa JSON boolean; modos de texto son `EXACTO|PREFIJO|CONTIENE`. Listas vacías y objetos nulos equivalen a filtro ausente. `__VACIO__` solo es válido dentro de listas multivalor. Campos desconocidos, strings vacíos no normalizables o rango invertido producen 422.

`orden` admite exactamente `item|cedula|empleado|salario|base_hora|aplica_he|empresa|sucursal|fecha|ot_cc|sub_subc|especialidad_ot|cantidad|ubicacion|novedad|cantidad_horas|responsable|encargados|cliente|estado|origen`.

Cada `PlanillaRegionalFilaRead` contiene siempre las 22 claves: `item:string` decimal BIGINT, `cedula:string`, `empleado:string|null`, `salario:string|null`, `base_hora:string|null`, `aplica_he:boolean|null`, `empresa:string|null`, `sucursal:string|null`, `fecha:string|null`, `ot_cc:string|null`, `sub_subc:string|null`, `especialidad_ot:string|null`, `cantidad:string|null`, `ubicacion:"OT"|"CC"|null`, `novedad:string|null`, `cantidad_horas:string|null`, `observaciones:string|null`, `responsable:string|null`, `encargados:string|null`, `cliente:string|null`, `estado:EstadoPlanilla`, `origen:"ARCHIVO"|"PLANIFICADOR"`. Legacy faltante y salario restringido usan `null`, nunca omisión.

`resumen` cubre universo filtrado antes de paginar: `{filas:number,empleados:number,horas:string,dias:string}`. Null suma cero; horas/días Decimal cuatro posiciones `ROUND_HALF_UP`. Advertencias se emiten una vez por código, ordenadas: `LEGACY_INCOMPLETO`, `SALARIO_RESTRINGIDO`, `SNAPSHOT_CONSERVADO`; nunca incluyen PII.

Exportación recibe exactamente `{mes,anio,orden,direccion,busqueda,filtros}`; no acepta `limit`, cursor ni faceta. Éxito: 200, media type XLSX, `Content-Disposition` con `filename*` RFC 5987 y fallback ASCII. Más de 50.000 filas: 422 `{codigo:"LIMITE_EXPORTACION",limite:50000}` sin blob parcial. Errores siempre JSON saneado; frontend valida media type antes de crear URL.

| Columna | Filtro | Faceta | Orden | Permiso adicional |
|---|---|---|---|---|
| ITEM | exacto/rango BIGINT decimal string | no | sí | no |
| CÉDULA | texto exacto o prefijo | no | sí | alcance previo |
| EMPLEADO | texto | no | sí | alcance previo |
| SALARIO | rango Decimal | no | sí | salario.consultar |
| BASE HORA | rango Decimal | no | sí | salario.consultar |
| APLICA HE | multivalor `true|false|__VACIO__` | sí | sí | no |
| EMPRESA | multivalor | sí | sí | no |
| SUCURSAL | multivalor | sí | sí | no |
| FECHA | rango de fecha | no | sí | no |
| OT/CC | multivalor con búsqueda | sí | sí | no |
| SUB./SUBC. | multivalor con búsqueda | sí | sí | no |
| ESPECIALIDAD OT | multivalor | sí | sí | no |
| CANTIDAD | rango Decimal | no | sí | no |
| UBICACIÓN | multivalor | sí | sí | no |
| NOVEDAD | multivalor | sí | sí | no |
| CANT. HORAS | rango Decimal | no | sí | no |
| OBSERVACIONES | texto | no | no | no |
| RESPONSABLE | texto | no | sí | alcance previo |
| ENCARGADOS | multivalor | sí | sí | no |
| CLIENTE | multivalor con búsqueda | sí | sí | no |
| ESTADO | multivalor | sí | sí | no |
| ORIGEN | multivalor | sí | sí | no |

Cada lista multivalor admite máximo 50 valores. Búsqueda global excluye salario y base hora; solo opera sobre ITEM, cédula, empleado, empresa, sucursal, OT/CC, novedad y cliente después de aplicar alcance.

Usuarios sin `salario.consultar` reciben 403 si intentan filtrar u ordenar por salario/base hora. Esos campos no generan facetas, conteos ni diferencias observables.

## 4. Faceta Remota

La consulta devuelve `{filas,total,limit,cursor_siguiente,cursor_anterior,resumen,advertencias}` y nunca incluye facetas. La UI solicita solo una faceta activa al endpoint `/faceta`; body exacto: `{mes,anio,busqueda,filtros,faceta}`. `busqueda` y `filtros` son idénticos a consulta; no acepta cursor ni orden. `faceta` contiene:

```json
{
  "faceta": {
    "campo": "empresa",
    "busqueda": "texto opcional",
    "seleccionados": ["valor ya seleccionado"],
    "limit": 50
  }
}
```

Respuesta única:

```json
{
  "campo": "empresa",
  "valores": [{"valor": "X", "conteo": 10, "seleccionado": false}],
  "total": 135,
  "truncada": true
}
```

Reglas:

- Alcance se aplica primero.
- Se aplican todos los filtros excepto el de la propia columna.
- `seleccionados` se normaliza/deduplica conservando orden y admite máximo 50. La respuesta los incluye primero y completa candidatos hasta un total máximo de 50 valores.
- La UI ofrece `Seleccionar visibles`, nunca `Seleccionar todos`; solo agrega valores hasta completar 50 y deshabilita selección adicional mostrando `50 de 50 seleccionados`.
- Valores vacíos se representan con token tipado `__VACIO__`, no se confunden con ausencia de filtro.
- Facetas de alta cardinalidad requieren al menos dos caracteres y debounce de 300 ms.
- Búsqueda global usa debounce 300 ms desde dos caracteres; Enter envía de inmediato y texto menor se limpia sin request.
- `total` representa cantidad de valores únicos después de alcance/búsqueda/filtros y antes de `limit`; `conteo` representa filas. Orden: seleccionado, conteo descendente, valor con collation `C` ascendente.
- Para faceta booleana, `valor` es JSON boolean; para texto usa string y para vacío `__VACIO__`. `seleccionados` usa el mismo tipo del campo y no mezcla tipos.
- Búsqueda menor a dos caracteres devuelve 422 para alta cardinalidad; cero resultados devuelve `valores=[]`, `total=0`, `truncada=false`.

## 5. Orden y Paginación

- La primera página fija `item_corte=max(item)` y `revision_corte=max(actualizado_en)` después del alcance. Cursor firma actor interno, digest de alcance/permisos, período, quincena, límite, búsqueda, filtros, corte, orden, dirección, `sentido:SIGUIENTE|ANTERIOR`, último valor e ITEM; usa clave dedicada, comparación constante, TTL 15 min y `kid` rotatable.
- `limit` está entre 1 y 100; no se acumulan páginas en memoria.
- Orden por defecto: `fecha asc, ITEM asc`. Toda orden añade ITEM en la misma dirección. Texto usa NFC/uppercase y collation `C`; `NULLS LAST` en ambas direcciones. Decimal/fecha/boolean usan comparación nativa y `NULLS LAST`.
- Cambiar búsqueda, filtros, orden, dirección o límite descarta cursores y vuelve al inicio.
- Cursor manipulado produce 400; expirado, 400 `CURSOR_EXPIRADO`. Firma válida con actor/alcance/permisos cambiados produce 409 `CONTEXTO_CAMBIO`; UI refresca `/auth/yo`, reinicia una vez si conserva capacidad y falla cerrado si fue revocada. Cambio de fila produce 409 `CONSULTA_CAMBIO`. Cursor ANTERIOR aplica comparación inversa y revierte filas antes de responder para conservar orden visual.
- Pruebas insertan y actualizan filas entre páginas: inserciones posteriores se excluyen; actualización produce 409, nunca duplicado/omisión silenciosa.

## 6. Carreras y Estados Asíncronos

Filas, facetas y exportación tienen AbortController, secuencia monotónica y estado independiente. La faceta guarda hash de período+búsqueda+filtros; cambiar cualquiera cancela/invalida su respuesta aunque el popover siga abierto. Solo la secuencia/contexto vigente actualiza estado o `finally`; desmontar cancela todo.

Estados obligatorios:

- skeleton inicial con dimensiones estables;
- refresco/paginación conservando filas y `aria-busy`;
- loading/error local en faceta;
- exportación independiente con doble clic bloqueado;
- error general con reintento;
- vacío inicial y vacío filtrado con `Limpiar filtros`.

## 7. Accesibilidad y Responsive

`FilterDropdown` se divide antes de crecer y se incluye explícitamente en la fase frontend. Usa `role="dialog"` porque contiene búsqueda, checkboxes y acciones; no simula un listbox. Debe cumplir:

- botón `Filtrar {columna}`;
- `aria-haspopup`, `aria-expanded` y `aria-controls`;
- popover `dialog` con id, `aria-labelledby` y `aria-modal="false"`;
- checkboxes nativos con labels; Tab/Shift+Tab recorren controles, Escape cierra y retorna foco;
- modos simple/controlado reciben `triggerRef`; el atom `Button` reenvía props ARIA y refs;
- Escape, Aplicar, Cerrar y clic exterior retornan foco al trigger si sigue montado;
- estado activo no dependiente solo del color;
- tokens del sistema de diseño, sin colores Tailwind hardcodeados.

El componente pasa a genérico `FilterDropdown<T extends string|boolean>` con adaptador por defecto `T=string` que conserva firmas/labels actuales. El modo simple conserva su trigger montado al abrir, renombra `Seleccionar Todos` a `Seleccionar visibles` y los modos simple/controlado comparten el mismo contrato de foco.

La tabla dedicada usa primitivas semánticas del sistema de diseño (`table`, `caption`, `th scope="col"`, `aria-sort`) sin ampliar `DataTable.tsx`. Paginación usa `nav aria-label="Paginación de planilla"`, botones con nombres explícitos y `aria-current` para posición anunciada. Skeleton usa `role="status"`; resultados/errores usan región `aria-live="polite"`. Con máximo 100 filas no usa virtualización.

En desktop el encabezado es sticky; CÉDULA usa ancho/offset `140px/0` y EMPLEADO `240px/140px`, con fondo opaco, sombra y z-index por tokens. Bajo `md` ninguna lateral es sticky. Solo ITEM, CÉDULA, EMPLEADO, FECHA, NOVEDAD, CANT. HORAS y ESTADO se renderizan por defecto; las demás están ocultas, no ocupan scroll, hasta habilitarlas en un diálogo accesible. ITEM/fecha/novedad/horas/estado no pueden desactivarse; selección persiste solo en memoria de sesión. El contenedor tiene región etiquetada y overflow controlado.

El selector móvil extiende `Modal` con `initialFocusRef`; enfoca primer checkbox después del trap, con focus-visible, Escape/cancelar/aplicar, retorno al trigger, labels y targets 44x44 px. Contador incluye búsqueda; `Limpiar todos` borra búsqueda, filtros, faceta y cursores.

## 8. Guardas Frontend

- `ServicePortal.tsx` protege las rutas con permiso base y consulta.
- `NominaDashboard.tsx` oculta ambas tarjetas sin esos permisos.
- Un helper `RequireAllPermissions` o extensión equivalente de `ProtectedRoute` usa un único SSOT y admite intersecciones.
- Usa `every`, niega si permisos son `undefined`/vacíos, no aplica bypass por rol en frontend y reevalúa cambios durante sesión.
- Abrir ruta: base + consultar. Abrir/cargar/confirmar/preview: base + consultar + cargar + salario. Descargar original añade rol admin. Exportar: base + consultar + exportar + salario. Configurar/activar: base + configurar.
- Tabla Maestra generar: base + `nomina_novedades.tabla_maestra.generar`; Solid: base + `nomina_novedades.exportar_solid`. Sus botones/rutas se ocultan y deniegan con el mismo SSOT fail-closed.
- Sin permiso salarial backend devuelve `salario/base_hora=null` y UI renderiza `Restringido`; nunca muestra valor ni habilita filtro/orden.

Permisos usan estados `verificando|listo|error`; valores de localStorage nunca autorizan antes de validación inicial. Refresh es single-flight en foco, cada 60 s y antes de acción crítica. 401/403 refresca y oculta/revoca inmediatamente; mutaciones no se reintentan solas. Error falla cerrado. Pruebas cubren deep-link, cada capacidad y revocación.

Durante refresh se conservan filas con opacidad/token de estado, controles de filtro/paginación siguen habilitados y una nueva acción cancela la anterior. El resultado vigente se anuncia sin bloquear navegación. El portal del popover se prueba cerca de cada borde del viewport para evitar recorte.

Presupuesto con fixture determinista de 50.000 filas: 5 warmups, 30 muestras, p95 nearest-rank y entorno registrado. Escenarios base, búsqueda, filtros, nullable, faceta alta y cursores: p95 <750 ms. Playwright mide 320/360/768/desktop, bordes y 22 columnas; el máximo de 30 commits Profiler por escenario (búsqueda, faceta, selector móvil, cursor recovery) es <200 ms.

## 9. Pruebas Mínimas

- Serialización de cada tipo de filtro y rechazo de campos no allowlisted.
- Paridad exacta de filtros entre consulta y exportación.
- Faceta autoexcluida, truncada, vacía y con seleccionados fuera del lote.
- Última solicitud gana con respuestas invertidas en filas y facetas.
- Cursores firmados, orden estable y reinicio al cambiar consulta.
- `CURSOR_EXPIRADO`, `CONSULTA_CAMBIO` y `CONTEXTO_CAMBIO`: un reinicio máximo, segundo fallo manual y revocación fail-closed.
- Teclado, foco y ARIA de `FilterDropdown`.
- Guardas de ruta/tarjeta/acción para cada intersección.
- Responsive con siete columnas y selector accesible.
- Tabla Maestra y `exportar-solid` con alcance, permisos y mapeo canónico.
- Cursores con inserciones concurrentes, portal en bordes y presupuesto de 50.000 filas.
