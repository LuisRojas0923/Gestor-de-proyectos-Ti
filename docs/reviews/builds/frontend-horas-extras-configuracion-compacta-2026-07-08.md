Frontend review: approved_with_risks

Scope reviewed:

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/ConfiguracionHorasExtrasView.tsx`
- `frontend/src/components/atoms/Input.tsx`
- `frontend/src/components/atoms/Textarea.tsx`

Findings:

- **Bloqueante:** ninguno.
- **Alta:** ninguno.
- **Media:** ninguno.
- **Baja:** `ConfiguracionHorasExtrasView.tsx` deja las observaciones en `Textarea` de una línea (`rows={1}`, compacto desde `md`). Cumple el objetivo de densidad, pero observaciones largas quedan parcialmente ocultas hasta que el usuario haga scroll/resize dentro del control.
- **Baja / residual preexistente:** si la carga falla o la API devuelve cero parámetros visibles, la vista queda sin estado vacío en el cuerpo; el error se comunica por notificación. No fue introducido por este ajuste.
- **Informativa / residual preexistente:** el uso de `<Title level={...}>` en esta vista depende de una API que el átomo `Title` actual no consume explícitamente; no bloquea este cambio, pero conviene normalizarlo en un refactor de accesibilidad semántica.

Required checks:

- No ejecutados por este subagente por restricción de comandos.
- Evidencia reportada por implementación: `npm run build` exitoso.
- Evidencia reportada por implementación: `npx eslint` sobre los 3 archivos modificados sin salida.
- Evidencia reportada por implementación: `npm run lint` global falla por 539 errores preexistentes en archivos no tocados.

Design-system risks:

- La vista usa átomos existentes (`MaterialCard`, `Button`, `Badge`, `Input`, `Textarea`, `Text`, `Title`) y evita primitivas HTML directas en la página.
- Los nuevos ajustes visuales de la vista usan tokens CSS (`var(--color-*)`) donde agregan color/superficie; no se observan selectores acoplados al DOM interno de `Input`/`Textarea`.
- `Input` agrega `inputClassName` y `Textarea` agrega `textareaClassName`, reduciendo el acoplamiento a estructura interna y habilitando compactación localizada.
- Riesgo residual de deuda del sistema de diseño en los átomos: `Input`/`Textarea` mantienen clases de paleta Tailwind hardcodeadas preexistentes (`bg-white`, `neutral-*`, etc.). No es regresión de este cambio.

Blocking reasons:

- Ninguno. Cambio aprobado con riesgos residuales bajos/preexistentes.
