# Mobile Review - GeoFace Fase 1A.6 Limpieza Legacy y Documentacion Movil

**Fecha:** 2026-07-07  
**Scope:** `movil/` docs/API contract, `movil/face-server/README.md`, agents docs, plan/reporte Fase 1A.6  
**Outcome:** `approved_with_risks`

## Decision

Mobile review: approved_with_risks

La documentacion principal queda mayormente alineada con la app actual `movil/`, `backend_v2` y `biometria-engine`. No hay hallazgos bloqueantes para cerrar la limpieza documental de Fase 1A.6, pero persisten riesgos operativos por conservar `movil/face-server/` versionado y por referencias legacy residuales en docs auxiliares de agentes.

## Findings

### Media - Referencias legacy residuales en agentes moviles

- `movil/docs/agents/qa-tester.md:12` sigue hablando de caida del servidor DeepFace como runtime.
- `movil/docs/agents/qa-tester.md:17` conserva caso de perfiles legacy de embeddings 128D.
- `movil/docs/agents/frontend-developer.md:22` indica convertir camara a base64 antes de `faceApi.ts`, mientras la app actual usa `multipart/form-data`.
- Varias rutas `file:///.../scratch/geo-face-app/...` permanecen en `frontend-developer.md` y `qa-tester.md`, no consistentes con `movil/`.

Impacto: no rompe runtime, pero puede guiar mal a futuros cambios y reintroducir contrato Flask/legacy.

### Media - `EXPO_PUBLIC_API_HOST` documentado como origen de produccion, pero el codigo lo fuerza a HTTP puerto 8000

`movil/API_CONTRACT.md` y `movil/docs/GUIA-DESARROLLO.md` indican LAN `http://<HOST>:8000/api/v2` y produccion `https://<HOST>/api/v2`. Sin embargo `movil/src/services/faceApi.ts` construye el valor de entorno como `http://${EXPO_PUBLIC_API_HOST}:8000/api/v2`. La configuracion guardada por UI si puede normalizar URL completa, pero la variable de entorno no sirve para HTTPS directo.

Impacto: riesgo de configuracion erronea en build productivo si se intenta usar `.env` para HTTPS. Debe documentarse explicitamente o ajustar codigo en una fase posterior.

### Media - `movil/face-server/` queda versionado y ejecutable

El nuevo `movil/face-server/README.md` marca correctamente el servidor Flask como historico no productivo, y no aparece en `docker-compose.yml`. Aun asi conserva `server.py`, `Dockerfile`, `start.bat` y `requirements.txt`.

Impacto: riesgo de arranque accidental por operadores/desarrolladores o confusion de soporte. Mantenerlo es aceptable temporalmente solo si queda fecha de eliminacion/archivo y no se referencia como contrato operativo.

### Baja - Fase 1A.6 marca decision legacy cerrada aunque la eliminacion fisica queda pendiente

El plan marca cerrada la decision de `face-server` como historico no productivo. Es consistente con el reporte, pero conviene que el seguimiento mantenga fecha/owner hasta archivar o eliminar el directorio.

## Required checks

- Reportado por el build: `npm --prefix movil run typecheck` - PASS.
- Pendiente recomendado antes de piloto/productivo: suite backend biometria indicada en `movil/CHECKLIST.md`.
- No hay scripts moviles `lint` ni `test` en `movil/package.json`; queda documentado en `movil/docs/GUIA-DESARROLLO.md`.
- Verificaciones manuales pendientes: APK preview en 2 Android fisicos, permisos camara/ubicacion, backend lento/offline, evidencia owner/admin, endpoints sin token `401`.

## Offline/performance risks

- La documentacion no promete modo offline de asistencia; correcto para biometria/geocerca con backend como autoridad. La cache local queda solo visual.
- Mantener `usesCleartextTraffic=true` es aceptable solo para LAN/piloto; produccion requiere HTTPS/VPN.
- `biometria-engine` no esta en `docker-compose.prod.yml` ni `docker-compose.Pruebas3.yml`; ya queda como pendiente productivo fuera de Fase 1A.6.
- Las imagenes se envian como `multipart/form-data`, consistente con performance; evitar que docs auxiliares vuelvan a recomendar base64.

## Blocking reasons

Ninguno para Fase 1A.6 documental. No aprobar produccion abierta hasta cerrar HTTPS/VPN, compose productivo/Pruebas3 con `biometria-engine`, pruebas en dispositivos fisicos y decision final de archivo/eliminacion de `face-server`.
