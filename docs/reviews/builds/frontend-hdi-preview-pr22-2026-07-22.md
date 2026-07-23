# Revisión frontend — PR #22 / HdiPreview reparado

**Fecha:** 2026-07-22
**Modo:** build
**Alcance:** diff efectivo contra `origin/main` de `HdiPreview.tsx` y `__tests__/HdiPreview.test.tsx`

## Veredicto

**approved_with_risks**

No se encontraron regresiones bloqueantes en la reparación. La selección queda limitada a un archivo, `accept` anuncia `.xlsx,.xls`, el handler vuelve a validar cantidad y extensión, limpia una selección previa inválida y evita el POST al quedar el botón deshabilitado. Esta validación es defensa UX, no una frontera de seguridad; la validación autoritativa debe permanecer en el backend.

## Hallazgos

### Media — Accesibilidad y sistema de diseño del selector

- `HdiPreview.tsx:250-259` mantiene un `<input type="file">` crudo aunque existe la molécula `FilePicker`.
- El `Text as="label"` no envuelve el control ni declara `htmlFor="file-upload"`; el input tampoco tiene `aria-label`. Por ello, el selector puede carecer de nombre accesible.
- El control transparente tampoco expone un estado de foco visible en su superficie personalizada.

No se considera bloqueo de esta reparación porque la estructura antecede al cambio y el diff mejora sus restricciones, pero debe corregirse en una deuda posterior usando el componente de diseño existente y conservando la validación estricta.

### Baja — Cobertura parcial de la validación resistente a bypass

- El test negativo sí usa los mocks reales de las dependencias consumidas por el componente (`axios.get/post` y `useNotifications`) y comprueba notificación, limpieza, botón deshabilitado y ausencia de POST.
- Falta ejercitar explícitamente la rama `selectedFiles.length > 1` mediante un evento sintético y un caso positivo que seleccione un Excel, procese y verifique el `FormData` enviado. El test llamado “acepta un único archivo Excel” solo inspecciona atributos del DOM.

### Baja — Microcopy aún plural para un flujo de archivo único

- `HdiPreview.tsx:251,265` muestra “Archivos Excel”, “seleccionados” y “archivos Excel” aunque el control ya es de selección única. No rompe el flujo, pero reduce la claridad del contrato UX.

## Verificaciones de arquitectura y UX

- **Validación cliente:** adecuada como prevención UX: sin `multiple`, filtro `accept` y validación imperativa de cantidad/extensión. No se confía en MIME del navegador. La seguridad no debe depender del cliente.
- **Mocks:** correctos y hoisted; sustituyen los módulos que `HdiPreview` importa realmente.
- **Tabla:** conserva contenedor con scroll, encabezado sticky y `FilterDropdown` aprobado con portal/Escape; el cambio no introduce regresiones de tabla.
- **Responsive:** el área de carga conserva composición mobile-first (`flex-col md:flex-row`).
- **Estados:** carga, vacío, procesamiento y error por notificación continúan presentes.
- **Tipado:** el diff elimina el `any` del filtro y no introduce `catch (err: any)`.
- **Endpoints:** el archivo conserva rutas HDI construidas inline en vez de constantes de `config/api.ts`; es deuda preexistente y no fue agravada por la reparación.
- **Tamaño:** `HdiPreview.tsx` tiene 533 líneas, dentro del máximo de 550, pero con solo 17 líneas de margen. Próximas ampliaciones deben extraer lógica/componentes.
- **Tematización:** el diff de reparación no agrega colores hardcodeados; permanecen estilos legacy preexistentes fuera del cambio funcional.
- **Modales:** no aplica; no se añadió modal.
- **Idioma:** los textos nuevos están en español.

## Checks y riesgos de build

Evidencia suministrada por el orquestador, no reejecutada por este revisor:

- Vitest enfocado: **PASS — 2 tests**.
- ESLint enfocado en archivos cambiados: **PASS**.
- Build de producción (`npm run build`): **PASS**.
- Lint completo: **no limpio — 504 errores preexistentes fuera de los archivos cambiados**; no se atribuyen a PR #22.

Riesgo residual: `npm run build` ejecuta solo `vite build` y no un typecheck (`tsc --noEmit`), por lo que el build exitoso no demuestra por sí solo tipado global limpio. Para el alcance frontend cambiado, la evidencia enfocada es suficiente.

## Razones bloqueantes

Ninguna.
