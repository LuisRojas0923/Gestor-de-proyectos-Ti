# Revisión final frontend — PR #22 HDI

**Fecha:** 2026-07-22
**Alcance:** `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/HdiPreview.tsx`, `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/__tests__/HdiPreview.test.tsx` y dependencias directas inspeccionadas (`useApi`, notificaciones, configuración API y componentes del design system).
**Veredicto:** **approved_with_risks**

## Findings

### Media — El efecto no forma un bucle, pero admite solicitudes repetidas y respuestas fuera de orden

- `HdiPreview.tsx:81-106` depende de `get` y `addNotification`. Ambos son estables actualmente (`useApi.ts:37-41,130`; `NotificationsContext.tsx:27-34`), por lo que los cambios de estado internos de `useApi` **no** vuelven a disparar el efecto: no se observa un loop de render/GET.
- Sin embargo, la aplicación monta bajo `StrictMode` (`frontend/src/main.tsx:10-13`), que repite el efecto inicial en desarrollo, y el efecto no cancela ni invalida la primera solicitud. Cambios rápidos de mes/año también pueden dejar que una respuesta antigua sobrescriba el periodo más reciente.
- El test monta directamente el componente sin `StrictMode` (`HdiPreview.test.tsx:25-29`) y solo comprueba una llamada, por lo que no cubre este riesgo. Además, en un GET fallido se conserva `data` del periodo anterior (`HdiPreview.tsx:95-103`), aunque la notificación sí es accionable.

### Media — Los errores GET/POST preservan el diagnóstico, pero red/500 puede producir dos toasts

- Los `catch` de GET y POST muestran `Error.message` (`HdiPreview.tsx:95-100,138-143`), y los tests verifican ambos caminos (`HdiPreview.test.tsx:112-140`). Esto conserva correctamente el `detail` textual entregado por `useApi`.
- Para errores de red o el mensaje genérico de servidor, `useApi` ya notifica antes de relanzar (`useApi.ts:109-126`); luego `HdiPreview` vuelve a notificar. El resultado potencial son dos avisos iguales para una sola falla. Se recomienda definir un único propietario del toast.

### Baja — Queda deuda explícita de design system y accesibilidad

- Existe `FilePicker`, pero el selector continúa como `<input type="file">` crudo (`HdiPreview.tsx:258-277`). La asociación label/control, nombre accesible y foco visible sí quedaron correctos (`HdiPreview.tsx:259-270`; test: `44-49`).
- Los avisos se reimplementan con contenedores y colores directos (`HdiPreview.tsx:341-396`) en vez de la molécula `Callout`; los spinners también son `<div>` manuales (`HdiPreview.tsx:289,304-306`) en vez del átomo `Spinner`.
- El botón iconográfico de regreso no tiene `aria-label` (`HdiPreview.tsx:210-212`). Los estados de carga tampoco usan `role="status"`/`aria-live`.
- El layout de carga sigue siendo mobile-first (`HdiPreview.tsx:239`), y la tabla conserva contenedor con scroll, encabezado sticky y filtros por portal aprobados (`HdiPreview.tsx:424-489`; `FilterDropdown.tsx:256-263`).

### Baja — Endpoints fuera de la fuente central y margen arquitectónico mínimo

- Las rutas se definen localmente (`HdiPreview.tsx:49-50`) en vez de `API_ENDPOINTS` de `frontend/src/config/api.ts`, contrario al estándar del frontend.
- `HdiPreview.tsx` tiene 543 líneas: cumple el máximo de 550, pero deja solo siete líneas de margen. La siguiente ampliación debería extraer carga/procesamiento a un hook y secciones visuales a componentes.

### Baja — La suite confirma el flujo principal, pero no todo el contrato negativo

- El contrato single Excel está aplicado en UI: ausencia de `multiple`, `accept=.xlsx,.xls`, validación de `selectedFiles.length <= 1`, limpieza ante inválido y un único elemento `files` en `FormData` (`HdiPreview.tsx:108-127`; tests: `37-105`). El backend también exige exactamente un archivo.
- Los cinco tests cubren autenticación por `useApi`, GET, POST, diagnóstico GET/POST, rechazo de PDF y accesibilidad básica. No simulan una selección programática de dos archivos, el retorno del botón tras un POST rechazado, solicitudes fuera de orden ni el montaje real bajo `StrictMode`.

## Confirmaciones solicitadas

- **`useApi` autenticado:** confirmado. GET y POST pasan por `useApi<HdiResponse>` (`HdiPreview.tsx:61,85-87,130-133`), cuyo cliente agrega `Authorization: Bearer` y conserva correctamente el boundary de `FormData` (`useApi.ts:44-59,165-172`).
- **Errores accionables:** confirmado para diagnósticos de backend en GET y POST; riesgo de duplicidad para red/500 y de datos anteriores tras GET fallido.
- **Single Excel:** confirmado en frontend y consistente con el campo backend `files`; defensa autoritativa también presente en backend.
- **Accesibilidad:** mejora aprobada para el selector; quedan deudas no bloqueantes señaladas arriba. No hay modal nuevo, por lo que no aplican focus trap, Escape, scroll lock ni `aria-modal`.
- **Design system:** cumplimiento parcial; se reutilizan átomos y `FilterDropdown`, pero persisten primitivas y banners reimplementados.
- **Efectos repetidos:** sin loop por identidades inestables; sí existe riesgo de doble GET en StrictMode y carreras entre periodos.

## Required checks

Evidencia aportada por el usuario, no reejecutada por este revisor:

- Vitest focalizado: **PASS — 5 tests**.
- ESLint focalizado: **PASS**.
- Build: **PASS**.

Checks canónicos pendientes de evidencia completa cuando aplique: `npm run lint`, `npm run test`, `npm run build` desde `frontend/`. El script de build usa Vite y no ejecuta un typecheck separado.

## Design-system risks

Riesgo bajo-medio: selector crudo pese a existir `FilePicker`, banners fuera de `Callout`, spinners manuales y colores legacy. No se detecta regresión mobile-first ni en el patrón sticky/scroll de la tabla.

## Blocking reasons

Ninguna. Los riesgos identificados no invalidan el flujo single Excel ni el uso autenticado del API, pero conviene resolver concurrencia/duplicidad de errores y deuda del design system en una iteración próxima.
