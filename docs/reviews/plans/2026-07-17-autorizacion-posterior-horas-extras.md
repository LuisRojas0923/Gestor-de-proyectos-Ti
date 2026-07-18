# Revisión de Plan: Autorización Posterior de Horas Extras

**Fecha:** 2026-07-17
**Plan:** Cálculos pendientes para empleados sin autorización HE
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Objetivo

Permitir que empleados sin autorización HE efectiva completen el planificador y generar un cálculo pendiente que solo pueda confirmarse mediante un permiso RBAC dedicado.

## 2. No-objetivos

- No cambiar fórmulas, factores legales ni contratos ERP.
- No habilitar la confirmación pendiente mediante el endpoint genérico de workflow.
- No modificar módulos móviles ni planillas regionales.

## 3. Archivos / módulos afectados

- `backend_v2/app/services/novedades_nomina/`
- `backend_v2/app/api/novedades_nomina/routers/`
- `backend_v2/app/core/{rbac_manifest,auditoria_manifest}.py`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/`
- `frontend/src/services/horasExtrasService.ts`
- `testing/backend/` y `frontend/src/tests/`
- `docs/` y `testing/CATALOGO_PRUEBAS.md`

## 4. Pasos de implementación

1. Crear pruebas TDD para persistencia pendiente, crédito único, bypass y RBAC.
2. Resolver autorización en backend y persistir `PENDIENTE_AUTORIZACION` sin acreditar bolsa.
3. Crear servicio y endpoint dedicado con bloqueo de fila, alcance de empleado e idempotencia.
4. Registrar `nomina_horas_extras.autorizar` en RBAC y auditoría.
5. Completar tipos, servicio, listado, planificador y botón frontend.
6. Ejecutar pruebas focales, lint, build y revisores obligatorios.

## 5. Comandos de validación

- `python -m pytest testing/backend/test_horas_extras_autorizacion.py testing/backend/test_horas_extras_rbac_granular.py -q`
- `npm run test -- src/tests/horasExtrasWorkflowService.test.ts src/tests/PlanificadorSemanalView.test.tsx src/tests/CalculoDetailAutorizacion.test.tsx --run`
- `npm run lint`
- `npm run build`

## 6. Impacto en documentación

- [x] `docs/ESQUEMA_BASE_DATOS.md`
- [x] Especificación funcional HE
- [x] `testing/CATALOGO_PRUEBAS.md`

## 7. Evaluación de riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Crédito duplicado por concurrencia | Media | `SELECT FOR UPDATE`, transición atómica y replay idempotente |
| Bypass por workflow genérico | Baja | Estado pendiente sin transiciones genéricas válidas |
| IDOR sobre cálculo | Media | `autorizar_calculo_id` antes de mutar |
| Costo OT duplicado | Baja | Se persiste una vez al finalizar; autorizar no recalcula costo |

## 8. Matriz de subagentes

| Subagente | Motivo | Resultado | Bloquea |
|---|---|---|---|
| scope-reviewer | Alcance transversal | Aprobable con controles definidos | No |
| backend-reviewer | Backend y transacciones | Pendiente revisión de build | No |
| frontend-reviewer | UI web | Pendiente revisión de build | No |
| docs-tests-reviewer | Evidencia y documentación | Pendiente revisión de build | No |
| security-rbac-reviewer | RBAC, alcance e idempotencia | Pendiente revisión de build | No |

## 9. Decisión final

- [x] `aprobado_con_riesgos`

Los riesgos quedan controlados por transacción, permiso dedicado, validación de alcance y pruebas focales.
