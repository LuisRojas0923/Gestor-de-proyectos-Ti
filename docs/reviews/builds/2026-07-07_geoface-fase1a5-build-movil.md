# Build Review - GeoFace Fase 1A.5 App Movil Lista para Build

**Fecha:** 2026-07-07
**Build:** Preparacion de app movil GeoFace para typecheck y perfiles EAS
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `movil/package.json` - mantiene script `typecheck` agregado en Fase 1A.1.
- `movil/app.json` - remueve `android.permission.RECORD_AUDIO`; conserva camara y ubicacion.
- `movil/eas.json` - define `preview` como APK interno y `production` como app bundle Android.
- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` - marca avances Fase 1A.5.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| mobile-reviewer | aprobado con riesgos | no | Sin bloqueantes para build interno; pendiente APK fisico, cleartext y lint/test. |
| security-rbac-reviewer | bloqueado para produccion abierta | si | APK preview interno puede continuar con LAN/VPN aceptado; production/app-bundle bloqueado hasta HTTPS/VPN y `usesCleartextTraffic=false`. |
| docs-tests-reviewer | aprobado con riesgos | no | Sin bloqueantes para lista para build; pide actualizar estado de revisores y cerrar APK fisico/cleartext. |

## 3. Hallazgos bloqueantes

Ninguno vigente antes de revisores.

## 4. Hallazgos no bloqueantes

### Alta - `usesCleartextTraffic` bloquea produccion abierta

Se conserva por compatibilidad con piloto LAN/local. Para produccion abierta queda bloqueado hasta desactivarlo o usar HTTPS/VPN con decision explicita.

### Media - APK no generado ni probado en fisico

No se ejecuto EAS build ni instalacion en dispositivos Android fisicos durante esta fase.

### Media - No hay scripts `lint` ni `test` moviles

Solo existe `typecheck`; la ausencia de lint/test queda documentada para decidir si se agregan suites moviles.

## 5. Tests / comandos ejecutados

- `npm --prefix movil run typecheck` - PASS.
- Limpieza de permisos Android duplicados - PASS documental, se conservan solo camara y ubicacion.
- Busqueda `RECORD_AUDIO` en `movil/**/*.{ts,tsx,json}` - sin resultados.

## 6. Documentacion actualizada

- [x] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` actualizado con avances Fase 1A.5.
- [x] `docs/reviews/builds/2026-07-07_geoface-fase1a5-build-movil.md` creado.
- N/A `docs/ESQUEMA_BASE_DATOS.md` - no hubo cambios de modelos/tablas.
- N/A `testing/CATALOGO_PRUEBAS.md` - no hubo pruebas nuevas.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

La app movil pasa typecheck, elimina permiso de audio no usado y deja perfiles EAS claros. Queda aprobada con riesgos para build interno/piloto controlado; produccion abierta queda bloqueada por cleartext hasta HTTPS/VPN y falta de APK probado en dispositivos fisicos.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Definir HTTPS/VPN o LAN controlada para piloto. | Infra/Seguridad | 2026-07-08 |
| Para production/app-bundle: desactivar `usesCleartextTraffic` y usar HTTPS/VPN obligatorio. | Infra/Mobile | 2026-07-08 |
| Generar APK preview con EAS y probar en al menos 2 Android fisicos. | Mobile/QA | 2026-07-08 |
| Decidir si se agregan scripts `lint` y `test` moviles. | Mobile | 2026-07-08 |
| Continuar Fase 1A.6: limpieza legacy y documentacion movil. | Mobile/Docs | 2026-07-08 |
