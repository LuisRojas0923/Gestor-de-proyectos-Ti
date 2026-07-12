# Reporte de build: Gestion de Tiempo y Asistencia

**Fecha:** 2026-07-12
**Plan:** `docs/reviews/plans/2026-07-11_gestion-tiempo-asistencia-portal.md`
**Commit base:** `21eb3c7e`
**Rama:** `Modulo_Geoface`
**Estado:** Aprobado con riesgos de baseline

## Resultado

El Portal de Servicios expone una sola entrada **Gestion de Tiempo y Asistencia**. El hub agrupa Asistencia, Planificacion de horarios, Horas extras y Administracion, filtrando cada opcion por su permiso exacto y conservando las guardas de las rutas historicas.

No se modificaron backend, contratos API, modelos, migraciones ni manifiesto RBAC.

## Cambios principales

- Registro tipado unico para las 11 opciones del hub.
- Tarjeta unica en `DashboardView`, con busqueda por alias.
- Ruta lazy `/service-portal/tiempo-asistencia` autenticada y fail-closed cuando no hay opciones.
- Alias `/service-portal/horas-extras` redirigido al hub.
- Retornos explicitos desde todas las vistas de primer nivel de Horas Extras, Biometria, Plantillas y Alcance.
- Alias de empleados dirigido al panel integrado del Planificador.
- Permiso de empleados alineado con el Planificador y retorno contextual del detalle de horario conservado.
- Pre-liquidacion renombrada visualmente como Calculadora individual, diferenciando simulacion y confirmacion del flujo masivo.
- Acceso redundante de Empleados retirado del hub; su tabla permanece integrada en el Planificador y la ruta legacy sigue redirigiendo.
- Acceso independiente de Novedades retirado del hub; el flujo operativo queda en el Planificador sin eliminar rutas ni datos historicos.
- `ServiceCard` migrado a boton nativo del sistema de diseno.
- Documentacion, catalogo y bitacora sincronizados.

## Evidencia automatizada

| Validacion | Resultado |
|---|---|
| Pruebas focales | 55 passed |
| TypeScript `tsc --noEmit` | Passed |
| ESLint focal | Passed |
| Build Vite aislado en `/tmp` | Passed, 4025 modulos |
| `git diff --check` | Passed |
| Suite Vitest global | 245 passed, 2 skipped, 3 failed |
| Suite Planificador reejecutada | 20 passed |
| ESLint global | 517 errors, 60 warnings preexistentes |

### Comandos

```powershell
docker compose exec -T frontend npm run test -- --run src/tests/gestionTiempoAsistenciaConfig.test.ts src/tests/GestionTiempoAsistenciaHub.test.tsx src/tests/GestionTiempoAsistenciaReturns.test.tsx src/tests/DashboardView.test.tsx src/tests/servicePortalFeatureRoutes.test.tsx src/tests/BiometriaModule.test.tsx src/tests/PlantillasHorarioPage.test.tsx src/tests/AlcanceEmpleados.test.tsx src/components/molecules/__tests__/ServiceCard.test.tsx
docker compose exec -T frontend npm exec tsc -- --noEmit --pretty false
docker compose exec -T frontend npm exec eslint -- <archivos focales>
docker compose exec -T frontend npm run build -- --outDir /tmp/gestion-tiempo-asistencia-dist --emptyOutDir
docker compose exec -T frontend npm run test -- --run
docker compose exec -T frontend npm run lint
```

## Fallos globales fuera del alcance

1. `MyDevelopmentsRequirements.test.tsx`: espera un boton `Eliminar` que la interfaz actual no renderiza. Falla tambien aislado.
2. `RegisterSidebar.test.tsx`: espera el copy anterior `Tu cuenta fue creada y habilitada correctamente`; la interfaz actual muestra `Tu cuenta fue validada contra el ERP...`. Falla tambien aislado.
3. `PlanificadorSemanalView.test.tsx`: excedio 5 segundos durante la suite global concurrente; la suite completa pasa 20/20 al reejecutarse.

Los dos fallos deterministas permanecen fuera de los archivos modificados por este build; la prueba del Planificador solo se ajusto a su nueva ruta canonica y pasa 20/20.

## Revision de subagentes

| Revisor | Resultado | Observacion |
|---|---|---|
| `scope-reviewer` | Aprobado con riesgos | Alcance frontend y evidencia final conformes |
| `frontend-reviewer` | Aprobado con riesgos | Sin hallazgos altos o medios atribuibles al build |
| `security-rbac-reviewer` | Aprobado con riesgos | Recomienda hardening posterior de `ProtectedRoute` |
| `docs-tests-reviewer` | Aprobado con riesgos | Evidencia y documentacion final conformes |

## Riesgos residuales

- `moduleStatus` es disponibilidad visual y mantiene la semantica fail-open heredada ante error de consulta; no sustituye RBAC.
- `ProtectedRoute` trata `permissions` ausente de forma permisiva en rutas con `moduleCode`; el backend conserva la autoridad. Su hardening debe abordarse por separado con pruebas de todas las rutas.
- `frontend/package-lock.json` es un cambio previo de sincronizacion de dependencias y no forma parte funcional de este build.

## Decision

Build aprobado con riesgos de baseline documentados. No quedan bloqueos atribuibles a Gestion de Tiempo y Asistencia.
