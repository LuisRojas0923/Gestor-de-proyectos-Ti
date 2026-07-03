Mobile review: approved_with_risks

Findings:
- [medium] El plan debe cambiar el default efectivo de GeoFace a backend `:8000`: `DEFAULT_SERVER_PORT`, `getServerHost()` y la inferencia de puerto en `setServerAddress()` para entradas sin puerto deben quedar alineados. No basta con cambiar el placeholder del modal.
- [medium] `handleTestConnection()` actualmente muta `API_BASE` antes de probar y no restaura si falla o si el usuario cancela. El plan debe exigir probar una URL candidata sin alterar la configuración activa/persistida hasta que el usuario pulse Guardar, o restaurar el valor previo en fallos/cancelación.
- [low] Hay usuarios con `@server_ip` persistido. Las entradas sin puerto pasarán a `:8000`, pero entradas explícitas antiguas con `:8001` seguirán fallando. Requisito recomendado: opción visible de “restablecer servidor por defecto” y mensaje claro cuando el health check falle por puerto viejo.
- [low] Para producción, no dejar HTTP/cleartext como default: `app.json` tiene `android.usesCleartextTraffic=true` y el plan debe separar configuración dev/LAN de builds productivos con HTTPS vía Expo config/EAS/env.

Required checks:
- No ejecutados por alcance read-only.
- En `modulo_autenticacion_facial_fork/package.json` no hay scripts `lint` ni `test`; si se agregan en el plan, ejecutar `npm run lint` y `npm run test` antes de cerrar.
- Validación mínima manual: app limpia sin `@server_ip`, app con `@server_ip=192.168.0.21`, app con `@server_ip=192.168.0.21:8001`, guardar `192.168.0.21`, guardar `192.168.0.21:8000`, guardar URL con `/api/v2`, probar health contra `/api/v2/health` en backend `:8000`, login posterior y re-apertura de app confirmando persistencia.

Offline/performance risks:
- Riesgo principal de campo: una prueba fallida puede dejar el cliente apuntando al servidor incorrecto durante la ruta si no se corrige la mutación temporal de `API_BASE`.
- El flujo debe mostrar error accionable de baja conectividad/servidor caído y no bloquear indefinidamente; el health check de 5s es razonable.
- Sin impacto esperado en listas/media; la corrección es de configuración de red.

Blocking reasons:
- Ninguno para aprobar el plan con riesgos. Bloquearía una implementación que solo cambie el puerto constante sin cubrir persistencia, prueba de conexión no destructiva y separación dev/prod HTTP.
