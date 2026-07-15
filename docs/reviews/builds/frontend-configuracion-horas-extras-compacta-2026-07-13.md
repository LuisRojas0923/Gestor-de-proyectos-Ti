# Frontend review: Configuración de horas extras compacta

**Resultado:** `approved`

**Alcance revisado:** diff actual de `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/ConfiguracionHorasExtrasView.tsx` contra `HEAD`, con cardinalidad real 2/1/2/4.

## Hallazgos

Sin hallazgos críticos, altos, medios o bajos restantes.

La corrección conserva `FECHA_VIGENCIA_JORNADA_42` y añade `xl:grid-cols-2` a Jornada semanal. Sus dos reglas quedan en paralelo en escritorio, evitando que esa sección duplique verticalmente la altura de la primera fila. La distribución completa queda 2/1/2/4, nueve reglas visibles sin ocultar datos.

El segundo hallazgo también quedó resuelto: las descripciones envuelven normalmente en móvil y `truncate` solo se activa desde `xl`.

## Verificaciones del diff

- **Layout y desbordamiento:** `4/3/5` usa las 12 columnas en `xl`; Jornada y Nocturna dividen sus dos reglas, y Topes ocupa 12 columnas con cuatro reglas. Los anchos flexibles y `minmax(0, 1.4fr)` no introducen desbordamiento horizontal en 1280/1366 px.
- **Altura:** la primera fila ya no apila las dos reglas de Jornada. Con header compacto, textareas de una línea y Topes en una sola fila, la estructura es compatible con el objetivo de una vista de escritorio de 900 px en estado normal.
- **Mobile-first:** la base sigue siendo una columna; todas las divisiones compactas se activan únicamente en `xl`. Las descripciones completas permanecen disponibles en móvil.
- **Legibilidad:** nombres de reglas a 14 px, títulos de grupo a 16 px y jerarquía clara; los textos de 11 px se limitan a soporte y metadatos secundarios.
- **Accesibilidad:** controles con labels, estados inválidos descritos, botones principales de 44 px y modal compartido con semántica, focus trap, Escape, bloqueo de scroll y retorno de foco.
- **Dark mode:** superficies, bordes, texto y gradientes usan tokens o variantes dark existentes; no se agregan colores hardcodeados.
- **Design system:** se conservan los átomos y moléculas existentes; no se reimplementan controles ni banners.
- **Estados UX:** carga, error, vacío y cambios pendientes siguen cubiertos.
- **Arquitectura:** 430 líneas, por debajo del máximo de 550; sin cambios de API ni `any` nuevos.

## Required checks

Evidencia informada por el solicitante, no reejecutada salvo inspección focal de `git diff --check`:

- Vitest focal: **3/3 exitosos**.
- ESLint focal: **limpio**.
- `git diff --check`: **limpio**.
- Build Vite: **4027 módulos, exitoso**.

## Design-system risks

Ninguno identificado en el diff actual.

## Blocking reasons

Ninguno.
