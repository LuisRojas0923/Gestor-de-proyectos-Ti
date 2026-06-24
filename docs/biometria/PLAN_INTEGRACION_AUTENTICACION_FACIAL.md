# Plan de Integracion de Autenticacion Facial

## Objetivo

Integrar de forma segura el modulo de autenticacion facial importado desde `Autenticacion_Facial` dentro de Gestor de Proyectos TI, manteniendo el fork como referencia aislada y llevando la funcionalidad productiva al backend principal con contrato API, RBAC, pruebas y documentacion actualizados.

## Estado Inicial

- El codigo externo fue copiado en `modulo_autenticacion_facial_fork/` como modulo aislado.
- La copia excluye historial Git, configuraciones de IDE, agentes, `graphify-out`, dependencias instaladas y archivos `.env` reales.
- El fork contiene una app Expo/React Native y un servicio Python con FastAPI, DeepFace y PostgreSQL.
- El analisis inicial detecto divergencias criticas entre cliente, backend, contrato API y documentacion.

## Principios De Integracion

- No conectar el fork directamente a produccion.
- Usar `backend_v2/` como punto oficial de integracion backend.
- Mantener arquitectura router -> service -> model/repository.
- Usar nombres de tablas, campos, permisos y mensajes de dominio en espanol.
- Derivar identidad del usuario desde JWT/RBAC, nunca desde `user_id` enviado por body o query param.
- Tratar fotos y embeddings faciales como datos biometricos sensibles.

## Fase 1: Contrato API Oficial

Definir una unica fuente de verdad para el contrato HTTP, preferiblemente OpenAPI generado desde FastAPI.

Endpoints objetivo:

- `POST /api/v2/biometria/enrolar`
- `POST /api/v2/biometria/asistencia`
- `GET /api/v2/biometria/asistencias`
- `GET /api/v2/biometria/health`

Criterios:

- El cliente no debe enviar `user_id` para operaciones propias.
- El backend debe resolver usuario actual desde el token.
- Las respuestas deben incluir codigos de error estables y mensajes seguros.
- El contrato debe especificar limites de tamano para imagenes base64.

## Fase 2: Backend Seguro En `backend_v2`

Crear el modulo de biometria dentro del backend principal.

Componentes esperados:

- Router de biometria.
- Servicio de enrolamiento facial.
- Servicio de verificacion facial.
- Servicio de asistencia.
- Modelos y migraciones para datos biometricos y registros de asistencia.

Tablas candidatas:

- `embeddings_faciales`
- `registros_asistencia_biometrica`
- `zonas_trabajo_biometria`

Reglas:

- No reutilizar auth propia del fork.
- No usar `create_all` en runtime productivo.
- No usar SQLModel sincronico del fork dentro de `backend_v2`.
- Registrar permisos en `backend_v2/app/core/rbac_manifest.py`.

## Fase 3: Seguridad Y RBAC

Permisos propuestos:

- `biometria.enrolar_propio`
- `biometria.verificar_propio`
- `biometria.ver_asistencias_propias`
- `biometria.ver_asistencias_todas`
- `biometria.administrar_zonas`
- `biometria.administrar_embeddings`

Controles obligatorios:

- JWT requerido para enrolamiento, verificacion e historial.
- RBAC server-side para acciones administrativas.
- HTTPS obligatorio en produccion.
- CORS restringido por ambiente.
- Rate limit en endpoints biometricos.
- Limite de tamano y formato de imagen.
- Logs sin exponer imagenes, embeddings, tokens ni errores internos completos al cliente.
- Politica de retencion para fotos y embeddings.

## Fase 4: Migracion De Logica Biometrica

Reutilizar del fork solo piezas tecnicas aisladas:

- Decodificacion segura de base64.
- Normalizacion L2 del embedding.
- Invocacion controlada de `DeepFace.represent`.
- Calculo de distancia coseno.
- Anti-spoofing.

Descartar del fork:

- Endpoints `/v1/*`.
- Login y registro propios.
- Validaciones por `admin_id` query param.
- Creacion automatica de usuarios o zonas desde verificacion.
- CORS abierto.
- Defaults inseguros de base de datos.

## Fase 5: Adaptacion De La App Movil

Mantener la app Expo en `modulo_autenticacion_facial_fork/` hasta decidir si queda como producto movil separado.

Cambios requeridos:

- Corregir `src/services/faceApi.ts` para consumir el contrato oficial.
- Enviar `Authorization: Bearer <token>` en operaciones protegidas.
- Corregir `VerifyScreen.tsx` para usar `serverResult.verified`.
- No registrar asistencia local si el backend responde `verified: false`.
- Bloquear enrolamiento si el servidor no guarda correctamente el embedding.
- Evitar tracking GPS antes de autenticacion.
- Bloquear HTTP en builds productivos.

## Fase 6: Integracion Con Frontend Web

Si se requiere administracion desde el frontend principal, crear pantallas web en `frontend/` para:

- Consultar asistencias biometricas.
- Administrar zonas de trabajo biometricas.
- Consultar estado de enrolamiento de usuarios.
- Auditar eventos de verificacion.

Reglas:

- No mezclar Expo dentro de `frontend/` Vite.
- Usar componentes del design system existente.
- Respetar permisos RBAC desde backend y UI.

## Fase 7: Pruebas Obligatorias

Backend:

- Enrolamiento exitoso.
- Verificacion exitosa.
- Verificacion fallida.
- Imagen invalida.
- Rostro no detectado.
- Spoofing detectado.
- Usuario sin embedding.
- Usuario sin permiso.
- Admin consulta asistencias globales.
- Usuario normal no consulta asistencias globales.
- Rate limit en endpoints biometricos.

Frontend/movil:

- `verifyFace()` respeta `verified=false`.
- Manejo de timeout.
- Manejo de error 401/403/422.
- Geocerca bloquea verificacion fuera de zona.
- Enrolamiento fallido no marca perfil como listo.

Estrategia:

- Mockear `DeepFace.represent` en pruebas normales.
- Reservar pruebas reales con modelo para pipeline manual o entorno dedicado.

## Fase 8: Documentacion

Actualizar o crear:

- `docs/ARQUITECTURA.md`
- `docs/ESQUEMA_BASE_DATOS.md`
- `docs/GUIA_DESARROLLO.md`
- Contrato OpenAPI o documento equivalente de biometria.
- ADR si se decide separar el servicio DeepFace del backend principal.

## Riesgos Principales

- Suplantacion si se permite enrolar por `user_id` arbitrario.
- Fuga de biometria si se mantiene HTTP o almacenamiento plano.
- Falsos positivos de asistencia si el cliente ignora `verified=false`.
- Saturacion del backend por inferencia DeepFace concurrente.
- Desalineacion entre app movil, backend principal y documentacion.

## Orden Recomendado De Trabajo

1. Contrato API oficial.
2. Diseno DB y RBAC.
3. Backend con pruebas TDD.
4. Adaptacion de la app movil.
5. Panel administrativo web, si aplica.
6. Hardening de seguridad.
7. Documentacion final.

## Primer Incremento Propuesto

Implementar en `backend_v2` los endpoints `POST /api/v2/biometria/enrolar` y `POST /api/v2/biometria/asistencia` con pruebas automatizadas y `DeepFace.represent` mockeado. Este incremento debe incluir RBAC minimo, validacion de imagen y respuesta correcta para verificacion fallida.
