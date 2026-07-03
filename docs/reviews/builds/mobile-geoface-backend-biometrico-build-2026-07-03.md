Mobile review: approved_with_risks

Findings:
- [medium] `modulo_autenticacion_facial_fork/src/services/faceApi.ts:65-70` restaura `@server_ip` sin migrar valores explícitos antiguos; y `faceApi.ts:42-44` solo agrega `:8000` cuando una IP no trae puerto. Dispositivos que ya guardaron `192.168.0.21:8001` seguirán apuntando al backend viejo hasta que el operador lo cambie manualmente, por lo que la corrección no cubre todas las instalaciones existentes.
- [medium] `modulo_autenticacion_facial_fork/src/screens/LoginScreen.tsx:81-97` prueba conexión llamando `setServerAddress(serverIp.trim())` antes de Guardar y no restaura el valor previo al fallar/cerrar el modal. Una prueba con IP errónea deja `API_BASE` mutado en memoria y puede romper login/verificación durante la ruta hasta reinicio o guardado correcto.
- [low] `modulo_autenticacion_facial_fork/src/services/faceApi.ts:46-50` duplica el path si el usuario pega una URL completa con slash final (`http://host:8000/api/v2/` -> `/api/v2/api/v2`). Riesgo de soporte bajo, pero frecuente al copiar/pegar URLs.
- [low] `modulo_autenticacion_facial_fork/src/services/faceApi.ts:22-27` deja IP LAN hardcodeada y `modulo_autenticacion_facial_fork/app.json:25` permite HTTP cleartext. Correcto para el piloto LAN, pero no para build productivo fuera de esa red; parametrizar con Expo/EAS env antes de producción.

Required checks:
- No ejecutados por alcance de revisión read-only/no build.
- `modulo_autenticacion_facial_fork/package.json` no define `lint` ni `test`; si se agregan scripts, ejecutar `npm run lint` y `npm run test` desde `modulo_autenticacion_facial_fork/`.
- Validación manual mínima: instalación limpia sin `@server_ip`; instalación con `@server_ip=192.168.0.21`; instalación con `@server_ip=192.168.0.21:8001`; guardar `192.168.40.163`; guardar `192.168.40.163:8000`; pegar URL con `/api/v2` y `/api/v2/`; probar health/login/enroll/verify en Android físico conectado a la LAN `192.168.40.0/24`.
- Confirmar en dispositivo que permisos de cámara/ubicación siguen concediéndose y que `VerifyScreen` sale de “Analizando rostro...” tanto en éxito, 401 biométrico, backend caído y timeout.

Offline/performance risks:
- `finally` en `VerifyScreen.tsx:178-180` y `app/enroll.tsx:53-55` corrige el bloqueo visual de `isCapturing` incluso con error/timeout.
- El timeout de 30s reduce bloqueo, pero en red negra el operador sigue sin acción hasta agotar timeout; considerar cancelar/reintentar visible si se usa en campo con conectividad inestable.
- Sin regresión relevante en listas o pantallas media-heavy; el cambio afecta configuración de red y captura de cámara.

Blocking reasons:
- Ninguno. La corrección principal está implementada, con riesgos residuales de persistencia de endpoint viejo y mutación temporal del servidor al probar conexión.
