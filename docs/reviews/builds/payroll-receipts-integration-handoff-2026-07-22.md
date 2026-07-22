# Entrega para validacion - Integracion de desprendibles de pago

**Fecha:** 2026-07-22  
**Build:** Integracion portal -> API interna de desprendibles  
**Estado:** pendiente de revision, pruebas integrales y aprobacion  
**Proyecto:** Gestor-de-proyectos-Ti  
**Modo requerido para el siguiente agente:** revision y validacion; no desplegar

---

## 1. Proposito

Este documento entrega al agente responsable una implementacion local no aprobada para listar y
descargar desprendibles de pago desde Gestion Humana. El navegador se autentica contra el portal;
el backend del portal obtiene `usuario.cedula`, genera una asercion HMAC de corta duracion y llama
al servicio interno de PDFs.

Este documento no autoriza despliegues, sincronizaciones contra bases reales, commits ni push.
La aprobacion debe ocurrir despues de completar la matriz de pruebas y documentar sus evidencias.

Contrato interno esperado:

```text
GET /v1/payroll-receipts
GET /v1/payroll-receipts/{document_id}/download
```

El servicio fuente esta implementado en el repositorio `solid-servidor-sync`. Su contrato exige:

- `Authorization: Bearer <PAYROLL_PORTAL_API_TOKEN>`.
- `X-Employee-Cedula` obtenido de la sesion del portal.
- `X-Employee-Timestamp` Unix vigente por un maximo de 60 segundos.
- `X-Employee-Signature` como HMAC-SHA256 de `cedula + "\n" + timestamp`.
- `PAYROLL_PORTAL_API_TOKEN`, `PAYROLL_ASSERTION_SECRET` y el token administrativo distintos.

## 2. Estado del arbol de trabajo

El repositorio ya contenia numerosos cambios sin commit antes de esta integracion. No usar
`git reset --hard`, `git checkout -- .`, restauraciones globales ni limpieza indiscriminada.
Revisar cada archivo con `git diff -- <ruta>` y preservar trabajo ajeno.

No existe commit ni push de esta integracion. `frontend/dist/index.html` ya estaba modificado y
fue regenerado nuevamente al ejecutar `npm run build`; debe revisarse antes de decidir si forma
parte de la entrega.

## 3. Archivos de la integracion

Archivos nuevos:

- `backend_v2/app/api/payroll_receipts.py`
- `backend_v2/app/services/payroll_receipts_client.py`
- `frontend/src/pages/ServicePortal/pages/GestionHumana/DesprendiblesPagoView.tsx`
- `frontend/src/services/PayrollReceiptService.ts`
- `frontend/src/services/PayrollReceiptService.test.ts`
- `testing/backend/test_payroll_receipts.py`

Archivos modificados para integrar la funcionalidad:

- `.env.example`
- `backend_v2/app/core/config.py`
- `backend_v2/app/main.py`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docker-compose.Pruebas3.yml`
- `frontend/src/config/api.ts`
- `frontend/src/pages/ServicePortal/pages/GestionHumana/index.tsx`
- `frontend/dist/index.html` (salida generada)

`backend_v2/app/core/config.py`, los tres Compose y `frontend/src/config/api.ts` ya estaban
modificados antes de esta integracion. Revisar solamente las adiciones `PAYROLL_*` y las rutas de
desprendibles; no atribuir ni revertir el resto del diff.

## 4. Comportamiento implementado

- El portal publica `GET /api/v2/desprendibles-pago`.
- El portal publica `GET /api/v2/desprendibles-pago/{document_id}/download`.
- Ambos endpoints dependen de `obtener_usuario_actual_db`.
- La cedula no forma parte del query, body ni ruta enviados por el navegador.
- El cliente interno firma `usuario.cedula` con HMAC-SHA256.
- La lista valida el esquema recibido y comprueba que `total == len(items)`.
- La descarga valida identificadores SHA-256, tipo `application/pdf` y limite declarado de 50 MB.
- El PDF se transmite con streaming y cierre en una tarea de background.
- Las respuestas del portal usan `private, no-store` y `Pragma: no-cache`.
- Los errores internos de autenticacion se sanejan como indisponibilidad del servicio.
- La interfaz reemplaza el placeholder de desprendibles y contempla carga, vacio, error, retry,
  listado y descarga.
- El frontend solo envia su JWT del portal; no contiene el token interno ni el secreto HMAC.

Variables agregadas:

```text
PAYROLL_API_URL
PAYROLL_PORTAL_API_TOKEN
PAYROLL_ASSERTION_SECRET
PAYROLL_API_TIMEOUT_SECONDS
```

No registrar valores reales de estas variables en pruebas, reportes, capturas ni Git. Los dos
secretos deben ser aleatorios, distintos y tener al menos 32 caracteres.

## 5. Validaciones ya ejecutadas

Estas ejecuciones sirven como referencia, no reemplazan la validacion independiente:

| Comando | Resultado observado |
|---|---|
| `python -m pytest testing/backend/test_payroll_receipts.py -q` | PASS: 4 pruebas, 2 warnings preexistentes, 35.60 s |
| `python -m compileall -q backend_v2/app/api/payroll_receipts.py backend_v2/app/services/payroll_receipts_client.py backend_v2/app/core/config.py backend_v2/app/main.py testing/backend/test_payroll_receipts.py` | PASS |
| `cd frontend && npm run test -- --run src/services/PayrollReceiptService.test.ts` | PASS: 2 pruebas |
| `cd frontend && npx eslint src/services/PayrollReceiptService.ts src/services/PayrollReceiptService.test.ts src/pages/ServicePortal/pages/GestionHumana/DesprendiblesPagoView.tsx src/pages/ServicePortal/pages/GestionHumana/index.tsx src/config/api.ts` | PASS |
| `cd frontend && npm run build` | PASS; regenero `frontend/dist/index.html` |
| `git diff --check` | Sin errores de whitespace; solo advertencias LF/CRLF |

Linea base externa informada por `solid-servidor-sync`:

- 45 pruebas focales de indice/API PDF aprobadas.
- `compileall` correcto.
- Ruff focalizado en archivos payroll sin hallazgos.

La comunicacion real entre ambos repositorios no fue probada.

## 6. Puntos pendientes que pueden bloquear

El agente debe resolver o justificar expresamente estos puntos antes de aprobar:

1. **RBAC:** el frontend esta dentro del modulo protegido `gestion_humana`, pero los endpoints
   backend nuevos exigen autenticacion y no comprueban explicitamente el permiso del modulo.
   Confirmar la politica requerida y agregar una dependencia RBAC si corresponde.
2. **Auditoria de fallos:** `asignar_descarga_segura` se ejecuta despues de abrir exitosamente el
   stream. Confirmar que intentos fallidos quedan auditados sin PII, porque el criterio funcional
   exige auditar descargas exitosas y fallidas.
3. **Header de descarga:** el proxy reenvia `Content-Disposition` del servicio interno. Validar o
   sanear el nombre antes de propagarlo, aun cuando la fuente sea interna.
4. **Limite sin `Content-Length`:** el limite de 50 MB se valida cuando el upstream declara el
   header. Confirmar si se debe contar bytes durante streaming cuando el header falta.
5. **Estado visible:** el plan original pide mostrar el estado del documento, pero el contrato
   actual solo lista documentos habilitados y no devuelve un campo de estado. Confirmar si la
   condicion "disponible" es suficiente o si el contrato debe ampliarse.
6. **Salida compilada:** determinar si `frontend/dist/index.html` se versiona y como preservar su
   cambio previo. No restaurarlo globalmente.
7. **Revision independiente:** las revisiones finales de backend, frontend y seguridad no se
   completaron. Ejecutar los revisores exigidos por `AGENTS.md` y persistir sus resultados.

## 7. Matriz minima de pruebas backend

Agregar pruebas antes de aprobar:

| Caso | Resultado esperado |
|---|---|
| Solicitud sin JWT al portal | 401; no se llama al servicio interno |
| JWT valido | La cedula usada es exclusivamente `usuario.cedula` |
| Cedula enviada por query/body | No cambia la identidad efectiva; idealmente no existe parametro aceptado |
| Usuario sin cedula valida | 403 saneado; no se llama al upstream |
| Configuracion vacia, corta, placeholder o secretos iguales | 503 sin revelar configuracion |
| Timeout, DNS, conexion rechazada | 503 saneado y sin stack trace al cliente |
| Upstream 401/403 | 503 saneado; no se propaga detalle interno |
| Upstream 404 para ID inexistente | 404 generico |
| Upstream 404 para documento ajeno | Mismo 404 generico |
| JSON invalido o `total` inconsistente | 502 controlado |
| `document_id` invalido/path traversal | 404 sin solicitud peligrosa |
| Respuesta no PDF | 502 y cierre de cliente/stream |
| `Content-Length` mayor de 50 MB | 502 y cierre de cliente/stream |
| Descarga correcta | Bytes intactos, tipo PDF y headers `no-store`/`nosniff` |
| Cliente desconectado durante streaming | Se cierran respuesta y `AsyncClient` |
| Descarga exitosa | Evento de auditoria sin cedula, salario, ruta ni nombre interno |
| Descarga fallida | Evento de auditoria seguro conforme a la politica aprobada |
| Usuario sin permiso `gestion_humana` | 403 si la politica RBAC exige el permiso backend |

Pruebas de regresion sugeridas:

```powershell
python -m pytest testing/backend/test_payroll_receipts.py -q
python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q
python -m compileall -q backend_v2/app testing/backend/test_payroll_receipts.py
```

Usar secretos sinteticos en fixtures y verificar que no aparezcan en salida capturada.

## 8. Matriz minima de pruebas frontend

| Caso | Resultado esperado |
|---|---|
| Carga inicial | Indicador accesible y una sola consulta |
| Lista vacia | Mensaje de ausencia sin error |
| Error de red/503 | Mensaje saneado y boton de reintento |
| Retry | Actualiza la lista sin duplicados |
| Q1 y Q2 | Etiquetas de mes/quincena correctas |
| Periodo sin fechas | Fallback legible |
| Descarga | JWT presente; no se envia cedula, token interno ni secreto HMAC |
| JWT vencido | Un solo refresh y un solo reintento |
| Descarga exitosa | Click de enlace y `URL.revokeObjectURL` |
| Descarga fallida | No crea URL temporal y muestra notificacion |
| Descargas simultaneas | Botones quedan en un estado coherente |
| Navegacion volver | Regresa a la seleccion de Gestion Humana |
| Mobile | Lista, botones y encabezado utilizables sin overflow horizontal |
| Teclado/lector de pantalla | Botones accesibles, errores anunciados y foco visible |

Comandos sugeridos:

```powershell
npm run test -- --run src/services/PayrollReceiptService.test.ts
npm run test -- --run src/pages/ServicePortal/pages/GestionHumana
npx eslint src/services/PayrollReceiptService.ts src/services/PayrollReceiptService.test.ts src/pages/ServicePortal/pages/GestionHumana/DesprendiblesPagoView.tsx src/pages/ServicePortal/pages/GestionHumana/index.tsx src/config/api.ts
npm run build
```

Si se ejecuta el build, registrar previamente el diff de `frontend/dist/index.html` para no perder
su modificacion anterior.

## 9. Prueba integral controlada

Realizar solo en un entorno no productivo o con autorizacion operacional explicita:

1. Configurar URL y secretos sinteticos/coordinados en ambos servicios sin imprimirlos.
2. Iniciar el servicio de PDFs con indice habilitado y datos de prueba no sensibles.
3. Iniciar el backend y frontend del portal.
4. Autenticar dos usuarios de prueba con cedulas distintas.
5. Confirmar que cada usuario lista solo sus documentos.
6. Descargar un documento propio y comparar SHA-256 con el archivo de prueba.
7. Intentar descargar el ID del otro usuario y confirmar el mismo 404 usado para un ID inexistente.
8. Confirmar headers de cache, tipo de contenido y nombre de descarga.
9. Interrumpir una descarga para comprobar cierre de recursos.
10. Revisar logs y auditoria: no deben contener cedulas, nombres, rutas, contenido salarial,
    tokens ni firmas HMAC.

No invocar `POST /sync`, `POST /sync/ot` ni `POST /sync/catalogo` durante esta validacion: esos
endpoints recargan tablas del ERP y estan fuera del alcance.

## 10. Evidencia que debe dejar el agente

Actualizar este documento o crear el reporte final en `docs/reviews/builds/` usando
`docs/reviews/templates/build_review.md`. Registrar:

- Commit/base exactos revisados y lista de archivos.
- Subagentes ejecutados: `scope-reviewer`, `backend-reviewer`, `frontend-reviewer`,
  `docs-tests-reviewer` y `security-rbac-reviewer` segun `AGENTS.md`.
- Comandos exactos, duracion, cantidad de pruebas y resultado PASS/FAIL.
- Fallos encontrados, correcciones realizadas y pruebas de regresion agregadas.
- Evidencia E2E sanitizada, incluyendo estados HTTP y hashes de fixtures, nunca PII.
- Decision RBAC y evidencia de auditoria exitosa/fallida.
- Decision sobre `frontend/dist/index.html`.
- Riesgos residuales y rollback probado.
- Decision final: `aprobado`, `aprobado_con_riesgos` o `bloqueado`.

## 11. Criterios de aprobacion

- [ ] No hay hallazgos criticos o altos abiertos.
- [ ] La identidad siempre proviene de la sesion autenticada.
- [ ] Propiedad cruzada e ID inexistente producen el mismo 404.
- [ ] El frontend no contiene ni transmite secretos internos o cedulas arbitrarias.
- [ ] Lista y descarga usan headers anti-cache.
- [ ] Streams y clientes HTTP cierran en exito, error y desconexion.
- [ ] Auditoria exitosa y fallida cumple la politica sin PII.
- [ ] RBAC fue probado conforme a una decision documentada.
- [ ] Pruebas backend, frontend, lint, build y regresiones estan verdes.
- [ ] La integracion E2E controlada fue documentada.
- [ ] Existe procedimiento de rollback validado.

Hasta completar estas condiciones, la integracion debe permanecer **bloqueada para despliegue**.
