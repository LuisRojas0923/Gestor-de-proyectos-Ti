# Frontend review — ServiceCard y tooltips del hub de Tiempo y Asistencia

**Fecha:** 2026-07-14
**Resultado:** `approved_with_risks`

## Alcance

- `frontend/src/components/molecules/ServiceCard.tsx`
- `frontend/src/components/atoms/Tooltip.tsx`
- `frontend/src/pages/ServicePortal/pages/GestionTiempoAsistencia/GestionTiempoAsistenciaSection.tsx`
- `frontend/src/pages/ServicePortal/pages/GestionTiempoAsistencia/index.tsx`
- `frontend/src/tests/GestionTiempoAsistenciaHub.test.tsx`

## Hallazgos

### Media — El tooltip no está asociado semánticamente con su disparador

`Tooltip.tsx:39` agrega `role="tooltip"`, pero el tooltip no tiene `id` y el botón no usa `aria-describedby`. `ServiceCard.tsx:29` compensa incorporando la descripción completa en `aria-label`, por lo que un lector de pantalla recibe la información, pero como parte del nombre del botón; además, el nodo `role="tooltip"` permanece en el árbol de accesibilidad aun con `opacity-0`, pudiendo anunciarse como contenido huérfano o duplicado.

Recomendación: asociar disparador y tooltip mediante `aria-describedby` + `id` estable, conservando el título como nombre accesible. Ocultar semánticamente el tooltip cuando no esté abierto si la implementación no sigue el patrón ARIA de tooltip persistente.

### Media — No existe una vía visual equivalente en dispositivos táctiles sin hover

`Tooltip.tsx:39` solo revela contenido mediante `group-hover` o `group-focus-within`. En móvil, tocar la tarjeta activa inmediatamente la navegación, por lo que una persona usuaria táctil sin lector de pantalla no puede consultar previamente la descripción. El área táctil sí es suficiente: la variante compacta conserva 72 px de alto y un icono de 48 × 48 px.

Recomendación: mantener una descripción visual resumida en pantallas táctiles/estrechas o proporcionar un disparador de información táctil independiente y accesible. No anidar ese disparador dentro del botón de navegación.

### Baja — Riesgo residual de recorte en viewports estrechos

El hub actual no introduce `overflow-hidden` en `MaterialCard` y `z-50` permite superponer filas y el footer (`z-40`), por lo que no se observa recorte estructural inmediato. Sin embargo, el tooltip usa ancho fijo `w-72`, posición absoluta centrada y no tiene detección de bordes ni portal. Puede desbordar en viewports menores a aproximadamente 320 px o si `ServiceCard` se reutiliza dentro de un ancestro con overflow.

## Verificaciones satisfactorias

- La variante compacta reduce la altura mínima de 96 a 72 px y los espacios de sección según el objetivo.
- Teclado: el botón nativo mantiene foco y activación; `group-focus-within` muestra visualmente el tooltip al enfocar.
- Dark mode: los cambios usan tokens de superficie, borde, texto y color primario; no agregan colores legacy hardcodeados.
- `ServiceCard` por defecto conserva `compact=false`, `descriptionMode='visible'`, `min-h-24`, padding, icono, tipografía y descripción visibles.
- Componentes atómicos/moleculares existentes: `Button`, `Text`, `Icon`, `Tooltip`, `MaterialCard`, `Title` y `Callout`.
- Archivos muy por debajo del máximo de 550 líneas.
- Textos de usuario en español.

## Cobertura y evidencia

- Evidencia suministrada: **14/14 tests**, ESLint focal exitoso y build Vite exitoso con **4027 módulos**. No se reejecutaron comandos `npm` por restricciones del revisor.
- `git diff --check` focal: sin errores; solo advertencias de normalización LF/CRLF.
- El test nuevo confirma presencia de `role="tooltip"` y descripción dentro del nombre accesible, pero no prueba apertura real por foco, asociación `aria-describedby`, fallback táctil, recorte ni preservación visual del modo por defecto.

## Required checks

- `npm run test -- --run src/tests/GestionTiempoAsistenciaHub.test.tsx src/components/molecules/__tests__/ServiceCard.test.tsx`
- ESLint focal sobre los cinco archivos revisados.
- `npm run build`
- `git diff --check` focal.

## Design-system risks

- Patrón ARIA incompleto para tooltip.
- Tooltip absoluto sin portal ni edge detection.
- Falta de alternativa visual táctil.

## Blocking reasons

Ninguno para integrar si las descripciones se consideran información complementaria y el riesgo táctil es aceptado explícitamente. Antes de declarar cumplimiento pleno de accesibilidad y paridad móvil, deben resolverse o aceptarse documentadamente los hallazgos medios.
