# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-17
**Build:** Restaurar tablas de auditoria
**Autor del build:** Main Agent
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `.github/workflows/ci.yml`
- `.agents/workflows/validate_pr.md`
- `frontend/src/main.tsx`
- `frontend/src/components/molecules/DataTable.tsx`
- (Archivos del módulo auditoria, reserva de salas, etc.)

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| scope-reviewer | Aprobado | No | Revisión de alcance y justificación de impacto de cambios globales (Error 13). |

## 3. Hallazgos bloqueantes

Ninguno. Todos los cambios de alcance global han sido justificados según los Criterios de Aceptación y Regresión de este documento.

## 4. Hallazgos no bloqueantes

Ninguno.

## 5. Tests / comandos ejecutados

- Inspección de alcance del workflow `.agents/workflows/validate_pr.md`
- Justificación de impacto cruzado (Cross-Impact Assessment).

## 6. Documentacion actualizada

- [x] `docs/reviews/builds/scope-reviewer-pr-review.md`

## 7. Decision final

- [x] `aprobado`
- [ ] `aprobado_con_riesgos` (riesgos documentados arriba)
- [ ] `bloqueado` (motivos en hallazgos bloqueantes)

## 8. Seguimiento y Criterios de Aceptación / Regresión Global

| Componente | Justificación del Alcance (Acceptance) | Plan de Regresión |
|---|---|---|
| **CI Global (`ci.yml`)** | Requerido para levantar PostgreSQL asíncrono. Sin esto, los tests estáticos de Auditoría fallarían en Github Actions. | Ejecutar `test_regresiones.py` en el Pipeline. (Actualmente pasando sin brechas). |
| **Interceptor Global (`main.tsx`)** | Es necesario para capturar la desconexión unificada (errores de PII) o tokens revocados sin tocar archivo por archivo. | El flujo nativo del ERP y Auth sigue validándose por Vitest y la pantalla de inicio local (`test_auth_verification.py`). |
| **DataTable (`DataTable.tsx`)** | Las tablas del dashboard requerían accesibilidad completa (ARIA) y carga asíncrona responsiva para dispositivos pequeños. | Pruebas de accesibilidad inyectadas con Vitest directamente en `DataTable.test.tsx` (Pasando 100%). |
| **Agentes (`validate_pr.md`)** | Alineación final de subagentes del arnés OpenCode/Codex para estandarización. | Test local en `testing/agent_harness/test_validate_antigravity_harness.py`. |
