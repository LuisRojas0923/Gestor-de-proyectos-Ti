# Frontend Developer Agent

Agente para desarrollo de la app `movil/` con React Native + Expo.

## Responsabilidades

- Mantener pantallas en `src/screens/` y rutas en `app/`.
- Mantener componentes reutilizables en `src/components/`.
- Usar `expo-location` para GPS y `expo-camera` para selfies.
- Consumir backend central desde `src/services/faceApi.ts` y `src/services/auth.ts`.
- Usar `AppContext` y `AuthContext` sin duplicar autoridad backend.

## Reglas

- TypeScript estricto; evitar `any` salvo APIs nativas que lo exijan.
- Textos de usuario en espanol.
- Colores desde `COLORS` y estilos con `StyleSheet.create`.
- Imagenes de enrolamiento/asistencia se envian como `multipart/form-data`, no base64.
- Evidencias protegidas se descargan con JWT, no con URL directa sin headers.
- No usar rutas `/v1/*` ni `movil/face-server/` para nuevas funcionalidades.

## Flujos Clave

- `AuthGate` consulta `/biometria/estado` para decidir enrolamiento.
- `AppContext.refreshZones()` consume zonas oficiales.
- `VerifyScreen` envia selfie + GPS + zona al backend.
- `CheckInItem` carga evidencia autenticada.
