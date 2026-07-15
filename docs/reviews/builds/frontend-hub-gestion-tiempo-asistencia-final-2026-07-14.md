# Frontend review — Hub Gestión de Tiempo y Asistencia (estado final)

**Fecha:** 2026-07-14
**Resultado:** `approved_with_risks`

## Alcance

- `frontend/src/components/atoms/Tooltip.tsx`
- `frontend/src/components/molecules/ServiceCard.tsx`
- `frontend/src/pages/ServicePortal/pages/GestionTiempoAsistencia/GestionTiempoAsistenciaSection.tsx`
- `frontend/src/pages/ServicePortal/pages/GestionTiempoAsistencia/gestionTiempoAsistenciaConfig.ts`
- `frontend/src/pages/ServicePortal/pages/GestionTiempoAsistencia/index.tsx`
- `frontend/src/tests/GestionTiempoAsistenciaHub.test.tsx`

## Findings

No se identificaron bloqueos.

### Media — La descripción no tiene consulta visual estable en interacción exclusivamente táctil

El tooltip se revela correctamente con `group-hover` y `group-focus-within`. En una interacción táctil, el mismo toque enfoca y activa el botón de navegación, por lo que una persona sin lector de pantalla normalmente no alcanza a consultar la descripción antes de abandonar el hub. No bloquea el objetivo solicitado porque la descripción está definida como información complementaria y sigue disponible semánticamente por `aria-describedby`.

### Baja — Riesgo residual de desborde por ancho fijo

En el hub actual no existen ancestros con `overflow-hidden` y el tooltip de `w-72` cabe en la composición móvil a partir de 320 px, además de quedar por encima del footer mediante `z-50`. No obstante, el posicionamiento absoluto centrado no tiene portal ni detección de bordes; puede desbordar por debajo de 320 px, con zoom elevado o si `ServiceCard` se reutiliza dentro de un contenedor recortado.

### Baja — Metadato de sección obsoleto

La sección `planificacion` permanece en el tipo y en `SECCIONES_TIEMPO_ASISTENCIA`, aunque ya no recibe opciones y no se renderiza. No produce el bloque vacío en UI, pero deja configuración y documentación arquitectónica susceptibles a desalineación.

## Verificaciones satisfactorias

- `Tooltip` genera un `id` estable con `useId`, conserva cualquier descripción previa y lo conecta al botón mediante `aria-describedby`.
- El nombre accesible del botón queda limitado al título; la descripción actúa como descripción accesible y el nodo usa `role="tooltip"`.
- Hover y foco muestran el tooltip; Enter/Espacio y foco visible se conservan por la primitiva nativa `Button`.
- La variante compacta compone 48 px de icono más 12 px de padding por lado, con `min-h-[72px]`; los títulos permanecen en una línea.
- El grid es mobile-first: una columna, dos desde `md` y tres desde `lg`.
- Los encabezados de sección usan `flex-wrap`, título semántico y descripción inline.
- Planificador y Plantillas pertenecen a `asistencia`; la sección Planificación no aparece cuando queda vacía.
- Se reutilizan átomos y moléculas del sistema; las superficies, bordes y estados principales usan tokens CSS.
- No hay cambios de API, tablas, modales ni manejo de errores dentro del alcance.
- Todos los archivos revisados están por debajo del límite de 550 líneas.
- `git diff --check` focal no reportó errores; únicamente avisos de normalización LF/CRLF.

## Required checks

Evidencia suministrada y aceptada, no reejecutada por las restricciones del revisor:

- Vitest: **48/48**.
- `npm run lint`: exitoso.
- `npm run build`: exitoso.

## Design-system risks

- Tooltip absoluto sin portal ni edge detection.
- Sin alternativa visual persistente para touch-only.
- `Tooltip` conserva clases de texto gray hardcodeadas preexistentes en vez de depender exclusivamente de tokens.

## Blocking reasons

Ninguno. Aprobado para integrar con los riesgos responsive/táctiles anteriores documentados.
