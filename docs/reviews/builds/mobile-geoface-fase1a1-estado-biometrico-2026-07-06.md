Mobile review: approved_with_risks

Scope: Fase 1A.1 GeoFace - estado biometrico backend-source en `movil/`.
Date: 2026-07-06

Findings:
- [high][non-blocking] `movil/app/_layout.tsx:20-27` + `movil/src/context/AppContext.tsx:88-104`: el estado biometrico queda cacheado por `biometricStatusUserId`. Si `GET /biometria/estado` falla una vez, se guarda fail-closed (`enrolado=false`) para ese usuario y `AuthGate` no reintenta mientras el id coincida; un operador ya enrolado puede quedar atrapado en `/enroll` tras una caida/transicion de red. En sentido inverso, un `enrolado=true` previo no se refresca al logout/login del mismo usuario ni al volver de background, por lo que el gate puede usar estado obsoleto si backend cambia durante la misma vida del proceso.
- [medium][non-blocking] `movil/src/context/AppContext.tsx:120-131` y `144-155`: `saveFacePhoto()` copia la foto al almacenamiento local antes de que backend confirme enrolamiento/actualizacion. Si `enrollFace()` o el `GET /estado` posterior fallan, no se guarda el perfil local, pero queda una imagen biometrica huerfana en `documentDirectory/face_photos/<id>/`; riesgo de privacidad, soporte y almacenamiento en dispositivos compartidos.
- [medium][non-blocking] `movil/package.json:40-46`: se agrego `typecheck`, pero no se pudo validar en esta revision y el arbol no tiene `movil/node_modules`. El build queda sin evidencia de `tsc --noEmit`; instalar dependencias en ambiente controlado y ejecutar `npm --prefix movil run typecheck` antes de liberar.
- [low][non-blocking] `movil/src/context/AppContext.tsx:124-130` y `148-154`: despues de subir la foto se hace un `GET /biometria/estado` secuencial adicional. Es correcto para fail-closed, pero en red lenta agrega otro timeout potencial de 30s al flujo de enrolamiento; conviene mostrar mensaje explicito de validacion con backend/reintento para operadores en campo.

Blocking findings:
- Ninguno identificado en el diff movil. No observe loop de navegacion inmediato entre login/enroll/tabs: el segundo efecto espera `isBiometricStatusLoading` y el enrolamiento exitoso actualiza `biometricStatus` antes de `router.replace('/(tabs)')`.

Required checks:
- Pendiente obligatorio: `npm --prefix movil run typecheck` tras restaurar `movil/node_modules` con el gestor bloqueado por el repo. No se ejecuto por restriccion de subagente y ausencia de dependencias locales.
- `movil/package.json` no define `lint` ni `test`; si el equipo agrega scripts, ejecutar `npm --prefix movil run lint` y `npm --prefix movil run test`.
- Validacion manual recomendada en Android fisico/Expo: login con usuario enrolado y storage local vacio debe ir a tabs; usuario no enrolado debe ir a enroll; backend caido durante `GET /estado` debe fallar cerrado con mensaje/reintento; logout/login del mismo usuario debe refrescar estado; cambiar estado biometrico en backend con app abierta no debe dejar gate obsoleto; permisos de camara denegados y captura con red lenta deben ser recuperables.
- AGENTS.md no declara una version Node concreta para movil; mantener alineado con el entorno Node 20 usado por el frontend Docker/proyecto y con los requisitos de Expo 55 antes de ejecutar el typecheck.

Offline/performance risks:
- Fail-closed esta aplicado, pero la recuperacion offline es debil por cache de fallo sin retry automatico/manual visible.
- No hay regresion relevante en listas ni pantallas media-heavy; el cambio afecta AuthGate, captura y llamadas de red.
- La ruta critica de enrolamiento ahora es: guardar foto local -> subir foto -> consultar estado. La secuencia protege la fuente de verdad, pero puede sentirse lenta en conectividad de campo.

Blocking reasons:
- Ninguno. Decision `approved_with_risks` condicionada a ejecutar typecheck y mitigar/aceptar el riesgo de cache/reintento del estado biometrico.
