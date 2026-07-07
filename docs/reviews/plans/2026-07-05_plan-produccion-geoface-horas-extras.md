# Plan - Produccion GeoFace + Horas Extras

**Fecha:** 2026-07-05
**Plan:** Cierre productivo de GeoFace y Horas Extras con integracion secuencial controlada
**Autor del plan:** Agente IA (OpenCode)
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti
**Ventana objetivo:** 1 semana calendario

---

## 1. Objetivo

Dejar listos para produccion, con calidad verificable, los modulos:

1. **GeoFace movil/backend:** app movil de reconocimiento facial + geolocalizacion como marcador oficial de asistencia.
2. **Horas Extras:** modulo de calculo, aprobacion, bolsa, planificador OT/costos y exportabilidad operativa.
3. **Integracion minima productiva:** usar marcas biometricas/geograficas como evidencia confiable para alimentar o respaldar pre-liquidacion de horas extras.

La estrategia es **secuencial-paralela**: estabilizar cada modulo en paralelo, cerrar fuentes de verdad y contratos, y solo despues integrar el flujo minimo E2E.

## 2. Principios de entrega

- No bajar seguridad para ganar tiempo: JWT, RBAC, ownership y auditoria se mantienen.
- No usar datos locales del movil como autoridad si existe backend central.
- No aceptar integracion si GeoFace no produce marcas confiables.
- No aceptar calculos de HE sin pruebas de reglas legales y regresion.
- Preferir integracion minima robusta sobre integracion amplia incompleta.
- Mantener la carga manual de horarios en HE como respaldo operativo aun despues de conectar GeoFace.
- Cada fase debe dejar evidencia en tests, logs o reporte `docs/reviews/builds/`.

## 3. Estado de partida

| Modulo | Estado actual | Riesgo principal |
|---|---|---|
| GeoFace backend biometrico | Separado en `biometria-engine`, protegido por backend | Falta verificar compose productivo y flujos moviles finales |
| GeoFace app movil | Funcional base, pero fragil | Enrolamiento/zona/evidencias dependen de estado local o contratos incompletos |
| Horas Extras backend | Maduro, con services y tests S0-S9 | Falta corrida completa, migraciones/seeds, concurrencia y cierre OT/costos |
| Horas Extras frontend | Existe dashboard/service web | Falta validar cobertura y flujo real con usuarios/planificador |
| Integracion GeoFace -> HE | Conceptual, no cerrada | Falta contrato de datos y flujo E2E |

## 4. Ruta critica

```text
Fase 0: Congelar alcance y baseline
  -> Fase 1A: GeoFace fuente de verdad backend
  -> Fase 1B: Horas Extras validacion standalone
  -> Fase 2: Contrato asistencia -> HE
  -> Fase 3: Integracion minima E2E
  -> Fase 4: Produccion, APK, despliegue y runbook
```

No iniciar Fase 3 si Fase 1A o Fase 1B no estan aprobadas con evidencia.

## 5. Matriz paralelo vs serie

### Trabajo en paralelo

| Track | Puede iniciar | Dependencias | Resultado esperado |
|---|---|---|---|
| GeoFace movil | Dia 1 | Baseline | App usa backend como fuente de verdad |
| GeoFace infra/backend | Dia 1 | Baseline | Compose productivo con engine y endpoints estables |
| Horas Extras backend | Dia 1 | Baseline | Tests S0-S9 y migraciones/seeds OK |
| Horas Extras frontend | Dia 1 | Baseline | Dashboard y service validados |
| Documentacion/QA | Dia 1 | Baseline | Matriz de pruebas y bitacora actualizada |

### Trabajo en serie

| Orden | Tarea | Por que es secuencial |
|---|---|---|
| 1 | Definir backend como fuente de verdad de enrolamiento, zonas y marcas | Sin esto GeoFace no es confiable |
| 2 | Validar HE standalone | No se debe integrar contra modulo no certificado |
| 3 | Definir contrato asistencia -> HE | Depende de datos reales disponibles |
| 4 | Implementar integracion minima | Depende del contrato |
| 5 | Ejecutar E2E real | Depende de ambos modulos estables |
| 6 | Build/deploy productivo | Depende de E2E aprobado |

## 6. Fase 0 - Baseline y control de alcance

**Objetivo:** congelar estado inicial, ramas, riesgos y criterio de salida.

### Tareas

- [x] Confirmar rama de trabajo y estado limpio o documentar cambios pendientes.
- [x] Crear reporte build inicial en `docs/reviews/builds/` con baseline de ambos modulos.
- [x] Ejecutar `git status -sb` y registrar commit base.
- [x] Revisar `docs/reviews/plans/2026-07-05_estado-actual-app-movil-geoface.md`.
- [ ] Revisar este plan con el equipo y marcar responsables por track.
- [ ] Definir ambiente objetivo: local Docker, Pruebas3, produccion o los tres.
- [ ] Confirmar si se requiere HTTPS/VPN para piloto o si LAN controlada es aceptada temporalmente.
- [ ] Confirmar dispositivos fisicos disponibles para pruebas Android.
- [ ] Confirmar usuarios de prueba: admin, empleado normal, empleado con OT, empleado sin rostro.
- [ ] Confirmar reglas GH vigentes para HE: jornada 42h, nocturna, topes, bolsa, compensacion.

### Criterio de salida

- [ ] Alcance aprobado.
- [ ] Responsables asignados.
- [ ] Ambiente y usuarios de prueba definidos.
- [ ] Riesgos iniciales aceptados o convertidos en tareas.

## 7. Fase 1A - GeoFace como marcador oficial confiable

**Objetivo:** que GeoFace produzca marcas de asistencia confiables, autenticadas, auditables y consumibles por otros modulos.

### 1A.1 Fuente de verdad de enrolamiento

- [x] Crear o confirmar endpoint backend para consultar estado biometrico del usuario actual.
  - Propuesta: `GET /api/v2/biometria/estado`.
  - Respuesta sugerida: `{ enrolado: boolean, fotoUrl?: string, actualizadoEn?: string }`.
- [x] Cambiar `AuthGate` para no decidir enrolamiento solo por `profiles` local.
- [x] Hacer fail-closed el enrolamiento movil.
  - [x] Si `/biometria/enrolar` falla, no guardar perfil local como valido.
  - [x] Mostrar error claro con causa backend.
  - [x] Permitir reintento sin dejar estado corrupto.
- [ ] Mantener cache local solo como cache visual, no como autoridad.
- [ ] Agregar prueba o validacion manual: borrar storage local con usuario ya enrolado en backend no debe obligar a enrolar si backend confirma `enrolado=true`.

### 1A.2 Zonas oficiales backend

- [x] Decidir si `zonas_trabajo` de biometria son la fuente oficial para GeoFace.
- [x] Consumir `GET /api/v2/biometria/zonas` desde la app movil.
- [x] Reemplazar IDs locales `Date.now()` para check-in por IDs reales del backend.
- [x] Crear/editar/eliminar zonas desde backend para admin o bloquear edicion local si no habra CRUD movil.
- [x] Mapear campos backend -> movil:
  - [x] `id` -> `Zone.id`
  - [x] `nombre` -> `Zone.name`
  - [x] `latitud`, `longitud` -> `Zone.center`
  - [x] `radio` -> `Zone.radius`
- [x] Confirmar que `zona_id` enviado a `/biometria/asistencia` existe y no se descarta.
- [x] Agregar validacion backend de geocerca o al menos registrar advertencia si coordenadas estan fuera del radio.
- [ ] Definir comportamiento si no hay zonas oficiales.

### 1A.3 Evidencias autenticadas

- [x] Corregir carga de `evidenciaUrl` en movil.
  - [x] Opcion A: `fetch` con JWT -> blob/data URI -> `<Image>`.
  - Opcion B: endpoint con URL firmada temporal y scope limitado.
- [x] Mantener backend protegido por auth + owner/admin.
- [ ] Validar historial: empleado solo ve sus evidencias; admin puede ver todas.
- [x] Evitar exponer tokens por query params.
- [x] Agregar estado visual si evidencia aun esta descargando o si no hay permiso.

### 1A.4 Auth movil y rutas legacy

- [x] Corregir `getStoredAccounts()` para enviar `Authorization` en `/auth/analistas`.
- [x] Corregir o eliminar `deleteAccount()` que apunta a `/v1/users/{id}`.
- [x] Revisar `createAccount()` y UI de creacion: si no esta permitida, ocultar o dejar mensaje consistente.
- [x] Eliminar referencias operativas a `/v1/*` en app movil.
- [ ] Confirmar que endpoints protegidos sin token siguen respondiendo `401`.

### 1A.5 App movil lista para build

- [ ] Agregar scripts en `movil/package.json`:
  - [x] `typecheck`: `tsc --noEmit`
  - [ ] `lint` si se define ESLint o documentar ausencia.
  - [ ] `test` si se agregan pruebas unitarias.
- [ ] Instalar dependencias localmente en ambiente controlado antes de validar.
- [x] Ejecutar typecheck.
- [ ] Revisar `app.json`:
  - [x] Remover `RECORD_AUDIO` si no se usa.
  - [ ] Confirmar `usesCleartextTraffic` solo para entorno LAN/piloto.
  - [x] Confirmar permisos de camara y ubicacion.
- [x] Configurar `eas.json` production/preview segun politica de distribucion.
- [ ] Generar APK preview.
- [ ] Probar APK en al menos 2 dispositivos Android fisicos.

### 1A.6 Limpieza legacy y documentacion movil

- [x] Decidir destino de `movil/face-server/`.
  - [ ] Eliminar si no se usa.
  - [x] O mover/documentar como historico no productivo.
- [x] Actualizar `movil/API_CONTRACT.md` a backend actual `/api/v2`.
- [x] Actualizar `movil/docs/CONTEXTO.md` con ruta `movil/`.
- [x] Actualizar `movil/docs/ARQUITECTURA.md` con `backend_v2 + biometria-engine`.
- [x] Actualizar `movil/docs/GUIA-DESARROLLO.md` con puerto `8000`, `.env`, APK y pruebas.
- [x] Actualizar `movil/CHECKLIST.md` para reflejar estado real.

### Criterio de salida GeoFace

- [ ] Login movil OK.
- [ ] Enrolamiento OK y fail-closed probado.
- [ ] Estado biometrico consultado desde backend.
- [ ] Zonas oficiales cargadas desde backend.
- [ ] Asistencia registra `zona_id` real cuando aplica.
- [ ] Evidencias visibles con autorizacion.
- [ ] Typecheck movil OK.
- [ ] APK preview instalado y probado.

## 8. Fase 1B - Horas Extras standalone productivo

**Objetivo:** certificar HE sin depender aun de GeoFace.

### 1B.1 Backend HE y reglas

- [ ] Ejecutar pruebas backend HE completas:
  - [ ] `test_horas_extras_s0.py`
  - [ ] `test_horas_extras_s1.py`
  - [ ] `test_horas_extras_s2.py`
  - [ ] `test_horas_extras_s4.py`
  - [ ] `test_horas_extras_s5_festivos.py`
  - [ ] `test_horas_extras_s5_novedades.py`
  - [ ] `test_horas_extras_s5pp_horario_semana.py`
  - [ ] `test_horas_extras_s5ppp_integracion.py`
  - [ ] `test_horas_extras_s6.py`
  - [ ] `test_horas_extras_s7.py`
  - [ ] `test_horas_extras_s8_ot_mano_obra.py`
  - [ ] `test_horas_extras_s9_reglas_gh.py`
  - [ ] `test_horas_extras_parametros_calculo.py`
- [ ] Verificar reglas legales vigentes:
  - [ ] Jornada 42h/semana desde fecha definida.
  - [ ] Jornada previa 44h/220h si aplica por fecha.
  - [ ] Nocturna 19:00-06:00.
  - [ ] Topes diarios/semanales/anuales.
  - [ ] Festivos Colombia y Ley Emiliani.
  - [ ] Bolsa de horas y compensacion.
- [ ] Revisar concurrencia en bolsa de horas.
- [ ] Revisar idempotencia de confirmacion/pre-liquidacion.
- [ ] Revisar errores esperados `409` para transiciones invalidas.
- [ ] Confirmar que la carga manual de horarios sigue disponible para novedades, fallas de app, ajustes autorizados o contingencia operativa.
- [ ] Confirmar prioridad de fuentes para calculo HE: horario manual autorizado, planificador, contrato/base, marcas GeoFace como evidencia/insumo.
- [ ] Auditar cambios de horario manual con usuario, fecha, motivo y periodo afectado.
- [ ] Restringir cambios manuales de horario a roles autorizados GH/jefe/admin segun RBAC.
- [ ] Exigir motivo obligatorio y novedad/evidencia asociada cuando el horario manual reemplace o contradiga marca GeoFace.
- [ ] Mantener bitacora inmutable de cambios manuales que impacten nomina.

### 1B.2 Migraciones, seed y datos

- [ ] Verificar migraciones HE aplicadas en ambiente objetivo.
- [ ] Verificar `horas_extras_migration.py`.
- [ ] Verificar `horas_extras_migration_s6.py`.
- [ ] Verificar `horas_extras_migration_s8.py`.
- [ ] Ejecutar o confirmar seeds:
  - [ ] Catalogo de novedades.
  - [ ] Parametros 2026.
  - [ ] Festivos / Ley Emiliani.
  - [ ] Factores prestacionales ARL.
- [ ] Confirmar que no hay duplicados por re-ejecutar seeds.
- [ ] Confirmar indices y constraints para tablas de bolsa/costos/workflow.

### 1B.3 OT, planificador y costos

- [ ] Revisar `planificador_costos_ot.py` y cerrar gaps.
- [ ] Validar flujo planificador -> HE -> costo OT.
- [ ] Confirmar que `NominaCostoOt` se actualiza al confirmar calculo.
- [ ] Validar recalculo si se anula o compensa.
- [ ] Confirmar integracion ERP necesaria para OT/centro de costo.
- [ ] Documentar comportamiento cuando no hay OT asignada.

### 1B.4 Frontend web HE

- [ ] Ejecutar pruebas frontend existentes para horas extras.
- [ ] Validar dashboard HE manualmente:
  - [ ] Seleccion empleado.
  - [ ] Semana/periodo.
  - [ ] Pre-liquidacion.
  - [ ] Confirmacion.
  - [ ] Bolsa.
  - [ ] Costos OT.
  - [ ] Errores y estados vacios.
- [ ] Corregir cobertura si `PlanificadorSemanalView` no cubre round-trip empleado -> planificador -> calculo.

### 1B.5 RBAC y auditoria

- [ ] Verificar entradas HE en `backend_v2/app/core/rbac_manifest.py`.
- [ ] Confirmar roles admin/GH/jefe/empleado segun reglas reales.
- [ ] Confirmar auditoria de confirmaciones y cambios de estado.
- [ ] Confirmar que usuario sin permiso recibe `403`.

### Criterio de salida Horas Extras

- [ ] Suite HE backend completa pasa.
- [ ] Migraciones/seeds verificados.
- [ ] Flujo web HE probado manualmente.
- [ ] Planificador OT/costos validado.
- [ ] RBAC/auditoria verificados.

## 9. Fase 1C - Infraestructura productiva GeoFace + HE

**Objetivo:** asegurar que los servicios necesarios existen en los compose y ambientes productivos.

### Tareas

- [ ] Verificar `docker-compose.yml` local con `biometria-engine` healthy.
- [ ] Agregar/verificar `biometria-engine` en `docker-compose.prod.yml`.
- [ ] Agregar/verificar `biometria-engine` en `docker-compose.Pruebas3.yml`.
- [ ] Confirmar `backend` usa `BIOMETRIA_ENGINE_URL=http://biometria-engine:8010`.
- [ ] Confirmar `BIOMETRIA_ENGINE_TOKEN` definido en ambientes no locales.
- [ ] Confirmar engine no expone puertos publicos.
- [ ] Confirmar red interna para engine.
- [ ] Confirmar healthcheck del engine.
- [ ] Evaluar `depends_on.condition: service_healthy` para backend.
- [ ] Confirmar `storage/perfiles` y `storage/asistencias` persistentes en ambiente objetivo.
- [ ] Confirmar backups o politica de retencion para evidencias biometricas.
- [ ] Confirmar variables Redis/JWT/DB sin warnings criticos.

### Criterio de salida infraestructura

- [ ] `docker compose build backend biometria-engine` OK.
- [ ] `docker compose ps` muestra backend y engine healthy.
- [ ] Backend health OK.
- [ ] Engine no accesible desde host externo.
- [ ] Pruebas biometria backend OK.

## 10. Fase 2 - Contrato asistencia biometrica -> horas extras

**Objetivo:** definir contrato minimo antes de escribir la integracion.

### 2.1 Modelo de datos objetivo

- [ ] Decidir si `registros_asistencia` actual es suficiente o requiere ampliacion.
- [ ] Definir campos minimos para HE:
  - [ ] `usuario_id`.
  - [ ] `creado_en` / timestamp marca.
  - [ ] tipo de marca: entrada, salida, inicio HE, fin HE, asistencia puntual.
  - [ ] `zona_id` oficial.
  - [ ] `latitud_marcada`, `longitud_marcada`.
  - [ ] `match_exitoso`, `nivel_confianza`.
  - [ ] `evidencia_url`.
  - [ ] `origen`: movil, web, ajuste manual, batch.
  - [ ] `estado`: valida, rechazada, pendiente_sync, anulada.
  - [ ] relacion opcional con OT o centro de costo.
- [ ] Definir si se necesita tabla nueva para pares entrada/salida.
- [ ] Definir si HE consume marcas crudas o ventanas consolidadas.

### 2.2 Flujo minimo productivo recomendado

Para cumplir una semana, el flujo minimo debe ser:

```text
Empleado marca asistencia con GeoFace
  -> Backend guarda registro biometrico con GPS y evidencia
  -> HE muestra/consume marcas verificadas del periodo
  -> GH/jefe pre-liquida HE con marcas como evidencia
  -> Workflow HE aprueba/compensa/paga
```

No se recomienda, en esta semana, automatizar al 100% la liquidacion sin revision humana.

La integracion con GeoFace no reemplaza la carga manual de horarios existente en HE. Si hay novedad con la app, falla de GPS/camara, ausencia de marca, ajuste autorizado o contingencia operativa, GH/jefe autorizado debe poder ingresar o ajustar el horario manualmente y usar GeoFace solo como evidencia cuando exista.

### 2.3 Endpoints/servicios propuestos

- [ ] `GET /api/v2/biometria/asistencias?desde=&hasta=&usuario_id=` para rango filtrado.
- [ ] `GET /api/v2/nomina/horas-extras/asistencias-disponibles?usuario_id=&semana=`.
- [ ] `POST /api/v2/nomina/horas-extras/preliquidar-desde-asistencia`.
- [ ] `POST /api/v2/nomina/horas-extras/{calculo_id}/vincular-asistencia` si se decide vincular despues.
- [ ] Agregar schemas de respuesta compartidos.
- [ ] Documentar contrato en `docs/specs/` o `movil/API_CONTRACT.md` segun corresponda.

### 2.4 Reglas de integracion

- [ ] Solo marcas `match_exitoso=true` pueden respaldar HE.
- [ ] Marca sin `zona_id` oficial debe quedar como advertencia o no elegible, segun decision GH.
- [ ] Marca fuera de zona no debe generar HE automatica.
- [ ] Si falta salida, no liquidar automatico; dejar pendiente de revision.
- [ ] Si hay multiples marcas, usar primera entrada y ultima salida o regla definida por GH.
- [ ] Toda vinculacion debe quedar auditada.
- [ ] Un registro de asistencia no debe respaldar dos liquidaciones incompatibles.
- [ ] Un horario manual autorizado puede respaldar el calculo HE cuando no exista marca GeoFace completa o cuando exista una novedad documentada.
- [ ] Si horario manual y marca GeoFace difieren, el sistema debe mostrar advertencia y exigir revision humana antes de confirmar.
- [ ] Todo endpoint nuevo de integracion debe usar RBAC del modulo correspondiente y pruebas de `403`.

### Criterio de salida contrato

- [ ] Contrato aprobado por responsables funcionales.
- [ ] Campos y endpoints definidos.
- [ ] Tests esperados definidos antes de implementar.
- [ ] Riesgos de automatizacion documentados.

## 11. Fase 3 - Implementacion integracion minima

**Objetivo:** conectar marcas GeoFace verificadas con pre-liquidacion HE sin romper flujos existentes.

### 3.1 Backend integracion

- [ ] Crear servicio de consulta de asistencias elegibles para HE.
- [ ] Filtrar por usuario, semana/periodo y `match_exitoso=true`.
- [ ] Incluir datos de evidencia y zona en respuesta.
- [ ] Crear endpoint de pre-liquidacion desde asistencia o vinculacion a calculo existente.
- [ ] Reutilizar `horas_extras_calculo.py` sin duplicar reglas.
- [ ] Reutilizar workflow existente.
- [ ] Preservar flujo existente de horarios manuales en HE y validar que sigue funcionando despues de integrar GeoFace.
- [ ] Permitir que pre-liquidacion use horario manual autorizado cuando no haya marca GeoFace elegible o exista novedad documentada.
- [ ] Agregar auditoria de vinculacion asistencia -> HE.
- [ ] Agregar RBAC si el endpoint es nuevo.
- [ ] Agregar tests backend:
  - [ ] asistencia verificada genera insumo elegible.
  - [ ] asistencia no match no elegible.
  - [ ] horario manual autorizado permite calculo HE aunque no exista marca GeoFace completa.
  - [ ] diferencia entre horario manual y marca GeoFace genera advertencia y requiere revision.
  - [ ] usuario normal solo ve sus marcas.
  - [ ] admin/GH ve segun permiso.
  - [ ] ausencia de salida no liquida automatico.
  - [ ] zona inexistente genera advertencia.
  - [ ] vinculacion duplicada se bloquea o es idempotente.

### 3.2 Frontend web HE

- [ ] Agregar panel o seccion "Marcas GeoFace" en flujo HE.
- [ ] Mostrar fecha/hora, zona, confianza, evidencia, estado.
- [ ] Permitir seleccionar marcas elegibles para pre-liquidar o respaldar calculo.
- [ ] Mostrar advertencias: sin salida, fuera de zona, sin evidencia, zona no oficial.
- [ ] No permitir acciones sin permiso.
- [ ] Agregar test frontend del service y/o componente principal.

### 3.3 App movil

- [ ] No intentar construir toda la gestion HE en movil en esta semana salvo lectura basica.
- [ ] Mostrar confirmacion post-asistencia indicando si la marca quedo disponible para HE.
- [ ] Si se agrega pantalla minima HE:
  - [ ] Mostrar mis marcas verificadas.
  - [ ] Mostrar estado: enviada, pendiente revision HE, vinculada.
  - [ ] No permitir editar calculos HE desde movil en primera entrega.

### Criterio de salida integracion

- [ ] Marca GeoFace aparece como insumo HE.
- [ ] Pre-liquidacion o vinculacion usa reglas existentes.
- [ ] Evidencia visible para rol autorizado.
- [ ] Tests backend de integracion pasan.
- [ ] Flujo manual E2E completado.

## 12. Fase 4 - Validacion E2E y QA de campo

**Objetivo:** demostrar que el flujo completo funciona en ambiente similar a produccion.

### Escenarios E2E obligatorios

- [ ] Usuario sin rostro intenta verificar: debe recibir mensaje claro y no registrar HE.
- [ ] Usuario enrola rostro correctamente.
- [ ] Usuario dentro de zona registra asistencia con match exitoso.
- [ ] Usuario fuera de zona no puede marcar desde app o queda no elegible.
- [ ] Evidencia se ve desde historial movil con auth.
- [ ] Admin/GH ve marca GeoFace en modulo HE.
- [ ] Pre-liquidacion HE usa marca verificada.
- [ ] Jefe/GH aprueba o rechaza segun workflow.
- [ ] Bolsa/costos OT se actualizan si aplica.
- [ ] Usuario sin permiso recibe `403` en endpoints HE/biometria.
- [ ] Token expirado obliga re-login sin perder estado corrupto.
- [ ] Backend caido muestra error claro en movil.
- [ ] Doble tap en verificar no duplica evidencias indebidamente.

### Validaciones automaticas

- [ ] `python -m pytest testing/backend/test_biometria_engine_api.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py -q`
- [ ] `python -m pytest testing/backend/test_horas_extras_s0.py testing/backend/test_horas_extras_s1.py testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s4.py testing/backend/test_horas_extras_s5_festivos.py testing/backend/test_horas_extras_s5_novedades.py testing/backend/test_horas_extras_s5pp_horario_semana.py testing/backend/test_horas_extras_s5ppp_integracion.py testing/backend/test_horas_extras_s6.py testing/backend/test_horas_extras_s7.py testing/backend/test_horas_extras_s8_ot_mano_obra.py testing/backend/test_horas_extras_s9_reglas_gh.py testing/backend/test_horas_extras_parametros_calculo.py -q`
- [ ] `python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q`
- [ ] `npm --prefix movil run typecheck`
- [ ] `npm --prefix frontend run test -- src/tests/PlanificadorSemanalView.test.tsx`
- [ ] `npm --prefix frontend run build`

### Validaciones manuales movil

- [ ] Android fisico 1: login, enrolamiento, asistencia, evidencia.
- [ ] Android fisico 2: login, asistencia, error de zona, reconexion.
- [ ] Prueba con luz baja.
- [ ] Prueba con foto de foto / spoof si anti-spoofing esta activo.
- [ ] Prueba con backend apagado.
- [ ] Prueba con IP incorrecta y restauracion de servidor.

### Criterio de salida QA

- [ ] Todos los tests automaticos criticos pasan.
- [ ] E2E manual documentado con evidencias.
- [ ] No quedan blockers severidad critica/alta sin decision explicita.

## 13. Fase 5 - Despliegue, documentacion y cierre

**Objetivo:** entregar artefactos productivos y runbook.

### Despliegue

- [ ] Build Docker productivo backend + biometria-engine.
- [ ] Migraciones aplicadas en ambiente objetivo.
- [ ] Seeds aplicados/idempotentes.
- [ ] APK generado y distribuido por canal definido.
- [ ] Variables de entorno validadas.
- [ ] HTTPS/VPN configurado o riesgo documentado si es piloto LAN.

### Documentacion

- [ ] `docs/reviews/builds/YYYY-MM-DD_geoface-horas-extras-produccion.md` con evidencia final.
- [ ] `docs/GUIA_DESARROLLO.md` actualizado si cambia flujo general.
- [ ] `docs/ESQUEMA_BASE_DATOS.md` actualizado si hay modelos/migraciones nuevas.
- [ ] `testing/CATALOGO_PRUEBAS.md` actualizado con pruebas nuevas.
- [ ] `movil/API_CONTRACT.md` actualizado.
- [ ] Runbook de soporte:
  - [ ] reinicio backend/engine.
  - [ ] revisar logs biometria.
  - [ ] resetear IP movil.
  - [ ] resolver usuario sin rostro.
  - [ ] resolver marca sin zona.
  - [ ] reintentar seeds/migraciones.

### Cierre

- [ ] Revisores obligatorios ejecutados:
  - [ ] `mobile-reviewer`.
  - [ ] `backend-reviewer`.
  - [ ] `security-rbac-reviewer`.
  - [ ] `docs-tests-reviewer`.
  - [ ] `scope-reviewer` si cambia alcance.
- [ ] Reporte final aprobado o aprobado con riesgos.
- [ ] Commit(s) con convencion en espanol.
- [ ] Push solo con autorizacion explicita.

## 14. Calendario sugerido de una semana

| Dia | Track GeoFace | Track Horas Extras | Track Integracion/QA |
|---|---|---|---|
| Dia 1 | Enrolamiento backend-source, auth legacy | Tests HE S0-S9, migraciones/seeds | Congelar contrato preliminar |
| Dia 2 | Zonas oficiales, evidencias con auth | OT/costos, frontend HE | Definir endpoints/schemas integracion |
| Dia 3 | Typecheck, APK preview, docs movil | RBAC/auditoria, fixes tests | Implementar servicio asistencia elegible |
| Dia 4 | Pruebas Android fisico, fixes | Flujo web HE manual | Vincular asistencia -> preliquidacion |
| Dia 5 | Hardening movil e infra compose | Regresion HE completa | E2E rostro+GPS+HE |
| Dia 6 | Bugfixes de campo | Bugfixes HE | Build final, docs finales |
| Dia 7 | Retest APK y soporte | Retest prod | Runbook, reporte final, cierre |

## 15. Riesgos que no se deben aceptar

| Riesgo | Motivo | Accion |
|---|---|---|
| GeoFace guarda perfil local si backend no enrola | Desincroniza y rompe asistencia | Fail-closed obligatorio |
| Zonas locales respaldan HE | GPS manipulable y sin ID oficial | Backend como fuente de zonas |
| Evidencias sin auth en app | Historial roto o inseguro | Fetch autenticado/URL segura |
| HE sin migraciones/seeds | Endpoints 500 o calculos incompletos | Verificacion antes de QA |
| Integracion automatica sin revision humana | Riesgo legal/nomina | Primera entrega con evidencia y aprobacion |
| HTTP claro en produccion abierta | JWT/fotos/GPS expuestos | HTTPS/VPN o solo LAN controlada documentada |
| `face-server` legacy activo | Superficie de ataque y confusion | Eliminar/aislar |
| Tests HE S9 fallando | Riesgo legal por reglas GH | Bloqueante |
| APK no probado en fisico | Emulador no valida camara/GPS real | Bloqueante |

## 16. Definicion de terminado global

- [ ] GeoFace produce marcas confiables con rostro, GPS, zona oficial y evidencia.
- [ ] Horas Extras calcula y aprueba con reglas vigentes y tests completos.
- [ ] Integracion minima permite usar marcas GeoFace como evidencia/insumo HE.
- [ ] Seguridad/RBAC no fue degradada.
- [ ] Docker productivo contempla biometria-engine.
- [ ] APK probado en fisico.
- [ ] Reporte final en `docs/reviews/builds/` con comandos, resultados y riesgos residuales.
- [ ] Documentacion operativa actualizada.
