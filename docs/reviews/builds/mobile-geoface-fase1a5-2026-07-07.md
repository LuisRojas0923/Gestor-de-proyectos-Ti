# Mobile review - GeoFace Fase 1A.5 app móvil lista para build

**Fecha:** 2026-07-07  
**Revisor:** mobile-reviewer  
**Decisión:** approved_with_risks

## Alcance revisado

- `movil/app.json`: permisos Android/iOS y `usesCleartextTraffic`.
- `movil/eas.json`: perfiles EAS `preview` y `production`.
- `movil/package.json`: scripts disponibles.
- Reporte base: `docs/reviews/builds/2026-07-07_geoface-fase1a5-build-movil.md`.
- Diff móvil observado: `movil/app.json`, `movil/eas.json` y un cambio adicional en `movil/src/services/auth.ts` fuera del listado de Fase 1A.5.

## Findings

1. **Alta - `usesCleartextTraffic: true` mantiene riesgo si el build sale del piloto LAN.**  
   Es coherente con una prueba interna contra backend HTTP/local, pero no debe considerarse listo para producción abierta sin HTTPS/VPN o una decisión explícita de seguridad.

2. **Media - APK preview no generado ni validado en dispositivo físico.**  
   `preview` queda correctamente como `distribution: internal` + `android.buildType: apk`, pero falta confirmar instalación, permisos runtime, cámara frontal, GPS y conectividad real en Android físico.

3. **Media - No existen scripts móviles `lint` ni `test`.**  
   `movil/package.json` solo ofrece `typecheck`; el reporte indica typecheck PASS, pero no hay puerta automatizada de lint/test para regresiones RN/Expo.

4. **Baja - Permisos Android duplican nombres abreviados y fully-qualified.**  
   `CAMERA`/`android.permission.CAMERA` y ubicación aparecen en ambos formatos. No bloquea, pero conviene normalizar para evitar manifiestos ruidosos al prebuild/EAS.

## Permisos Android/iOS

- Correcto: `android.permission.RECORD_AUDIO` fue removido y no se observa uso funcional de audio en el alcance revisado.
- Correcto: cámara y ubicación foreground se conservan; el código usa `expo-camera` y `expo-location` con permisos runtime.
- Correcto para iOS: existen descripciones `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription` y `NSPhotoLibraryUsageDescription`.
- Riesgo: no se valida aún el prompt real en APK físico ni comportamiento al denegar permisos.

## EAS config

- `preview`: válido para distribución interna APK.
- `production`: válido para Android App Bundle (`app-bundle`).
- No bloqueante: no se observan perfiles iOS; aceptable si Fase 1A.5 apunta a Android.

## Required checks

- Reportado: `npm --prefix movil run typecheck` - PASS.
- Pendiente antes de aceptar build QA: `eas build --profile preview --platform android` y prueba de instalación en al menos 1-2 Android físicos.
- Pendiente/waiver: agregar o documentar ausencia de `npm --prefix movil run lint` y `npm --prefix movil run test`.
- No ejecuté builds, npm ni EAS durante esta revisión.

## Offline/performance risks

- Bajo conectividad limitada, el build sigue dependiendo de backend HTTP (`EXPO_PUBLIC_API_HOST`/dirección LAN) para biometría, zonas y evidencias; validar timeouts y mensajes en ruta real.
- `usesCleartextTraffic` facilita piloto LAN, pero aumenta riesgo si el APK se comparte fuera de red controlada.
- No se identifican cambios de listas/media en Fase 1A.5; el riesgo principal sigue siendo descarga/visualización de evidencias y cámara en hardware real.

## Blocking reasons

Ninguno para generar build interno de prueba. No aprobar como producción abierta hasta cerrar HTTPS/cleartext y evidencia de APK físico.

## Decisión

**Mobile review: approved_with_risks**
