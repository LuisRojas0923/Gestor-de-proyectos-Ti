# Checklist GeoFace Movil

## Estado Actual

- [x] App activa en `movil/` con Expo Router.
- [x] Backend central `backend_v2` como API unica para la app.
- [x] `biometria-engine` como motor interno, no expuesto al movil.
- [x] Login JWT contra `/api/v2/auth/login`.
- [x] Usuario actual por `/api/v2/auth/yo`.
- [x] Estado biometrico backend-source por `/api/v2/biometria/estado`.
- [x] Enrolamiento fail-closed.
- [x] Zonas oficiales desde `/api/v2/biometria/zonas`.
- [x] Creacion/eliminacion de zonas por backend para admin.
- [x] Check-in envia foto, GPS y zona oficial.
- [x] Backend valida geocerca antes del motor biometrico.
- [x] Evidencias protegidas descargadas con JWT.
- [x] `npm run typecheck` configurado y ejecutado.
- [x] `RECORD_AUDIO` removido.
- [x] `eas.json` con `preview` APK interno y `production` app bundle.

## Pendientes Bloqueantes para Produccion Abierta

- [ ] Definir HTTPS/VPN y desactivar `usesCleartextTraffic` para production.
- [ ] Confirmar `biometria-engine` en `docker-compose.prod.yml` y `docker-compose.Pruebas3.yml`.
- [ ] Definir comportamiento si no hay zonas oficiales.
- [ ] Ejecutar APK preview en al menos 2 Android fisicos.
- [ ] Validar owner/admin de evidencias con usuarios reales.
- [ ] Confirmar endpoints protegidos sin token responden `401`.

## Pendientes Fase 1A.6

- [x] Actualizar `movil/API_CONTRACT.md` a backend `/api/v2`.
- [x] Actualizar `movil/docs/CONTEXTO.md` con ruta `movil/`.
- [x] Actualizar `movil/docs/ARQUITECTURA.md` con `backend_v2 + biometria-engine`.
- [x] Actualizar `movil/docs/GUIA-DESARROLLO.md` con puerto `8000`, `.env`, APK y pruebas.
- [x] Marcar `movil/face-server/` como historico no productivo.
- [ ] Eliminar o archivar fisicamente `movil/face-server/` cuando el equipo apruebe.

## Comandos de Verificacion

```bash
npm --prefix movil run typecheck
```

```bash
python -m pytest testing/backend/test_biometria_engine_api.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py -q
```

## Riesgos Aceptados Temporalmente

- `usesCleartextTraffic=true` solo para LAN/piloto controlado.
- Sin scripts moviles `lint`/`test` todavia.
- `movil/face-server/` sigue versionado como historico hasta decision de eliminacion.
