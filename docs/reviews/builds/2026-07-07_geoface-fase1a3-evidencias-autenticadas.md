# Build Review - GeoFace Fase 1A.3 Evidencias Autenticadas

**Fecha:** 2026-07-07
**Build:** Carga autenticada de evidencias biometricas en app movil
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `movil/src/services/faceApi.ts` - agrega `getAuthenticatedImageUri()` para descargar evidencias protegidas con JWT sin token en query params, restringiendo rutas a filename seguro bajo `/api/v2/biometria/evidencia/*`, validando status HTTP y eliminando temporales nativos tras convertir a data URI.
- `movil/src/components/CheckInItem.tsx` - reemplaza `<Image uri>` directo por descarga autenticada, estado de carga y fallback visual de error con logs saneados.
- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` - marca avances Fase 1A.3.

No se modifico backend en esta fase; `/api/v2/biometria/evidencia/{filename}` ya estaba protegido por auth + owner/admin.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| mobile-reviewer | aprobado con riesgos | no | Sugirio validar status HTTP, cache/limpieza y carga lazy; status y limpieza temporal mitigados. |
| security-rbac-reviewer | aprobado con riesgos | no | Bloqueos por posible exfiltracion JWT/cache local mitigados; queda riesgo menor de timeout/cancelacion y Cache-Control backend. |
| docs-tests-reviewer | aprobado con riesgos | no | Pidio marcar backend owner/admin y mantener pendientes manuales. |

## 3. Hallazgos bloqueantes

Ninguno vigente antes de revisores.

## 4. Hallazgos no bloqueantes

### Media - Validacion manual de permisos pendiente

Falta probar en ambiente real que empleado solo ve sus evidencias y admin puede ver todas segun backend.

### Media - Carga eager de evidencias pendiente

El historial descarga evidencias visibles al renderizar cada `CheckInItem`. Para historial admin/largo se recomienda carga lazy/virtualizada o boton para abrir evidencia bajo demanda.

## 5. Tests / comandos ejecutados

- `npm --prefix movil run typecheck` - PASS.
- `npm --prefix movil run typecheck` - PASS tras mitigacion de seguridad en evidencias.
- `npm --prefix movil run typecheck` - PASS tras endurecer regex de ruta de evidencia.

No se ejecutaron pruebas backend porque no hubo cambios backend.

## 6. Documentacion actualizada

- [x] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` actualizado con avances Fase 1A.3.
- [x] `docs/reviews/builds/2026-07-07_geoface-fase1a3-evidencias-autenticadas.md` creado.
- N/A `docs/ESQUEMA_BASE_DATOS.md` - no hubo cambios de modelos/tablas.
- N/A `testing/CATALOGO_PRUEBAS.md` - no hubo pruebas nuevas.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

La app ya no solicita evidencias protegidas con `<Image uri>` sin Authorization; descarga con JWT solo desde rutas relativas permitidas y usa data URI sin dejar archivo temporal persistente. Quedan riesgos por validar manualmente permisos owner/admin y optimizar carga en historiales largos.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Validar manualmente historial empleado/admin con evidencias protegidas. | Mobile/QA | 2026-07-08 |
| Evaluar carga lazy/virtualizada o apertura bajo demanda para historiales largos. | Mobile | 2026-07-08 |
| Continuar Fase 1A.4: auth movil y rutas legacy. | Mobile/Backend | 2026-07-08 |
