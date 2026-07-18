# Revisión de plan: ajuste de filtros y evidencias WBS

**Fecha:** 2026-07-16
**Plan:** Ajustar filtros y carga de evidencias del módulo de actividades
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Alinear a la derecha los textos de `FilterDropdown` únicamente en el WBS, mantener checkbox y texto como un bloque, limitar el ancho del popover, corregir el área clicable de `FilePicker` y confirmar que un ejecutor autorizado puede cargar evidencia sin ser creador de la tarea.

## 2. No-objetivos

- No cambiar la lógica de apertura vertical del popover.
- No retirar la autorización por recurso ni modificar RBAC.
- No modificar `movil/` ni `modulo_actividades_fork/`.

## 3. Archivos / módulos afectados

- `frontend/src/components/molecules/{FilterDropdown,DataTable,FilePicker}.tsx`
- `frontend/src/pages/DevelopmentDetail/WbsTab.tsx`
- `frontend/src/components/molecules/__tests__/`
- `testing/backend/test_actividad_archivos.py`
- `testing/CATALOGO_PRUEBAS.md`

## 4. Pasos de implementación

1. Exponer alineación de texto configurable con izquierda como valor predeterminado.
2. Activar alineación derecha y ancho máximo de 320 px únicamente desde `WbsTab`.
3. Alinear checkbox y texto como grupo y limitar el ancho al viewport con margen de 12 px.
4. Mantener con altura completa el wrapper interno del input de archivo.
5. Añadir pruebas frontend y backend de regresión.

## 5. Comandos de validación

- `npm run test -- --run <pruebas focalizadas>`
- `npm run build`
- `npx eslint <archivos modificados>`
- `python -m pytest ../testing/backend/test_actividad_archivos.py`
- `python -m pytest ../testing/backend/test_infrastructure.py ../testing/backend/test_regresiones.py`

## 6. Impacto en documentación

- [x] `testing/CATALOGO_PRUEBAS.md`
- [ ] Esquema de base de datos, no aplica.
- [ ] ADR, no aplica porque no se introduce una decisión arquitectónica durable.

## 7. Evaluación de riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Cambiar todos los filtros compartidos | Media | Prop opcional con izquierda predeterminada y activación solo en WBS. |
| Exponer evidencia de tareas ajenas | Alta | Conservar RBAC y `usuario_puede_modificar_actividad`. |
| Input real sin área clicable | Media | Dar `h-full` al wrapper intermedio y cubrirlo con prueba estructural. |

## 8. Matriz de subagentes

| Subagente | Motivo | Resultado | Bloquea |
|---|---|---|---|
| scope-reviewer | Validar alcance | Bloqueo inicial resuelto al confirmar worktree sobre `main` | No |
| frontend-reviewer | UI, accesibilidad y sistema de diseño | Aprobado con riesgos mitigados | No |
| frontend-table-specialist | Geometría y UX del filtro | Aprobado con riesgos mitigados | No |
| backend-reviewer | Autorización y async | Aprobado con riesgos | No |
| mobile-reviewer | Descartar impacto móvil | Aprobado | No |
| docs-tests-reviewer | Validar evidencia y documentación | Bloqueo resuelto con reporte de build | No |
| security-rbac-reviewer | Evitar escritura horizontal | Aprobado conservando autorización | No |

## 9. Decisión final

- [x] `aprobado_con_riesgos`
- [ ] `aprobado`
- [ ] `bloqueado`

## 10. Notas adicionales

El seguimiento de ancho y agrupación se ejecuta en `fix/wbs-filter-dropdown-layout`, dentro de un worktree creado desde `origin/main`.
