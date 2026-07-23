# Revisión frontend — catálogo de nómina protegido por RBAC

**Fecha:** 2026-07-22
**Alcance:** `NominaDashboard.tsx`, `NominaCategoryView.tsx`, `ExcepcionesPreview.tsx`, `__tests__/NominaDashboard.test.tsx` y dependencia directa `hooks/useApi.ts`.
**Veredicto:** **approved_with_risks**

## Findings

### Confirmado — La corrección incorpora autenticación en los tres consumidores

- Las tres lecturas de `/novedades-nomina/catalogo` pasan ahora por `useApi<Record<string, string[]>>()` (`NominaDashboard.tsx:131,139`, `NominaCategoryView.tsx:29,36`, `ExcepcionesPreview.tsx:46,90`).
- `useApi` obtiene el token vigente de `localStorage` y agrega `Authorization: Bearer ...` (`useApi.ts:44-59`); además conserva el flujo existente de refresh ante 401. Se elimina correctamente el `axios.get` directo solo para este catálogo.
- El contrato `Record<string, string[]>` representa adecuadamente la respuesta consumida y los `catch` modificados usan `unknown` implícito, no introducen `catch (err: any)`.

### Media — Solo uno de los tres consumidores quedó cubierto directamente

- El test nuevo comprueba que `NominaDashboard` llama el `get` del hook y renderiza el catálogo (`NominaDashboard.test.tsx:21-38`).
- No existen pruebas equivalentes para `NominaCategoryView` ni `ExcepcionesPreview`; por tanto, dos de las tres rutas que originaron el bug podrían volver a axios directo sin que esta cobertura lo detecte.
- El mock reemplaza `useApi`, así que prueba la integración del componente con el hook, no la presencia real del header. Esta última sí queda sustentada por la inspección de `useApi`, pero sería más robusta con una prueba compartida del cliente autenticado.

### Baja — No hay loop infinito; sí puede haber GET duplicado en StrictMode

- `request` y `get` son estables mediante `useCallback` (`useApi.ts:37-128,130`), y los cambios del estado interno del hook no cambian la identidad de `get`. Las dependencias `[get]` y `[category, get]` no generan ciclos de render/petición.
- En desarrollo con React `StrictMode`, los efectos de montaje pueden ejecutarse dos veces. El catálogo es un GET idempotente y `NominaDashboard` evita actualizar estado tras desmontaje, pero no cancela la primera petición; `NominaCategoryView` y `ExcepcionesPreview` tampoco invalidan respuestas. Es un riesgo de solicitudes duplicadas/carreras, no un loop continuo.
- El test nuevo no monta bajo `StrictMode` ni limita explícitamente el número de llamadas, por lo que no caracteriza este comportamiento.

### Baja — Endpoint aún fuera de la fuente central requerida

- Los tres componentes y el test repiten el literal `'/novedades-nomina/catalogo'`; el endpoint no está registrado en `API_ENDPOINTS` de `config/api.ts`, contrario al estándar de configuración centralizada.
- Esto no impide la autenticación ni el funcionamiento actual, pero aumenta el riesgo de drift.

### Baja — UX de error y tipado defensivo siguen limitados

- `NominaDashboard` y `NominaCategoryView` registran el error en consola y terminan mostrando el mismo estado vacío que un catálogo válido sin datos. `ExcepcionesPreview` sí emite una notificación en español.
- El genérico evita `any` en el cambio, pero no valida en runtime que todas las propiedades del payload sean realmente `string[]`; el mock del test tampoco está ligado a un DTO exportado.

## Alcance, arquitectura y diseño

- La corrección focal es pequeña y no altera layout, tablas, modales ni estilos; no introduce regresiones mobile-first o del sistema de diseño.
- Los archivos permanecen bajo el máximo de 550 líneas (`NominaDashboard`: 208, `NominaCategoryView`: 135, `ExcepcionesPreview`: 478, test: 39).
- `ExcepcionesPreview` conserva axios directo, `catch (err: any)` y deuda de design system en otros flujos legacy. No fueron introducidos por esta corrección y quedan fuera del bug específico del catálogo.
- El worktree contiene cambios adicionales de HDI/backend/docs no atribuibles a esta corrección; deben separarse o revisarse según su propio alcance antes de integrar.

## Required checks

Evidencia aportada por el usuario y no reejecutada por este revisor:

- Tests focalizados: **PASS — 6 tests**.
- Build frontend: **PASS**.
- ESLint del test nuevo: **PASS**.
- Los errores ESLint de los tres archivos legacy se reportan como preexistentes.

Checks canónicos para integración desde `frontend/`: `npm run lint`, `npm run test`, `npm run build`. Falta evidencia de lint y suite completos; el lint legacy conocido debe quedar documentado o acotado por diff.

## Design-system risks

No se introducen riesgos visuales nuevos. Persisten deudas legacy fuera de la corrección, especialmente primitivas/contenedores con colores directos en `ExcepcionesPreview` y en las vistas de nómina.

## Blocking reasons

Ninguna. El defecto funcional de autenticación queda corregido en los tres consumidores. La cobertura incompleta, la duplicación posible en StrictMode y la falta de constante central son riesgos no bloqueantes.
