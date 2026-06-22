# Informe ejecutivo de ciberseguridad del portal

Fecha: 2026-06-22  
Alcance: portal web, backend FastAPI, autenticacion, autorizacion RBAC, manejo de archivos, configuracion Docker/Nginx/PostgreSQL y evidencias de pruebas disponibles.

## 1. Resumen ejecutivo

El portal cuenta con una base de ciberseguridad relevante y aprovechable. La arquitectura separa frontend y backend, utiliza autenticacion basada en JWT, contrasenas protegidas con bcrypt, rate limiting en flujos de autenticacion, manifiesto RBAC para gestion de permisos, auditoria de acciones sensibles y pruebas automatizadas asociadas a autenticacion, tokens, rate limit y auditoria. Estos elementos demuestran que el sistema ya incorpora controles modernos y que existe una ruta clara para elevar su madurez de seguridad.

La resistencia general del portal frente a ataques se estima actualmente como **baja a media**. Esta calificacion no significa que el sistema carezca de protecciones, sino que los controles existentes deben aplicarse de forma mas uniforme sobre toda la superficie expuesta. El portal resiste razonablemente ataques basicos contra login gracias al cifrado de contrasenas, bloqueo/rate limit y auditoria. No obstante, para considerarlo robusto ante ataques externos, se recomienda reforzar especialmente la proteccion de rutas API, la aplicacion real de permisos en backend, la gestion de sesiones, el almacenamiento de tokens, el endurecimiento de archivos cargados y la configuracion de infraestructura.

Desde una perspectiva ejecutiva, el portal puede operar en ambientes internos controlados si cuenta con monitoreo, respaldo, control de red y seguimiento cercano. Para exposicion en Internet o redes no confiables, se recomienda ejecutar primero un plan de fortalecimiento. La prioridad debe ser convertir los controles ya existentes en una politica transversal: todo endpoint sensible autenticado, todo permiso validado en servidor, toda sesion revocable, todo archivo inspeccionado y toda configuracion productiva cerrada por defecto.

## 2. Fortalezas actuales

**Autenticacion moderna.** El sistema usa JWT y proteccion de contrasenas con bcrypt, lo cual reduce el riesgo de compromiso directo de credenciales almacenadas y aporta una base adecuada para control de sesiones.

**Rate limiting en autenticacion.** Existen controles para limitar intentos de login y reducir ataques de fuerza bruta o automatizacion contra cuentas de usuario.

**Modelo RBAC existente.** El portal cuenta con manifiesto central de permisos y autodescubrimiento de modulos, lo cual facilita administrar roles y escalar el control de acceso de forma ordenada.

**Auditoria de acciones sensibles.** Se identifican mecanismos de auditoria y redaccion de campos sensibles, utiles para trazabilidad, investigacion de incidentes y cumplimiento.

**Pruebas automatizadas de seguridad.** Hay pruebas relacionadas con autenticacion, refresh tokens, rate limit, MCP tokens, auditoria y controles de administracion. Esto permite prevenir regresiones si se integra de forma continua.

**Separacion por capas.** El stack FastAPI, SQLAlchemy async, PostgreSQL, React y Nginx permite aplicar controles por capa: cliente, API, base de datos, proxy e infraestructura.

**Ausencia de patrones XSS evidentes.** En la revision frontend no se observaron usos directos peligrosos como `dangerouslySetInnerHTML`, `innerHTML`, `eval` o `new Function`, lo cual reduce una fuente comun de vulnerabilidades.

## 3. Resistencia por tipo de ataque

| Tipo de ataque | Resistencia estimada | Comentario ejecutivo |
| --- | --- | --- |
| Fuerza bruta contra login | Media | Buen punto de partida por bcrypt, bloqueo y rate limit. |
| Robo de credenciales almacenadas | Media | bcrypt reduce impacto, sujeto a fortaleza de claves y secretos. |
| Acceso directo a API | Baja | Requiere politica global de autenticacion y permisos en backend. |
| Escalamiento de privilegios | Baja a media | RBAC existe, pero debe aplicarse consistentemente en servidor. |
| Robo/reutilizacion de token | Baja | Conviene retirar JWT de `localStorage` y evitar tokens en URL. |
| XSS | Media | No hay patrones obvios, pero el impacto seria alto si se roba el token. |
| CSRF | Media | El uso de Bearer token ayuda; si se migra a cookies se requiere SameSite/CSRF. |
| Carga maliciosa de archivos | Baja | Se requiere validacion fuerte de tipo, tamano, contenido y antivirus. |
| DoS por cargas/exportaciones | Baja a media | Rate limit existe en auth, pero debe extenderse a endpoints pesados. |
| Divulgacion de informacion | Baja a media | Se recomienda estandarizar errores genericos y logs con redaccion. |
| Seguridad HTTP/Nginx | Baja a media | Deben agregarse headers como CSP, HSTS, nosniff y frame-ancestors. |

## 4. Recomendaciones de fortalecimiento

1. **Autenticacion obligatoria por defecto.** Implementar una politica `deny-by-default` para `/api/v2`, donde toda ruta quede protegida salvo una allowlist publica explicita y documentada.
2. **RBAC aplicado en backend.** Asegurar que cada modulo y accion sensible valide permisos en el servidor, no solo en el menu o rutas del frontend.
3. **Prueba automatizada de cobertura.** Agregar un test que enumere OpenAPI y falle si una ruta sensible no tiene autenticacion/RBAC declarado.
4. **Sesion mas segura.** Migrar gradualmente a cookies `HttpOnly; Secure; SameSite` o, como minimo, reducir informacion sensible en `localStorage` y eliminar cualquier token enviado por query string.
5. **Revocacion efectiva.** Validar `jti`, usuario activo y sesion activa en cada solicitud para que logout, cambio de clave, desactivacion o cambio de permisos tengan efecto inmediato.
6. **Archivos endurecidos.** Definir politica comun de tamanos, extensiones permitidas, MIME real por magic bytes, sanitizacion de nombres, cuarentena, antivirus y bloqueo de macros o contenido activo.
7. **CORS controlado.** Reemplazar origenes amplios por una allowlist exacta de dominios HTTPS oficiales por ambiente.
8. **Headers de seguridad.** Configurar CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `frame-ancestors` en Nginx.
9. **Secretos y despliegue seguro.** Impedir arranque productivo con secretos por defecto, Redis sin password, JWT debil, base de datos publicada o credenciales hardcodeadas.
10. **Errores y datos sensibles.** Sustituir respuestas tecnicas como `str(e)` por mensajes genericos, manteniendo logs internos estructurados y con redaccion de PII/secrets.
11. **Rate limiting ampliado.** Extender controles a recuperacion de contrasena, setup, uploads, descargas, reportes, ERP y endpoints de alto costo.
12. **CI de seguridad.** Incorporar en pipeline las pruebas backend, frontend build/test, hooks de seguridad, auditoria y cobertura RBAC.

## 5. Conclusion

El portal tiene fortalezas claras y una base tecnica adecuada para alcanzar un buen nivel de ciberseguridad. Sus controles actuales protegen especialmente el acceso inicial y ofrecen trazabilidad, pero su resistencia global depende de aplicar esas defensas de manera uniforme en todo el backend, frontend e infraestructura. La recomendacion es tratar el estado actual como **apto para ambiente interno controlado con monitoreo**, y como **pendiente de fortalecimiento antes de exposicion externa**.

Con las recomendaciones anteriores, el portal puede evolucionar de una postura baja-media a una postura media-alta, especialmente si se priorizan autenticacion obligatoria, RBAC server-side, sesiones revocables, seguridad de archivos y configuracion productiva cerrada por defecto.
