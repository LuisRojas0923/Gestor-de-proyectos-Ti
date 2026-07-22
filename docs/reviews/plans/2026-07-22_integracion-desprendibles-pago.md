# Revision de Plan: Integracion de desprendibles de pago

**Fecha:** 2026-07-22
**Plan:** Despliegue del indice PDF e integracion del portal de empleados
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti
**Handoff:** `docs/reviews/builds/payroll-receipts-integration-handoff-2026-07-22.md`
**Build externo:** `solid-servidor-sync/docs/phases/payroll-pdf-index-build.md`

---

## 1. Objetivo

Dejar operativa y validada la consulta de desprendibles de pago desde Gestion Humana. Cada
empleado autenticado debe listar y descargar exclusivamente sus propios PDF, usando su cedula de
sesion y sin exponer al navegador credenciales de la API interna.

La validacion usa este escenario:

| Componente | Ubicacion |
|---|---|
| Portal frontend y backend | Entorno local de `Gestor-de-proyectos-Ti` |
| API e indice PDF | `http://192.168.0.21:8099` |
| Runtime del servicio | `\\192.168.0.21\c$\ERP\Sincronizacion OT\python` |
| Codigo fuente del servicio | `C:\Users\amejoramiento6\Desktop\solid-servidor-sync` |
| PDF | `C:\PDFNOMINA` del servidor |
| Catalogo de empleados | PostgreSQL `solid`, consultado en transaccion de solo lectura |
| Indice | `var\pdf-sync\payroll-index.sqlite3` del servidor |
| Prueba de propiedad | Dos empleados reales expresamente autorizados |

Observacion del 2026-07-22: el OpenAPI activo de `192.168.0.21:8099` todavia no publica
`/v1/payroll-index/*` ni `/v1/payroll-receipts/*`. El build payroll existe en el repositorio local
de `solid-servidor-sync`, pero debe desplegarse antes de integrar el portal.

## 2. Decisiones Cerradas

| Tema | Decision |
|---|---|
| Acceso | Todo empleado autenticado puede consultar solamente sus documentos |
| Identidad | La cedula procede exclusivamente de `usuario.cedula` en la sesion del portal |
| Estado visible | Todo documento listado se considera disponible; no se amplia el contrato |
| Frontend compilado | `frontend/dist` queda fuera de la entrega |
| Datos E2E | Se usan datos reales sin copiar PII a pruebas, reportes o Git |
| Usuarios E2E | Dos empleados reales autorizados validan propiedad y aislamiento |
| Orden | Primero se despliega el proveedor PDF en `8099`; despues se prueba el portal local |

## 3. No-Objetivos

- No modificar, renombrar ni eliminar PDF de `C:\PDFNOMINA`.
- No almacenar contenido PDF como BLOB en PostgreSQL o SQLite.
- No aceptar cedula, ruta de archivo ni nombre fisico desde el navegador.
- No habilitar consulta de documentos de otros empleados, ni siquiera para administradores.
- No ejecutar `POST /sync`, `POST /sync/ot` ni `POST /sync/catalogo` durante la validacion.
- No cambiar la logica actual de replica PDF, ADN, OT, catalogo o proveedores.
- No desplegar `frontend/dist`; el artefacto se genera en el proceso normal de build.
- No publicar secretos, cedulas, nombres, salarios, rutas o contenido documental como evidencia.
- No desplegar el portal a produccion dentro de esta validacion; solo el portal local consume la
  API interna desplegada en `8099`.

## 4. Archivos Y Modulos Afectados

### Portal

- `backend_v2/app/api/payroll_receipts.py`
- `backend_v2/app/services/payroll_receipts_client.py`
- `backend_v2/app/core/config.py`
- `backend_v2/app/main.py`
- Archivos existentes de auditoria de rutas y descargas que deban registrar el nuevo endpoint.
- `.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docker-compose.Pruebas3.yml`
- `frontend/src/config/api.ts`
- `frontend/src/services/PayrollReceiptService.ts`
- `frontend/src/services/PayrollReceiptService.test.ts`
- `frontend/src/pages/ServicePortal/pages/GestionHumana/index.tsx`
- `frontend/src/pages/ServicePortal/pages/GestionHumana/DesprendiblesPagoView.tsx`
- `testing/backend/test_payroll_receipts.py`
- `testing/CATALOGO_PRUEBAS.md`

### Servicio De PDF

- `app/payroll_index.py`
- `app/workers/pdf_sync.py`
- `scripts/pdf_index.py`
- `app/api/routes/payroll_index.py`
- `app/api/routes/payroll_receipts.py`
- `app/api/auth.py`
- `app/main.py`
- Lanzadores y ejemplos de configuracion listados en el build externo.
- `tests/test_payroll_api.py`
- `tests/test_payroll_index.py`
- `tests/test_pdf_sync.py`

No se preve una migracion PostgreSQL en el portal. El indice del proveedor usa SQLite y se crea de
forma idempotente en el servidor.

## 5. Pasos De Implementacion

### Fase 1 - Certificar Fuentes Y Contrato

1. Registrar rama, commit base y diff exacto de ambos repositorios.
2. Separar los cambios payroll de cambios ajenos en los worktrees compartidos.
3. No desplegar un diff cuya revision no pueda reproducirse mediante commit o artefacto identificado.
4. Congelar el contrato de listado, descarga, errores, HMAC, limite de tamano y headers.
5. Confirmar el formato canonico de cedula y la tolerancia maxima de 60 segundos para la asercion.
6. Confirmar que documento ajeno e inexistente producen el mismo `404` generico.
7. Ejecutar las pruebas, compilacion y lint focalizado de `solid-servidor-sync`.
8. Completar revision independiente de propiedad, PII y autenticacion.

Puerta de salida: fuentes reproducibles y proveedor PDF aprobado para despliegue controlado.

### Fase 2 - Respaldar Y Medir El Servicio Actual

1. Programar una ventana controlada porque `8099` tambien sirve procesos operativos existentes.
2. Registrar `GET /health`, OpenAPI, `/v1/pdf-sync/status` y procesos activos.
3. Detener API y workers con el procedimiento operativo versionado.
4. Respaldar la carpeta runtime, `CONFIGURAR_VARIABLES.cmd`, `var` y estado de replica.
5. Verificar que el respaldo puede restaurarse antes de reemplazar archivos.
6. No copiar, respaldar nuevamente ni modificar `C:\PDFNOMINA` como parte del despliegue de codigo.

Puerta de salida: linea base y rollback del servicio existentes verificados.

### Fase 3 - Desplegar Payroll Deshabilitado

1. Copiar solo `app`, `scripts`, lanzadores y manifiestos de dependencias indicados por
   `solid-servidor-sync/docs/deployment.md`.
2. No copiar `.git`, `docs`, `tests`, `migrations`, logs, PID, caches, `var` ni configuracion privada.
3. Preservar el `CONFIGURAR_VARIABLES.cmd` operativo y agregar sin imprimir:
   `PAYROLL_INDEX_ENABLED=false`, ruta SQLite, intervalo de refresh y tres secretos distintos.
4. Instalar las dependencias de la revision, incluida `pypdf`.
5. Iniciar API, worker ADN y worker PDF.
6. Confirmar que OpenAPI publica las nuevas rutas, pero payroll responde deshabilitado.
7. Revalidar salud, endpoints existentes, workers y replica PDF.

Puerta de salida: nueva revision instalada sin regresiones y sin exponer payroll.

### Fase 4 - Construir El Indice Con Datos Reales

1. Mantener `PAYROLL_INDEX_ENABLED=false` durante el backfill.
2. Refrescar el catalogo ERP mediante la transaccion de solo lectura implementada.
3. Ejecutar un backfill inicial limitado a 100 PDF.
4. Revisar conteos, periodos, documentos habilitados y anomalias sin exportar PII.
5. Confirmar que el proceso solo lee PDF y escribe la SQLite local.
6. Ejecutar el backfill completo, reanudable e idempotente.
7. Reconciliar total de PDF, bytes, indexados, habilitados, fallback y errores de lectura.
8. Someter a Gestion Humana las anomalias que requieran decision manual.
9. Respaldar `payroll-index.sqlite3` despues de aprobar el resultado.

Puerta de salida: indice real reconciliado y anomalias aceptadas o aisladas.

### Fase 5 - Activar La API Interna

1. Cambiar `PAYROLL_INDEX_ENABLED=true` y reiniciar API y worker PDF.
2. Verificar `/v1/payroll-index/status`, listado y descarga con autenticacion interna.
3. Confirmar que los tres secretos son fuertes, diferentes y no son placeholders.
4. Restringir el puerto `8099` a equipos y servicios autorizados.
5. Documentar el uso temporal de HTTP interno o habilitar HTTPS antes del uso productivo.
6. Confirmar nuevamente que la replica PDF permanece estable.
7. Preparar rotacion de los secretos usados durante validacion antes del uso productivo.

Puerta de salida: proveedor habilitado, restringido y estable con datos reales.

### Fase 6 - Endurecer La Integracion Del Portal

1. Mantener autenticacion obligatoria y derivar identidad solo de `usuario.cedula`.
2. Documentar que el endpoint es autoservicio para cualquier empleado autenticado y no una
   operacion administrativa de Gestion Humana.
3. Rechazar cedulas arbitrarias y decidir expresamente que tokens no interactivos no acceden a
   documentos salariales.
4. Validar configuracion y respuesta del proveedor sin revelar detalles internos.
5. Sanear o generar localmente `Content-Disposition`.
6. Contar bytes transmitidos y abortar al superar el maximo aunque falte `Content-Length`.
7. Cerrar respuesta y cliente en exito, error de lectura y desconexion mediante `try/finally`.
8. Registrar descargas exitosas, fallidas e interrumpidas sin PII.
9. Aplicar headers anti-cache y `nosniff`.
10. Corregir refresh de JWT, cancelacion, accesibilidad, estados de carga y sistema de diseno.
11. Configurar el portal local para consumir `http://192.168.0.21:8099` con secretos coordinados.
12. Excluir `frontend/dist` de la entrega y ejecutar el build en un entorno aislado.

Puerta de salida: portal seguro y listo para prueba integral contra el proveedor real.

### Fase 7 - Prueba Integral Con Dos Empleados

1. Levantar frontend y backend del portal localmente.
2. Autenticar al primer empleado autorizado y validar listado y descarga propios.
3. Autenticar al segundo empleado autorizado y repetir la validacion.
4. Intentar con cada sesion descargar el `document_id` del otro empleado.
5. Confirmar que documento ajeno e inexistente producen el mismo `404`.
6. Comparar SHA-256 del PDF descargado con su origen sin asociar el hash con PII en la evidencia.
7. Verificar MIME, nombre seguro, headers anti-cache y ausencia de secretos en el navegador.
8. Interrumpir una descarga para validar cierre y auditoria.
9. Probar JWT expirado, un solo refresh y un solo reintento.
10. Revisar logs y auditoria para excluir cedulas, nombres, salarios, rutas, tokens y firmas.

Puerta de salida: aislamiento de propiedad demostrado con dos identidades reales autorizadas.

### Fase 8 - Regresion, Aprobacion Y Seguimiento

1. Ejecutar matrices completas de backend y frontend descritas en el handoff.
2. Ejecutar regresiones generales del portal y las 45 pruebas del proveedor.
3. Verificar salud, ADN y replica PDF despues de las pruebas integrales.
4. Ejecutar los revisores de alcance, backend, frontend, documentacion/pruebas y seguridad/RBAC.
5. Registrar comandos, duraciones, conteos y resultados sanitizados.
6. Probar el rollback funcional y el rollback completo del runtime.
7. Crear el reporte final con `docs/reviews/templates/build_review.md`.
8. Rotar secretos de validacion y autorizar operacion productiva solo sin hallazgos altos abiertos.

## 6. Comandos De Validacion

Los comandos se ejecutan desde el repositorio correspondiente y nunca deben imprimir secretos.

### Proveedor PDF

```powershell
python -m compileall -q app scripts tests
python -m pytest
python -m ruff check app/api/auth.py app/api/routes/payroll_index.py app/api/routes/payroll_receipts.py app/payroll_index.py app/workers/pdf_sync.py scripts/pdf_index.py tests/test_payroll_api.py tests/test_payroll_index.py tests/test_pdf_sync.py
```

Backfill controlado en el servidor, despues de cargar su configuracion privada:

```powershell
python -m scripts.pdf_index --status
python -m scripts.pdf_index --limit 100
python -m scripts.pdf_index
python -m scripts.pdf_index --status
```

No ejecutar `--force` salvo diagnostico aprobado, porque reprocesa todo el corpus.

### Portal

```powershell
python -m pytest testing/backend/test_payroll_receipts.py -q
python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q
python -m compileall -q backend_v2/app testing/backend/test_payroll_receipts.py
```

Desde `frontend`:

```powershell
npm run test -- --run src/services/PayrollReceiptService.test.ts
npm run test -- --run src/pages/ServicePortal/pages/GestionHumana
npx eslint src/services/PayrollReceiptService.ts src/services/PayrollReceiptService.test.ts src/pages/ServicePortal/pages/GestionHumana/DesprendiblesPagoView.tsx src/pages/ServicePortal/pages/GestionHumana/index.tsx src/config/api.ts
npm run build
```

El build frontend se ejecuta en una copia o worktree aislado para no alterar el `frontend/dist`
preexistente del workspace compartido.

## 7. Impacto En Documentacion

- [ ] Actualizar `docs/reviews/builds/payroll-receipts-integration-handoff-2026-07-22.md` con
  revisiones exactas y evidencia.
- [ ] Crear el reporte final en `docs/reviews/builds/`.
- [ ] Registrar pruebas nuevas en `testing/CATALOGO_PRUEBAS.md`.
- [ ] Crear o justificar la no aplicacion de un ADR para HMAC, confianza entre servicios, rotacion,
  autorizacion y auditoria.
- [ ] Documentar operacion, diagnostico, rotacion de secretos y rollback.
- [ ] No actualizar `docs/ESQUEMA_BASE_DATOS.md`: no cambia PostgreSQL del portal.
- [ ] No versionar nombres, cedulas, hashes asociados a personas ni muestras de PDF reales.

## 8. Evaluacion De Riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Regresion en el servicio `8099` compartido | Alta | Desplegar deshabilitado, respaldar runtime y validar endpoints existentes antes de activar |
| Exposicion de PII o contenido salarial | Alta | Evidencia sanitizada, no registrar cedulas/rutas y restringir accesos al servidor e indice |
| Acceso a un documento ajeno | Media | Identidad de sesion, HMAC breve, propiedad en proveedor y prueba cruzada con dos usuarios |
| HTTP interno expone token, firma o PDF | Media | Restringir red, evaluar HTTPS y rotar secretos antes de operacion productiva |
| Backfill carga el servidor o bloquea SQLite | Media | Muestra de 100, proceso reanudable, WAL, transacciones cortas y ejecucion en ventana controlada |
| Worker PDF cambia comportamiento | Media | Iniciar con indice deshabilitado y verificar replica antes y despues de cada puerta |
| Perdida o corrupcion del indice | Baja | Respaldo posterior al backfill, reconstruccion idempotente y PDF como fuente original |
| Worktrees contienen cambios no relacionados | Alta | Fijar revisiones, revisar diff por archivo y no desplegar cambios sin atribucion |
| `frontend/dist` pisa cambios previos | Media | Excluirlo de la entrega y construir en un entorno aislado |

## 9. Matriz De Subagentes

```text
Subagente | Motivo | Resultado observado | Bloquea implementacion actual
----------|--------|--------------------|-----------------------------
scope-reviewer | Alcance cruzado, proveedor externo y despliegue | blocked; riesgos incorporados al plan | si, hasta cerrar puertas
backend-reviewer | Proxy, streaming, auditoria y pruebas | blocked; correcciones incluidas en fase 6 | si
frontend-reviewer | Accesibilidad, sesion y pruebas | blocked; correcciones incluidas en fase 6 | si
docs-tests-reviewer | Evidencia, E2E, catalogo y rollback | blocked; acciones incluidas en fases 7 y 8 | si
security-rbac-reviewer | Propiedad, HMAC, PII, RBAC y transporte | blocked; controles incluidos en fases 5 y 6 | si
mobile-reviewer | Sin cambios moviles | no requerido | no
frontend-table-specialist | No se implementan tablas complejas | no requerido | no
```

Los resultados anteriores corresponden a la revision estatica de la implementacion entregada. Los
revisores deben ejecutarse nuevamente despues de las correcciones y antes de la decision final.

## 10. Rollback

### Rollback Funcional Payroll

1. Definir `PAYROLL_INDEX_ENABLED=false`.
2. Reiniciar API y worker PDF.
3. Mantener la replica PDF activa.
4. Conservar SQLite para diagnostico; no eliminarla automaticamente.
5. Ocultar o deshabilitar la vista de desprendibles en el portal.

### Rollback Completo Del Servicio

1. Detener procesos.
2. Restaurar el respaldo de runtime y configuracion anterior.
3. Restaurar dependencias de la revision anterior si aplica.
4. Reiniciar API y workers.
5. Validar salud, ADN, endpoints existentes y replica PDF.
6. No modificar ni eliminar `C:\PDFNOMINA`.

## 11. Definition Of Done

- [ ] El proveedor desplegado corresponde a una revision exacta y revisada.
- [ ] El indice real esta reconciliado y respaldado.
- [ ] Cada empleado lista y descarga solamente sus documentos.
- [ ] El navegador no envia cedula, secretos internos ni rutas.
- [ ] Documento ajeno e inexistente producen el mismo `404`.
- [ ] El limite real de descarga no depende solo de `Content-Length`.
- [ ] Streams y clientes cierran en exito, error y desconexion.
- [ ] Auditoria exitosa y fallida no contiene PII.
- [ ] Backend, frontend, lint, build, regresiones y E2E estan verdes.
- [ ] El servicio `8099`, ADN y replica PDF permanecen estables.
- [ ] `frontend/dist` no forma parte de la entrega.
- [ ] Rollback funcional y completo fueron probados.
- [ ] No quedan hallazgos criticos o altos abiertos.

## 12. Decision Final Del Plan

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

El plan puede ejecutarse por fases, pero ninguna puerta permite omitir la validacion anterior. La
implementacion actual permanece bloqueada para operacion productiva hasta completar la Definition
of Done y obtener autorizacion operacional explicita.
