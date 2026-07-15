# Frontend review: AlcanceEmpleados

**Resultado:** approved_with_risks

## Alcance

- `frontend/src/pages/ServicePortal/pages/AlcanceEmpleados/index.tsx`
- `frontend/src/tests/AlcanceEmpleados.test.tsx`
- Se ignoraron los cambios ajenos del working tree.

## Hallazgos

- **Bajo — áreas táctiles:** el botón de retorno nuevo sí garantiza `44×44 px`, pero los controles `size="sm"` quedan en `40 px` de alto y los botones de acciones/paginación conservan aproximadamente `36 px`. Cumplen el mínimo WCAG 2.2 de 24 px, pero quedan por debajo del objetivo táctil recomendado de 44 px para móvil. No se considera regresión bloqueante porque las acciones ya usaban el átomo `Button`; conviene normalizarlo en el sistema de diseño.
- **Riesgo heredado — asociación de etiquetas:** `Select` renderiza un `label` sin `htmlFor` ni un `id` asociado al `select`. Los rótulos son visibles, pero no quedan programáticamente vinculados. El problema pertenece al átomo compartido y ya existía antes de este diff; no es una regresión introducida por la vista.
- **Cobertura:** la sexta prueba valida correctamente el estado inicial guiado y la ausencia de filtros sin gestor. No cubre layout responsive ni dark mode; esas propiedades se verificaron estáticamente, no mediante navegador visual.

## Validación del objetivo

- La cabecera establece jerarquía clara, usa `MaterialCard`, `Button`, `Title`, `Text` y `Badge`, y el retorno tiene nombre accesible.
- El contexto pasa de una a dos columnas y finalmente a una fila de cuatro controles; no se observan anchos mínimos conflictivos entre 320 y 1600 px.
- Los filtros completan exactamente 12 columnas en `xl`: `4+2+2+2+2` y `4+4+4`.
- La barra de acciones apila controles en móvil y los distribuye horizontalmente desde `sm`.
- El estado inicial evita el vacío y guía el flujo en español.
- Los colores nuevos usan variables CSS y opacidades derivadas; no se introducen colores legacy hardcodeados y la composición es compatible con dark mode.
- Desktop conserva `DataTable` con overflow controlado; móvil conserva tarjetas. No se detecta overflow horizontal nuevo a 320 px. El contenido queda limitado a 1500 px en pantallas amplias.
- El archivo queda en 214 líneas, dentro del máximo de 550.

## Required checks

- Vitest focal: **6/6 exitosos** (evidencia suministrada; no reejecutado por restricción de solo lectura).
- ESLint focal: **exitoso** (evidencia suministrada).
- Build: **4027 módulos, exitoso** (evidencia suministrada).
- `git diff --check` focal: **exitoso**, verificado durante la revisión.

## Design-system risks

- Normalizar alturas táctiles móviles y corregir la asociación `label`/`select` en los átomos compartidos, fuera de este diff focal.

## Blocking reasons

- Ninguno.
