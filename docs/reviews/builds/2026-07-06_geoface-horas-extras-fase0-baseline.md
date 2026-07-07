# Build Review - Fase 0 GeoFace + Horas Extras

**Fecha:** 2026-07-06
**Build:** Baseline y control de alcance para produccion GeoFace + Horas Extras
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` - se documento que la carga manual de horarios de HE se conserva como respaldo operativo aunque se integre GeoFace.
- `docs/reviews/builds/2026-07-06_geoface-horas-extras-fase0-baseline.md` - reporte inicial de baseline de Fase 0.

No se modifico codigo de `backend_v2/`, `frontend/` ni `movil/` en esta fase.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| harness-router | completado | no | Recomendo `docs-tests-reviewer` y `security-rbac-reviewer` como obligatorios para cerrar Fase 0. |
| docs-tests-reviewer | bloqueado para cierre completo de Fase 0 | si | Baseline util; decision final debia reflejar que hay bloqueantes humanos y revisiones pendientes. |
| security-rbac-reviewer | bloqueado para cierre completo de Fase 0 | si | Falta decision HTTPS/VPN/LAN, `biometria-engine` en prod/Pruebas3 y controles fuertes para horarios manuales. |

## 3. Baseline tecnico

| Item | Estado |
|---|---|
| Rama | `Modulo_Geoface` |
| Commit base registrado | `961184d docs(movil-nomina): planifica cierre geoface y horas extras` |
| Estado git inicial de esta fase | `## Modulo_Geoface...origin/Modulo_Geoface` con modificacion documental en el plan |
| Plan principal | `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` |
| Estado app movil revisado | `docs/reviews/plans/2026-07-05_estado-actual-app-movil-geoface.md` |
| Ambiente local Docker | Existe `docker-compose.yml` con `biometria-engine` |
| Ambientes productivos/Pruebas3 | `docker-compose.prod.yml` y `docker-compose.Pruebas3.yml` existen, pero el grep inicial no encontro `biometria-engine` en esos compose |
| App movil | `movil/package.json` solo tiene scripts `start`, `android`, `ios`, `web`; no hay `typecheck`, `lint` ni `test` |
| Frontend HE | `frontend/package.json` tiene `build`, `lint` y `test` |
| Tests HE descubiertos | `testing/backend/test_horas_extras_s0.py` a `s9`, `test_horas_extras_parametros_calculo.py` |
| Tests biometria descubiertos | `test_biometria_engine_api.py`, `test_biometria_engine_client.py`, `test_biometria_service.py`, `test_biometria_router_engine.py` |

## 4. Alcance operativo confirmado

- GeoFace sera insumo/evidencia para HE, no reemplazo total de la operacion manual.
- HE debe conservar la carga manual de horarios para novedades, fallas de app, ausencia de marca, ajustes autorizados o contingencia operativa.
- Si horario manual y marca GeoFace difieren, el flujo debe advertir y exigir revision humana antes de confirmar.
- No se automatiza al 100% la liquidacion desde GeoFace en la primera entrega.
- No se baja seguridad para ganar tiempo: JWT, RBAC, ownership y auditoria se mantienen como condicion del plan.

## 5. Pendientes de decision humana

| Pendiente | Decision requerida |
|---|---|
| Responsables por track | Asignar responsables de GeoFace movil, GeoFace backend/infra, HE backend, HE frontend, QA/docs y seguridad. |
| Ambiente objetivo | Confirmar si la semana cubre local Docker, Pruebas3, produccion o los tres. |
| HTTPS/VPN | Confirmar si piloto usa HTTPS/VPN o LAN controlada documentada temporalmente. |
| Dispositivos Android | Confirmar al menos 2 equipos fisicos para pruebas de APK. |
| Usuarios de prueba | Confirmar admin, empleado normal, empleado con OT y empleado sin rostro. |
| Reglas GH | Confirmar reglas vigentes: jornada 42h, nocturna, topes, bolsa, compensacion, festivos y Ley Emiliani. |

## 6. Hallazgos bloqueantes

### Alta - Fase 0 no puede cerrarse sin responsables, ambiente y usuarios de prueba

La Fase 0 exige responsables asignados, ambiente definido y usuarios de prueba confirmados. Esos datos no se pueden inferir desde el repositorio.

### Alta - Compose productivo/Pruebas3 debe validar `biometria-engine`

El servicio `biometria-engine` aparece en `docker-compose.yml`, pero el grep inicial solo encontro sus variables/servicio en ese archivo. Antes de produccion debe verificarse/agregarse en `docker-compose.prod.yml` y `docker-compose.Pruebas3.yml`.

### Alta - Seguridad de transporte pendiente para datos biometricos

GeoFace maneja JWT, fotos faciales, GPS y evidencias. La Fase 0 no puede cerrarse para piloto/productivo hasta decidir si se usara HTTPS, VPN o LAN controlada temporal con riesgo aceptado.

### Alta - Contingencia manual de horarios requiere controles obligatorios

Mantener horarios manuales es necesario para operacion, pero impacta nomina. Antes de integrarlo con GeoFace debe quedar restringido por RBAC a GH/jefe/admin autorizado, exigir motivo, usuario, fecha/hora, periodo afectado, evidencia/novedad asociada y auditoria inmutable.

## 7. Hallazgos no bloqueantes

### Media - App movil aun no tiene scripts de verificacion dedicados

`movil/package.json` no define `typecheck`, `lint` ni `test`. Esto ya esta previsto en Fase 1A.5, pero limita la evidencia automatica temprana.

### Media - El reporte previo de GeoFace ya identifica riesgos altos pendientes

El documento `docs/reviews/plans/2026-07-05_estado-actual-app-movil-geoface.md` mantiene riesgos criticos/altos en enrolamiento local, zonas locales, evidencias autenticadas y rutas legacy. Fase 1A debe tratarlos antes de la integracion con HE.

## 8. Tests / comandos ejecutados

- `git status -sb` - PASS, rama `Modulo_Geoface`; se documento cambio pendiente del plan.
- `git log --oneline -1` - PASS, commit base `961184d`.
- `git branch --show-current` - PASS, rama `Modulo_Geoface`.
- Busqueda de compose `docker-compose*.yml` - PASS, archivos local/prod/Pruebas3 presentes.
- Grep de `biometria-engine|BIOMETRIA_ENGINE|8010` en compose - PASS, encontrado solo en `docker-compose.yml`.
- Busqueda de tests HE y biometria - PASS, suites objetivo localizadas.
- Lectura de `movil/package.json` y `frontend/package.json` - PASS, scripts registrados.

No se ejecutaron tests automaticos porque Fase 0 no cambio codigo de producto. Las suites quedan para Fase 1A/1B/QA segun el plan.

## 9. Documentacion actualizada

- [x] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` actualizado con contingencia de horarios manuales.
- [x] `docs/reviews/builds/2026-07-06_geoface-horas-extras-fase0-baseline.md` creado como evidencia inicial.
- N/A `docs/ESQUEMA_BASE_DATOS.md` - no hubo cambios de modelos.
- N/A `testing/CATALOGO_PRUEBAS.md` - no hubo pruebas nuevas.

## 10. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

El baseline documental queda generado y es util para iniciar trabajo tecnico controlado. El cierre completo de Fase 0 queda bloqueado hasta confirmar responsables, ambiente, dispositivos, usuarios, reglas GH, decision HTTPS/VPN/LAN y compose productivo/Pruebas3 con `biometria-engine`.

## 11. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Confirmar responsables por track. | Equipo/PM | 2026-07-06 |
| Confirmar ambiente objetivo y politica HTTPS/VPN/LAN. | Equipo/Infra | 2026-07-06 |
| Confirmar dispositivos Android fisicos y usuarios de prueba. | Equipo/QA | 2026-07-06 |
| Confirmar reglas GH vigentes para HE. | GH/Nomina | 2026-07-06 |
| Definir controles RBAC/auditoria para horarios manuales de contingencia. | GH/Seguridad/Backend | 2026-07-07 |
| Validar/agregar `biometria-engine` en compose productivo y Pruebas3. | Backend/Infra | 2026-07-07 |
| Iniciar Fase 1A corrigiendo enrolamiento backend-source, zonas oficiales, evidencias con auth y rutas legacy. | Mobile/Backend | 2026-07-07 |
