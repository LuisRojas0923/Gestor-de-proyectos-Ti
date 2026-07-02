# Plan - Optimizacion de rendimiento frontend

**Fecha:** 2026-07-01
**Plan:** Reducir el peso inicial y mejorar la percepcion de velocidad de la aplicacion React/Vite.
**Autor del plan:** Agente IA (sesion con el usuario)
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Mejorar el rendimiento percibido y el tiempo de carga inicial del frontend mediante division de codigo por rutas, carga diferida de librerias pesadas, separacion controlada de vendors y optimizacion de assets.

El problema principal detectado es que `frontend/src/components/Router.tsx` importa todas las paginas de forma estatica. Esto hace que modulos no usados en la primera pantalla, como reportes, indicadores, calendarios, inventario, portal de servicios y horas extras, entren en el bundle inicial.

### Evidencia actual

Ultimo `npm run build` observado en la sesion:

| Artefacto | Tamano aproximado | Observacion |
|---|---:|---|
| `assets/index-CpZBnnhw.js` | 3,116.48 kB | Bundle principal demasiado grande |
| `assets/index-CpZBnnhw.js` gzip | 836.85 kB | Alto para carga inicial |
| `assets/index-DdDeU_64.css` | 180.20 kB | Revisar despues del JS |
| `assets/fondo - copia-CnqBxq_a.png` | 1,219.53 kB | Imagen candidata a compresion/conversion |

## 2. No-objetivos

- No cambiar reglas de negocio ni comportamiento funcional de los modulos.
- No redisenar pantallas completas durante esta fase.
- No agregar dependencias nuevas sin aprobacion explicita del usuario.
- No modificar backend, base de datos ni RBAC.
- No reemplazar librerias grandes en la primera iteracion; primero se aislan por carga diferida.

## 3. Archivos / modulos afectados

- `frontend/src/components/Router.tsx`
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/vite.config.ts`
- `frontend/package.json` (solo si se aprueba agregar herramienta de analisis)
- `frontend/src/pages/**`
- `frontend/src/pages/ServicePortal/**`
- `frontend/src/components/**`
- `frontend/src/assets/**` o assets publicos equivalentes
- `frontend/src/tests/**`
- `docs/reviews/builds/**` para registrar resultados de implementacion

## 4. Pasos de implementacion

1. Levantar linea base de rendimiento.
   - Ejecutar `npm run build` en `frontend`.
   - Registrar tamano de JS, CSS, imagenes grandes y warnings.
   - Si el usuario aprueba dependencia temporal o dev dependency, usar analizador de bundle para confirmar los paquetes mas pesados.

2. Implementar lazy loading de rutas principales.
   - Convertir imports estaticos de paginas en `Router.tsx` a `React.lazy(() => import(...))`.
   - Envolver rutas con `Suspense` usando un loader del sistema de diseno, no HTML crudo.
   - Mantener `Login`, `VerifyEmailPage` y `ResetPasswordPage` como candidatos a carga inicial ligera o lazy segun medicion.
   - Verificar que `ProtectedRoute` siga funcionando igual.

3. Dividir el portal de servicios por submodulos.
   - Revisar `frontend/src/pages/ServicePortal` y sus rutas internas.
   - Aplicar lazy loading a modulos pesados como Horas Extras, Inventario, Viaticos, Tickets, Requisiciones y otros subflujos.
   - Evitar cargar Horas Extras si el usuario solo entra al inicio del portal.

4. Cargar librerias pesadas bajo demanda.
   - Mover usos de `jspdf`, `jspdf-autotable` y `xlsx` a imports dinamicos dentro de acciones de exportacion.
   - Aislar paginas que usan `recharts` para que los graficos no entren en la carga inicial.
   - Aislar paginas que usan `@fullcalendar/*` para que calendarios no entren en rutas no relacionadas.
   - Revisar usos de `framer-motion` y evitar importarlo desde componentes compartidos que se cargan globalmente.

5. Ajustar `vite.config.ts` con division controlada de chunks.
   - Agregar `build.rollupOptions.output.manualChunks` solo despues de lazy loading.
   - Separar vendors grandes en grupos claros: `charts`, `calendar`, `export`, `react-vendor` si la medicion lo justifica.
   - No ocultar el problema subiendo `chunkSizeWarningLimit` salvo que exista una razon documentada.

6. Optimizar assets pesados.
   - Identificar imagenes mayores a 300 kB usadas en la carga inicial.
   - Comprimir o convertir a WebP/AVIF si no rompe compatibilidad esperada.
   - Evitar importar imagenes grandes en componentes globales si pertenecen a una pagina especifica.

7. Mejorar rendimiento de pantallas con tablas grandes.
   - Revisar Horas Extras y pantallas administrativas con muchos registros.
   - Aplicar paginacion, filtros diferidos o virtualizacion solo donde haya evidencia de render lento.
   - Evitar `useMemo`/`useCallback` por defecto; seguir patrones existentes y usar optimizaciones donde la medicion lo justifique.

8. Registrar resultados.
   - Crear reporte en `docs/reviews/builds/` con antes/despues.
   - Incluir tamanos de chunks, rutas verificadas y riesgos residuales.

## 5. Comandos de validacion

- `cd frontend && npm run build`
- `cd frontend && npm run lint`
- `cd frontend && npm run test -- src/tests/PlanificadorSemanalView.test.tsx --run`
- `cd frontend && npm run test -- --run` si el tiempo de ejecucion es aceptable
- Prueba manual de rutas principales:
  - `/login`
  - `/`
  - `/service-portal/inicio`
  - `/service-portal/horas-extras`
  - `/admin/inventario`
  - `/admin/control-tower`
  - `/reports`

## 6. Impacto en documentacion

- [ ] `docs/reviews/builds/<fecha>_optimizacion-rendimiento-frontend.md` con resultados antes/despues.
- [ ] `docs/ARQUITECTURA_FRONTEND.md` si se adopta lazy loading como patron oficial de rutas.
- [ ] `docs/GUIA_DESARROLLO.md` si se agrega comando o herramienta de analisis de bundle.
- [ ] `README.md` no requerido salvo que cambien comandos publicos.

## 7. Criterios de aceptacion

| Criterio | Meta |
|---|---|
| Bundle JS inicial | Reducir al menos 40% frente a la linea base actual |
| Bundle inicial gzip | Bajar de 836.85 kB a una meta inicial menor a 500 kB |
| Rutas pesadas | `recharts`, `@fullcalendar/*`, `jspdf` y `xlsx` fuera del chunk inicial si no se usan en la primera ruta |
| UX de carga | Mostrar loader consistente con el sistema de diseno durante chunks diferidos |
| Regresiones | Sin cambios funcionales en auth, permisos ni navegacion |
| Build | `npm run build` exitoso |

## 8. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Pantalla en blanco por `Suspense` mal ubicado | M | Crear loader global y probar rutas principales manualmente |
| Error de rutas protegidas al envolver lazy components | M | Mantener estructura `ProtectedRoute` y cambiar solo el componente hijo |
| Fragmentacion excesiva de chunks | M | Medir antes/despues y aplicar `manualChunks` de forma conservadora |
| Carga tardia perceptible en rutas internas | M | Prefetch selectivo posterior para rutas frecuentes, si la medicion lo justifica |
| Imports dinamicos rompen exportaciones PDF/Excel | M | Tests/manual smoke de botones de exportacion |
| Dist generado queda modificado sin intencion | B | No versionar `frontend/dist` salvo que el flujo del repo lo requiera expresamente |

## 9. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
scope-reviewer | Validar alcance antes de build | pendiente | no
frontend-reviewer | Revisar lazy loading, rutas, UX de loaders y rendimiento | pendiente | si, antes de merge
docs-tests-reviewer | Revisar evidencia de build/test y reporte de resultados | pendiente | no
security-rbac-reviewer | No requerido; no se cambia auth/RBAC | no_aplica | no
backend-reviewer | No requerido; no hay backend | no_aplica | no
mobile-reviewer | No requerido; no se toca app movil | no_aplica | no
```

## 10. Decision final

- [x] `aprobado_con_riesgos` para planificacion inicial
- [ ] `aprobado` para implementacion completa
- [ ] `bloqueado`

La implementacion debe iniciar por lazy loading de rutas principales y medicion antes/despues. Los cambios de configuracion avanzada de Vite y cualquier dependencia nueva para analizar bundle requieren confirmacion o deben hacerse de forma reversible.

## 11. Notas adicionales

El primer retorno esperado no es una optimizacion perfecta, sino reducir el costo inicial de carga sin tocar negocio. La fase de mayor impacto probable es `Router.tsx`, porque actualmente todas las paginas se importan al inicio.
