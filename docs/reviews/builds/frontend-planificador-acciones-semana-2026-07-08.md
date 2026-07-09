Frontend review: approved_with_risks

Scope reviewed:
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/PlanificadorHeader.tsx`

Findings:
- Medium UX risk: los botones movidos quedaron como `Guardar` y `Confirmar`, no como `Guardar borrador` y `Confirmar semana`. En el header compacto puede ser aceptable por tamaño, pero se pierde especificidad respecto a la acción real. Recomendación: conservar texto completo en `aria-label`/`title` o mostrar sufijos en pantallas mayores (`md:inline`) sin agrandar móvil.
- Low UX risk: al eliminar la tarjeta inferior también se eliminó el texto guía sobre revisar horas/costos antes de confirmar. Si el flujo depende de esa comprensión, conviene reubicarlo como ayuda compacta o tooltip/callout, no necesariamente como tarjeta inferior.
- Low responsive risk: el contenedor `flex flex-wrap` debería envolver los 6 controles + badge de semana en móvil, pero queda muy denso. Validar manualmente en 320-390 px que no haya overflow horizontal y que `Confirmar` no quede visualmente desconectado.
- Low maintainability risk: `PlanificadorSemanalView.tsx` queda en 538 líneas, por debajo del límite de 550 pero con poco margen. Próximos cambios deberían extraer `accionesSemana` o lógica a subcomponentes/hooks.

Design-system risks:
- No se introducen botones HTML crudos: se mantiene el átomo `Button` y componentes existentes (`Badge`, `Input`, `MaterialCard`, `Text`, `Title`).
- No se introducen colores hardcodeados nuevos en el diff; se respetan variables/tokens ya usados en el header.
- Las clases de tamaño (`h-7`, `!px-2`, `!text-[11px]`, iconos `w-3.5`) son overrides locales aceptables para densidad, aunque sería más consistente usar props del átomo (`size="xs"`, `rounded="full"`) si el diseño lo permite.

Required checks:
- Evidencia recibida: `npx eslint` sobre ambos archivos sin salida.
- Pendiente: confirmar resultado de `npm run build` desde `frontend/` cuando finalice.
- Recomendado si CI lo exige: `npm run lint` completo desde `frontend/`.
- No se requieren tests nuevos: no hay modal/formulario nuevo; el modal existente de confirmación no cambia.

Blocking reasons:
- Ninguno. No se detectan bloqueos funcionales, de design-system o accesibilidad en el cambio revisado. Aprobado con riesgos menores/medios de copy y densidad responsive.
