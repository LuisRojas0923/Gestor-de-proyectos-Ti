# Revisión frontend — horarios y relaciones (final definitiva)

> **Estado documental:** CERRADO. Veredicto vigente `approved`.

**Fecha:** 2026-07-10
**Alcance:** delta final del working tree para bloqueo de cierre durante mutaciones, semántica GeoFace no-admin y feedback de geolocalización, más verificación acumulada del build frontend.
**Veredicto:** `approved`

## Evidencia recibida

- Suite frontend global: **199 passed / 2 skipped**.
- TypeScript (`tsc`): **OK**.
- Build: **OK**.
- Lint focal: **OK, 0 errores / 0 warnings**.
- `git diff --check`: sin errores observados en esta revisión.

La revisión fue estática; este subagente no reejecutó tests, lint, typecheck ni build.

## Delta final inspeccionado

1. **Cierre por X durante mutaciones — corregido.**
   `frontend/src/components/molecules/Modal.tsx:25-49,160-169` incorpora `closeButtonDisabled` y lo transmite al átomo `Button`. Los consumidores con operaciones en curso lo activan junto con el bloqueo de Escape y overlay:
   - `PlantillaEditorModal.tsx:40`
   - `AplicarPlantillaModal.tsx:101`
   - `PlantillaActionModal.tsx:23-30`
   - `BiometriaAdminView.tsx:211-213`
   Esto cierra la ventana que permitía desmontar el flujo y limpiar la `solicitud_id` mientras la petición seguía viva. `ModalStack.test.tsx:51-59` verifica que la X deshabilitada no invoque `onClose`.

2. **Semántica para gestor no administrador — corregida.**
   `frontend/src/pages/ServicePortal/pages/Biometria/BiometriaAdminView.tsx:189-191` conserva `aria-labelledby` cuando existen tabs administrativas y usa `aria-label="Asistencias del equipo"` cuando no existen. No queda referencia a un ID ausente. `BiometriaAdminView.test.tsx:58-64` cubre el caso no-admin.

3. **Feedback de geolocalización — corregido.**
   `frontend/src/pages/ServicePortal/pages/Biometria/BiometriaAdminView.tsx:136-150,204` diferencia API no soportada y error de permisos/obtención, muestra `Callout role="alert"` en español y mantiene entrada manual. `BiometriaAdminView.test.tsx:45-56` cubre navegador sin geolocalización.

## Hallazgos

No se identificaron hallazgos nuevos de severidad alta, media o baja en el delta final.

## Cierre de hallazgos acumulados

Quedan verificados como resueltos:

- `solicitud_id` estable por payload y doble submit protegido.
- Stack de modales, Escape superior, focus trap/restauración y scroll lock reentrante.
- Bloqueo completo de dismiss durante mutaciones.
- Confirmación accesible para eliminar zonas.
- Validación centralizada de horarios nocturnos y francos.
- Máximo contractual de 200 en selección y payload.
- Error/reintento de capacidades GeoFace.
- Targets móviles de 44×44.
- Tabs enlazadas y navegación por teclado.
- Semántica no-admin sin referencias ARIA rotas.
- Refresh de empleados y conteos de gestores.
- Loading, vacío, error, paginación y selección entre páginas.
- Permisos de rutas/acciones y endpoints centralizados.
- Cobertura focal de modales, relaciones, plantillas, GeoFace y turnos.

## Checks requeridos

La evidencia final reportada satisface los checks aplicables:

- `npm run lint`
- `npm run test`
- `npm exec tsc -- --noEmit`
- `npm run build`

## Decisión

**Aprobado.** El delta final corrige los tres riesgos residuales sin introducir regresiones observables. No quedan razones de bloqueo ni riesgos frontend pendientes dentro del alcance revisado.
