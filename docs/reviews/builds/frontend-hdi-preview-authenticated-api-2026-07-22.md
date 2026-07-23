# Revisión frontend — HdiPreview / cliente autenticado y accesibilidad

**Fecha:** 2026-07-22
**Modo:** build
**Alcance:** `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/HdiPreview.tsx` y `__tests__/HdiPreview.test.tsx`

## Veredicto

**approved_with_risks**

La migración de GET/POST a `useApi` incorpora el token y conserva correctamente `FormData`; el detalle textual de FastAPI llega como `Error.message`. La asociación label/control, el nombre accesible y el foco visible del selector son adecuados. No se detecta una razón bloqueante, pero la ruta de error nueva no está cubierta y quedan riesgos concretos de UX, tipado y sistema de diseño.

## Hallazgos

### Media — La conducta principal de error no está probada y puede duplicar avisos de red

- `HdiPreview.tsx:134-139` muestra `err.message`, pero ninguno de los tres tests hace que `apiPost` rechace con `new Error(<detail>)` ni comprueba que ese detalle se notifique.
- `useApi.ts:121-126` ya notifica errores de red y algunos errores genéricos de servidor antes de relanzarlos. El `catch` de `HdiPreview` vuelve a notificar cualquier error, por lo que un fallo de red puede producir dos toasts iguales.
- Agregar un test de rechazo que verifique el detalle exacto, la ausencia de éxito y la recuperación del botón tras finalizar. Para el caso de red, definir un único propietario de la notificación.

### Media — El GET fallido no tiene estado de error visible

- `HdiPreview.tsx:95-97` solo escribe en consola. Ante ciertos 4xx con detalle, `useApi` relanza sin toast y la pantalla puede mostrar “Sin datos procesados”, confundiendo un fallo de consulta con un periodo vacío.
- Además, al cambiar de periodo no se limpia `data` antes del GET; si la consulta falla, pueden permanecer visibles datos del periodo anterior.
- Debe distinguirse carga vacía de carga fallida mediante notificación o estado persistente de error, idealmente con reintento.

### Baja — Los endpoints no usan la fuente central requerida

- `HdiPreview.tsx:49-50` declara rutas locales. Aunque evita concatenar `BASE_URL` y funciona con `useApi`, el estándar exige registrar y consumir estos endpoints desde `API_ENDPOINTS` en `config/api.ts`.

### Baja — El contrato y sus fixtures no están completamente tipados

- El fixture exitoso de `HdiPreview.test.tsx:80-84` omite campos requeridos por `HdiResponse.summary`, `warnings` y otros miembros; los mocks sin tipo permiten que el test no detecte drift del backend.
- En el componente, `warnings` está declarado `string[]`, pero se consultan `w.id` y `w.cedula` (`HdiPreview.tsx:347`), y se consulta `row.CONCEPTO` sin declararlo en `HdiRow` (`HdiPreview.tsx:510`). Vite puede transpilar esto sin realizar un typecheck completo.
- Conviene exportar/reutilizar el DTO o tipar los mocks con `satisfies HdiResponse`; si se soporta una respuesta legacy, representarla explícitamente en el tipo.

### Baja — Deuda de sistema de diseño y microcopy

- El selector sigue implementado con `<input type="file">` crudo en vez de la molécula `FilePicker`. La reparación accesible es válida, pero no elimina la excepción al sistema atómico.
- El label singular todavía produce “Archivo Excel (1 seleccionados)” y el placeholder conserva “Seleccionar archivos...”. Debe concordar en singular para este flujo de archivo único.
- El archivo queda en 539 líneas, dentro del máximo de 550 pero con solo 11 líneas de margen; la próxima ampliación debe extraer lógica o secciones.

## Accesibilidad y UX verificadas

- `htmlFor="file-upload"` enlaza el label visible con el control.
- `aria-label="Archivo Excel"` proporciona nombre accesible; no entra en conflicto funcional con el label.
- `peer-focus-visible:ring-*` hace visible el foco de teclado sobre la superficie personalizada.
- `accept`, ausencia de `multiple`, validación imperativa, limpieza y botón deshabilitado mantienen prevención UX; la validación autoritativa sigue en backend.
- No se añadió modal, por lo que no aplican focus trap, Escape, scroll lock ni atributos de diálogo.
- Se mantiene el layout mobile-first del área de carga (`flex-col md:flex-row`) y la tabla conserva scroll, encabezado sticky y filtros aprobados.
- No se introdujo `catch (err: any)`; se usa `unknown` implícito con `instanceof Error`.

## Adecuación de tests

Los tres tests cubren selección única, rechazo de PDF, limpieza, ausencia de POST inválido, uso del GET/POST del hook, contenido del `FormData`, éxito, nombre accesible y clase `peer`. Falta cubrir la afirmación nueva más importante: propagación del `detail` del backend mediante `Error.message`. También sería útil cubrir rechazo por más de un archivo y GET fallido.

## Checks requeridos

Evidencia suministrada por el orquestador, no reejecutada por este revisor:

- Vitest enfocado: **PASS — 3 tests**.
- ESLint enfocado: **PASS**.
- Build de producción: **PASS**.

Antes de integrar siguen siendo los checks canónicos desde `frontend/`: `npm run lint`, `npm run test` y `npm run build`. No se aportó evidencia de lint/test completos. El build de Vite no sustituye un `tsc --noEmit` cuando se desea validar estrictamente el contrato señalado.

## Riesgos de sistema de diseño

Riesgo bajo y preexistente por el input crudo y clases de color legacy. El diff actual mejora accesibilidad y no introduce una regresión responsive.

## Razones bloqueantes

Ninguna.
