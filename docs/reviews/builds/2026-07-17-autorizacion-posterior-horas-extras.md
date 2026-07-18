# Revisión de Build: Autorización Posterior de Horas Extras

**Fecha:** 2026-07-17
**Build:** Cálculos pendientes y autorización RBAC de horas extras
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Alcance y allowlist

- Backend HE: confirmación, autorización, workflow, planificador, schemas y router.
- Seguridad: `rbac_manifest.py`, `auditoria_manifest.py`, `rbac_discovery.py` y permisos HE.
- Frontend HE: planificador, panel de empleados, listado/detalle, servicio y tipos.
- Pruebas: autorización, RBAC, S7 y tres suites Vitest focales.
- Documentación: esquema, especificaciones HE/S7, catálogo, plan y este reporte.
- Se excluye todo cambio concurrente ajeno visible en el worktree, incluidos migraciones de horarios, planillas regionales, memoria de agentes y otros reportes.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| scope-reviewer | aprobado con controles | No | Definió límites, efectos y matriz requerida. |
| backend-reviewer | observación discrepante | No | Solicitó herencia legacy; se rechaza porque contradice mínimo privilegio y la decisión de seguridad. |
| frontend-reviewer | hallazgo corregido | No | Consulta por semana, fail-closed y limpieza de selección al cambiar semana. |
| security-rbac-reviewer | aprobado | No | Permiso exacto, alcance, concurrencia y no herencia legacy verificados. |
| docs-tests-reviewer | hallazgos corregidos | No | Se añadieron carrera del mismo cálculo, evidencia y vigencia documental. |

## 3. Decisiones de seguridad

- `nomina_horas_extras.autorizar` no forma parte de `PERMISOS_HE_GRANULARES` migrados desde el permiso legacy.
- El sincronizador lo concede automáticamente solo a `admin`; otros roles requieren asignación administrativa explícita.
- Esta separación es intencional y evita ampliar una autorización sensible de nómina por compatibilidad histórica.
- La autorización bloquea la fila del cálculo y la bolsa compartida. La creación de bolsa usa `INSERT ... ON CONFLICT DO NOTHING`.

## 4. Hallazgos bloqueantes

Ninguno pendiente.

## 5. Hallazgos no bloqueantes

- El lint global conserva deuda preexistente; el lint focal reporta 0 errores y 5 warnings `react-refresh/only-export-components` en el utilitario de tabla existente.
- El compose de desarrollo no define credenciales del rol migrador. Para la demo local se insertaron únicamente el módulo y permiso admin mediante PostgreSQL; producción debe ejecutar `python -m app.manage migrate` con roles configurados.

## 6. Tests y comandos ejecutados

- `pytest test_horas_extras_autorizacion.py` con PostgreSQL Docker: **5 passed**.
- `pytest test_horas_extras_autorizacion.py test_horas_extras_rbac_granular.py`: evidencia anterior **14 passed** antes de añadir la quinta carrera; RBAC aislado **10 passed**.
- `pytest test_horas_extras_s7.py::TestConfirmarPlan`: **7 passed**.
- Vitest planner + detail: **24 passed**; servicio workflow: **4 passed**. Total focal: **28 passed**.
- `npx eslint <archivos focales>`: **0 errores, 5 warnings preexistentes**.
- `npm run build`: **PASS**, 4027 módulos transformados.
- `python -m compileall -q backend_v2/app`: **PASS**.
- `git diff --check`: **PASS**.
- `GET /api/v2/health`: `{"estado":"saludable","version":"v2.1.0-DEV"}`.

## 7. Documentación actualizada

- [x] `docs/ESQUEMA_BASE_DATOS.md`: estado permitido, sin DDL nuevo.
- [x] Especificación principal HE: flujo vigente y propuesta antigua marcada como histórica.
- [x] Especificación S7: cierre pendiente, crédito diferido y permisos exactos.
- [x] `testing/CATALOGO_PRUEBAS.md`.
- [x] Plan y reporte de build.

No se ejecutó `scripts/sync_docs.py`: no cambió la estructura física de PostgreSQL; `estado` continúa como `VARCHAR(30)`. Solo se documentó un valor de dominio adicional. El drift no relacionado ya presente en `ESQUEMA_BASE_DATOS.md` queda fuera de esta allowlist.

## 8. Decisión final

- [x] `aprobado_con_riesgos`

El build está habilitado para demo. El riesgo operativo restante es configurar las credenciales del migrador en cada entorno antes del despliegue formal.

## 9. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Configurar roles del job migrador fuera de desarrollo | DevOps | Antes de despliegue |
| Asignar `nomina_horas_extras.autorizar` a roles no admin aprobados | Administrador RBAC | Según matriz de negocio |
