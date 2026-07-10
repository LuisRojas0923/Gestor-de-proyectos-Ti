# Plan de aprobacion e integracion de los PR #10 y #11

**Fecha:** 2026-07-10
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti
**Estado inicial:** PR #10 aprobable con correcciones; PR #11 bloqueado

---

## 1. Objetivo

Aprobar e integrar de forma secuencial los PR #10 y #11 en `main`, con revision tecnica por dominio, pruebas automatizadas y manuales antes de cada merge, y una regresion completa sobre el `main` resultante.

## 2. No-objetivos

- No aprobar por excepcion cambios con fallos de compilacion, seguridad o pruebas.
- No ejecutar pruebas contra bases de datos de produccion ni usar credenciales reales.
- No hacer `push`, aprobar o fusionar PR sin autorizacion explicita.
- No mezclar el commit local de `main` que aun no esta en `origin/main` con los merges remotos.

## 3. Alcance actual

### PR #10

- Rama: `NOVEDADES_NOMINA_V2`.
- Cambia 2 componentes de `frontend/src/pages/OrganizationalHierarchy/`.
- Es una continuacion pequena del PR #9 ya integrado.
- No tiene conflictos, pero requiere una aprobacion.

### PR #11

- Rama: `indicadores_auditoria_del_sistema`.
- Cambia 58 archivos en `backend_v2/`, `frontend/` y `testing/`.
- Tiene conflictos con `main` y requiere una aprobacion.
- Mezcla indicadores de auditoria con auth, inventario, viaticos, gastos, scripts diagnosticos, artefactos compilados y pruebas.
- En su estado actual contiene bloqueos de compilacion, seguridad, alcance y cobertura.

## 4. Estrategia de integracion

El orden sera **PR #10 primero y PR #11 despues**. No comparten archivos directamente, pero el PR #11 debe actualizarse contra el `main` resultante para que su revision y sus pruebas se ejecuten sobre la base real.

Cada PR debe cumplir esta secuencia sin omitir pasos:

1. Sincronizar la rama con el ultimo `origin/main`.
2. Revisar el diff final y comprobar que no incluya cambios accidentales.
3. Corregir bloqueos y agregar las pruebas faltantes.
4. Ejecutar validaciones automatizadas y pruebas manuales focalizadas.
5. Obtener revision final de los dominios afectados.
6. Obtener al menos una aprobacion humana en GitHub.
7. Integrar mediante PR, nunca mediante push directo a `main`.
8. Actualizar `main` y repetir la regresion posterior al merge.
9. Registrar SHA, comandos, resultados, skips y evidencia en un reporte de build.

## 5. Fase A: PR #10

### 5.1 Correcciones y criterios funcionales

1. Limpiar los errores reportados por `git diff --check`.
2. Revisar si `cargo` debe formar parte de `HierarchyUser`; evitar casts que oculten un contrato incorrecto.
3. Confirmar como requisito funcional el limite de 50 resultados del autocompletado.
4. Agregar pruebas para 0, 50 y mas de 50 resultados, busqueda por nombre/cedula, seleccion, nodo vacante, identificadores y propiedades nulas.

### 5.2 Validacion previa al merge

Desde la rama actualizada del PR:

```powershell
git diff --check origin/main...HEAD
Set-Location frontend
npm run lint
npm run test -- --run
npm run build
```

Prueba manual en 320, 375, 768, 1024 y 1440 px:

- Buscar y seleccionar usuarios.
- Verificar usuarios sin cargo o rol.
- Expandir y contraer el organigrama.
- Confirmar que no hay errores en consola ni regresiones visuales.
- Verificar tema claro/oscuro, teclado y zoom al 200 %.

### 5.3 Puerta de aprobacion

- `frontend-reviewer`: sin hallazgos bloqueantes.
- `docs-tests-reviewer`: pruebas y evidencia completas.
- Una aprobacion humana registrada en GitHub.
- `mergeable=MERGEABLE` y `mergeStateStatus` sin bloqueo.

### 5.4 Validacion posterior al merge

Actualizar una copia limpia de `main` y repetir `lint`, Vitest y `build`. Ejecutar un smoke del organigrama antes de iniciar la actualizacion del PR #11.

## 6. Fase B: saneamiento del PR #11

El PR #11 no se aprueba hasta completar todos los puntos siguientes.

### 6.1 Actualizacion y alcance

1. Actualizar la rama sobre el `main` posterior al PR #10 y resolver conflictos conservando el comportamiento vigente de `main`.
2. Revisar tanto `origin/main...HEAD` como `origin/main..HEAD` para detectar borrados o reintroducciones accidentales.
3. Separar o retirar cambios no indispensables para indicadores de auditoria:
   - Scripts diagnosticos y `clear_logs.py`.
   - Credenciales embebidas y accesos sincronos a PostgreSQL.
   - Tests duplicados bajo `backend_v2/`.
   - `frontend/dist/index.html` incompleto.
   - Cambios independientes de lineas corporativas, reservas, gastos, inventario, viaticos, auth y configuracion.
4. Si los cambios independientes deben conservarse, abrir PR separados y probarlos por dominio. El PR #11 solo continuara cuando su diff sea revisable y coherente con su titulo.

### 6.2 Bloqueos de seguridad y backend

1. Derivar el actor de auditoria exclusivamente del principal autenticado; nunca confiar en `usuario_id`, nombre o rol enviados en el body.
2. Proteger REST y WebSocket con autenticacion y permiso efectivo de `auditoria_sistema`.
3. Validar origen, limitar conexiones y definir el comportamiento WebSocket con multiples workers.
4. Restaurar una sintaxis valida para `rate_limit_login` y probar respuestas 429.
5. Retirar cualquier mecanismo que borre trazas de auditoria o permita usar una DB no-test durante pruebas.
6. Aplicar auth/RBAC a inventario y mover logica de negocio de routers a servicios.
7. Hacer idempotente y segura ante concurrencia la auditoria de descargas de viaticos.
8. Limitar rangos temporales, eliminar patrones N+1 y definir un presupuesto de consultas.
9. Redactar PII y devolver errores 500 genericos, sin `str(e)` ni datos internos.

### 6.3 Bloqueos frontend

1. Corregir el contrato entre `AuditoriaIndicadores/index.tsx` y `useAuditoriaStats` para que TypeScript compile.
2. Eliminar `any` y casts inseguros en metadatos y respuestas API.
3. Conservar filtros, ordenamiento e indicador de filtros de AuditoriaSistema.
4. Propagar correctamente estados de carga, vacio y error.
5. Centralizar endpoints HTTP/WS en la configuracion API.
6. Cancelar timers y reconexiones WebSocket al desmontar componentes.
7. Cumplir el design system, tokens de tema, semantica de teclado y accesibilidad de modales.
8. Resolver el comportamiento responsive de tablas densas y controles de fecha.

### 6.4 Pruebas obligatorias

Backend:

- RBAC 401/403/200 para REST y WebSocket.
- Token ausente, invalido, revocado o sin permiso.
- Rechazo de actor o rol falsificado en el body.
- Rate limit de login y recuperacion de contrasena.
- Estadisticas con fechas, zonas horarias, rangos invalidos, datos vacios y errores DB.
- Concurrencia de descargas: multiples solicitudes producen exactamente un evento valido.
- Inventario autenticado, autorizado y con evento unico.
- Rollback transaccional y ausencia de detalles internos.
- Presupuesto de consultas y comportamiento con volumen representativo.

Frontend:

- Carga, vacio, error y cambio de periodo.
- Filtros, ordenamiento, paginacion y severidad.
- Reconexiones WebSocket y cleanup con timers falsos.
- Modales con foco, Escape, restauracion de foco y etiquetas accesibles.
- Interacciones por teclado y vista movil.

Documentacion y trazabilidad:

- Mantener una sola copia canonica de cada test en `testing/backend/`.
- Registrar las suites nuevas en `testing/CATALOGO_PRUEBAS.md`.
- Documentar endpoints, WebSocket, deduplicacion, retencion y tratamiento de PII.
- Actualizar `docs/ESQUEMA_BASE_DATOS.md` solo si la correccion agrega indices, constraints o cambios fisicos.

## 7. Validacion completa del PR #11

Las pruebas backend se ejecutaran en infraestructura Docker y con DB efimera de pruebas. Comandos base:

```powershell
git diff --check origin/main...HEAD
docker compose up --build -d
docker compose exec backend python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v
docker compose exec backend python -m pytest testing/backend/ -v
Set-Location frontend
npm run lint
npm run test -- --run
npm run build
```

Antes de usar los comandos Docker se confirmara el nombre real del servicio backend del compose vigente. No se aceptaran tests que dependan de una base viva o que hagan fallback a `.env` real.

Prueba manual integrada:

- Login valido, invalido y limitado.
- Acceso permitido y denegado al modulo de auditoria.
- Dashboard con periodos y datasets vacios/voluminosos.
- Actualizacion en tiempo real y reconexion controlada.
- Descargas de viaticos e inventario con evento de auditoria correcto.
- Auditoria general sin regresion de filtros, orden y detalle.
- Responsive, temas, teclado y zoom al 200 %.

## 8. Puerta de aprobacion del PR #11

El PR solo puede aprobarse cuando:

- No tenga conflictos con el `main` vigente.
- `git diff --check`, backend, frontend, seguridad y pruebas esten en verde.
- No contenga secretos, scripts destructivos ni artefactos generados inconsistentes.
- Exista evidencia de pruebas sobre el SHA exacto que se aprobara.
- `backend-reviewer`, `frontend-reviewer`, `security-rbac-reviewer` y `docs-tests-reviewer` no reporten bloqueos.
- Obtenga al menos una aprobacion humana en GitHub.

Si se sube un commit despues de la evidencia, se repiten las revisiones y pruebas afectadas antes del merge.

## 9. Regresion final en `main`

Despues del segundo merge:

1. Obtener una copia limpia del `main` remoto y registrar su SHA.
2. Levantar la aplicacion completa con `docker compose up --build -d`.
3. Verificar health checks y logs sin excepciones nuevas.
4. Ejecutar toda la suite backend de `testing/backend/`.
5. Ejecutar lint, Vitest y build frontend.
6. Ejecutar el smoke integrado de organigrama, auth, auditoria, inventario y viaticos.
7. Registrar resultados y enlaces a ambos PR en `docs/reviews/builds/` y en la bitacora.
8. Cerrar las ramas solo despues de confirmar el resultado estable.

## 10. Contingencia

- Si una validacion pre-merge falla, no se aprueba ni se fusiona el PR.
- Si falla la regresion posterior al PR #10, se corrige o revierte ese merge antes de actualizar el PR #11.
- Si falla la regresion posterior al PR #11, se detiene el despliegue y se crea un PR de revert del merge; no se usa `reset --hard` ni push forzado.
- Si hubiera cambios de esquema, se exige antes del merge un procedimiento de migracion y rollback probado. Actualmente no se observa un cambio fisico documentado.

## 11. Matriz de subagentes

| Subagente | PR #10 | PR #11 | Resultado inicial |
|---|---:|---:|---|
| `scope-reviewer` | Si | Si | #10 aprobable; #11 bloqueado |
| `frontend-reviewer` | Si | Si | #10 con riesgos; #11 bloqueado |
| `backend-reviewer` | No | Si | Bloqueado |
| `security-rbac-reviewer` | No | Si | Bloqueado |
| `docs-tests-reviewer` | Si | Si | Bloqueado por cobertura/evidencia |
| `mobile-reviewer` | No | No | Fuera de alcance |

## 12. Decision

- **PR #10:** continuar despues de correcciones, pruebas y aprobacion.
- **PR #11:** no aprobar ni integrar en su estado actual; sanear, reducir alcance, probar y repetir todas las revisiones.
- **Plan general:** aprobado para ejecucion secuencial, sujeto a autorizacion expresa para operaciones remotas.
