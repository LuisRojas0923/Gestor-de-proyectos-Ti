# Revisión de Build: Festivos en Planificador Semanal

**Fecha:** 2026-07-17
**Build:** Clasificación y persistencia de HF/HEFD/HEFN
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti
**Base local:** `a24f0e150b00546d4e3914fe3f577daf7c7242b7`

## 1. Alcance

- Precálculo y confirmación del planificador semanal.
- Calendario festivo Colombia, fechas ISO y semanas entre años.
- Trazabilidad diaria, costos OT y reversión por anulación.
- Contrato y visualización frontend de conceptos festivos.
- Pruebas S5, S7, S8 y Vitest focales.
- Se excluyen cambios concurrentes ajenos presentes en el worktree.

## 2. Causa raíz

`planificador_calculo.py` fijaba `es_festivo=False`, mientras confirmación,
trazabilidad y costos inferían únicamente HED/HEN. El flujo no consumía el
calendario que ya contenía el 13 de julio de 2026 como Virgen de Chiquinquirá.

## 3. Solución

- `planificador_clasificacion.py` produce una clasificación inmutable compartida.
- La semana se deriva y valida mediante calendario ISO.
- HF cubre la porción ordinaria festiva; HEFD/HEFN cubren el exceso.
- Novedades de supresión prevalecen y los fallos DB propagan.
- Precálculo y confirmación separan `total_horas_extras` de `total_horas_festivas`.
- OT usa UPSERT PostgreSQL, bloqueo de fila, reparto por horas/porcentaje con residuo y reversión desde filas exactas del snapshot diario.
- La reversión valida el hash de cada fila del snapshot y las transiciones bloquean el cálculo.
- Confirmación usa solo novedades `CONFIRMADO`; lectura y compensación de bolsa validan alcance.
- La UI presenta todos los conceptos del día y expone un nombre accesible.
- Borradores legados se migran y las respuestas tardías de otra semana se descartan.

## 4. TDD y evidencia

- Rojo inicial: **4 failed**, todos devolvían `es_festivo=False` o no confirmaban HF.
- Regresión OT roja: **2 failed** por porcentaje omitido y expectativa de distribución festiva.
- Conciliación monetaria roja: **1 failed** por recalcular la carga desde el bruto ya redondeado.
- Backend consolidado: **178 passed**, 12 warnings preexistentes
  (`testing/logs/test_report_2026-07-17_15-40-59.log`).
- Health check con backend activo: **3 passed**, 3 skipped por credenciales/datos opcionales.
- Frontend: **27 passed** en dos suites.
- Build Vite: **PASS**, 4028 módulos transformados.
- ESLint focal: **0 errores**, 0 warnings.
- `compileall`: **PASS**.
- `git diff --check`: **PASS**.

Comandos principales:

```powershell
docker compose run --rm -v "$((Get-Location).Path):/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2:/workspace backend pytest testing/backend/test_horas_extras_s1.py testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s4.py testing/backend/test_horas_extras_s5_festivos.py testing/backend/test_horas_extras_s5ppp_integracion.py testing/backend/test_horas_extras_s6.py testing/backend/test_horas_extras_s7.py testing/backend/test_horas_extras_s8_ot_mano_obra.py testing/backend/test_horas_extras_s10_trazabilidad_diaria.py testing/backend/test_horas_extras_planificador_festivos.py testing/backend/test_horas_extras_autorizacion.py testing/backend/test_horas_extras_rbac_granular.py -q
docker compose run --rm -v "$((Get-Location).Path):/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2:/workspace -e TEST_BASE_URL=http://backend:8000/api/v2 backend pytest testing/backend/test_regresiones.py -q
Push-Location frontend
npm run test -- src/tests/PlanificadorSemanalView.test.tsx src/tests/PlanificadorSemanalFestivos.test.tsx --run
npm run build
npx eslint src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx src/pages/ServicePortal/pages/HORAS_EXTRAS/components/EmpleadosActivosPanel.tsx src/pages/ServicePortal/pages/HORAS_EXTRAS/components/ResumenPlan.tsx src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft.ts src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/preCalculoPlanificador.ts src/tests/PlanificadorSemanalFestivos.test.tsx
Pop-Location
python -m compileall backend_v2/app/services/novedades_nomina backend_v2/app/models/novedades_nomina
git diff --check
```

## 5. S10

La suite dejó de ejecutar migraciones DDL desde el fixture. Usa la tabla creada
por el job migrador y limita el rol runtime a DML. Resultado final: **3 passed**.

## 6. Revisiones

| Revisor | Resultado final |
|---|---|
| `harness-router` | Matriz obligatoria aplicada |
| `backend-reviewer` | `approved_with_risks` |
| `frontend-reviewer` | `approved_with_risks` |
| `security-rbac-reviewer` | `approved_with_risks` |
| `docs-tests-reviewer` | `approved_with_risks` |
| `scope-reviewer` | `approved_with_risks` |

Se corrigieron paridad HE/HF, ISO, año cruzado, fail-closed, conceptos múltiples,
caché semanal, accesibilidad, reparto OT, reversión, alcance de bolsa y carreras.
Las pruebas cubren confirmaciones concurrentes de la misma OT y anulaciones
concurrentes. El permiso y endpoint de autorización posterior están registrados
en los manifiestos RBAC y de auditoría.

## 7. Riesgos residuales

- La tabla snapshot no tiene trigger append-only; la aplicación rechaza reversión
  si alguna fila no coincide con su hash persistido.
- La DB puede contener festivos adicionales a la base Emiliani si conserva todas
  las fechas legales locales; esta extensión es deliberada para calendarios
  administrativos autorizados.

## 8. Decisión

- [x] `approved_with_risks`

No quedan bloqueantes funcionales, de seguridad, frontend ni evidencia. Se acepta
el riesgo residual documentado de no contar todavía con un trigger append-only
para la tabla de snapshot.
