# Revisión de build: ajuste de filtros y evidencias WBS

**Fecha:** 2026-07-16
**Build:** Alineación de filtros y carga confiable de evidencias WBS
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `frontend/src/components/molecules/FilterDropdown.tsx`
- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/components/molecules/FilePicker.tsx`
- `frontend/src/pages/DevelopmentDetail/WbsTab.tsx`
- `frontend/src/components/molecules/__tests__/DataTable.test.tsx`
- `frontend/src/components/molecules/__tests__/FilePicker.test.tsx`
- `testing/backend/test_actividad_archivos.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/reviews/plans/2026-07-16-ajuste-filtros-evidencias-wbs.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| scope-reviewer | Aprobado tras completar trazabilidad | No | Sin cambios móviles, de infraestructura ni backend. |
| frontend-reviewer | Aprobado con riesgos | No | Se reforzó cobertura de alineación predeterminada, orden y wrappers. |
| backend-reviewer | Aprobado | No | La prueba HTTP usa un ejecutor distinto del creador sin simular el permiso por recurso. |
| mobile-reviewer | Aprobado | No | El HTML corresponde únicamente al frontend web. |
| security-rbac-reviewer | Riesgo histórico documentado | No para este diff | El endpoint conserva autenticación, RBAC y doble autorización por recurso. |
| docs-tests-reviewer | Aprobado con riesgos | No | Catálogo y evidencia de comandos incluidos. |

## 3. Hallazgos bloqueantes

Ninguno introducido por el build.

## 4. Hallazgos no bloqueantes

- `usuario_puede_modificar_actividad` conserva una autorización histórica por coincidencia de nombres no únicos. No se modifica en este ajuste porque requiere una migración de modelo y política de acceso independiente.
- La suite frontend completa tiene seis fallos ajenos al diff en `MyDevelopmentsRequirements`, `MyDevelopmentsReview` y `RegisterSidebar`.
- El lint global tiene deuda preexistente: 506 errores y 56 advertencias.
- Dos assets de `frontend/dist/` aparecen modificados por normalización LF/CRLF, pero no tienen diff de contenido.

## 5. Tests / comandos ejecutados

- `npm run test -- --run src/components/molecules/__tests__/DataTable.test.tsx src/components/molecules/__tests__/FilePicker.test.tsx src/pages/DevelopmentDetail/WbsNodeModal.test.tsx` — PASS, 6 pruebas.
- `python -m pytest ../testing/backend/test_actividad_archivos.py` — PASS, 10 pruebas.
- `python -m pytest ../testing/backend/test_infrastructure.py ../testing/backend/test_regresiones.py` — PASS, 4 aprobadas y 4 omitidas.
- `npm run build` — PASS.
- `npx eslint <archivos modificados>` — PASS con 0 errores y 7 advertencias preexistentes en `WbsTab.tsx`.
- `npm run test -- --run` — FAIL global ajeno: 128 aprobadas, 2 omitidas y 6 fallidas en tres archivos no modificados.
- `npm run lint` — FAIL global ajeno: 506 errores y 56 advertencias preexistentes.
- `git diff --check` — PASS.

## 6. Documentación actualizada

- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] Reportes de plan y build en `docs/reviews/`.
- [ ] `docs/ESQUEMA_BASE_DATOS.md`, no aplica porque no cambió el modelo.
- [ ] ADR, no aplica porque no se tomó una decisión arquitectónica nueva.

## 7. Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Migrar autorización histórica basada en nombres a identificadores únicos | Equipo backend/seguridad | Por definir |
| Corregir deuda global de lint y pruebas no relacionadas | Equipo frontend | Por definir |

## 9. Seguimiento: ancho y agrupación del filtro

Se confirmó que la columna WBS `Tarea`, con mínimo de 420 px y crecimiento flexible, expandía el popover. La alineación previa aplicaba `flex-1` al texto y dejaba el checkbox en el extremo contrario.

Cambios del seguimiento:

- `FilterDropdown` calcula un ancho efectivo único, limitado por prop y viewport.
- El ancho y la posición se recalculan con `resize` y `visualViewport.resize` mientras el filtro está abierto.
- WBS configura un máximo de 320 px; otros consumidores conservan su comportamiento predeterminado.
- Checkbox y texto forman un bloque `inline-flex` alineado completo a izquierda o derecha.
- Las etiquetas truncadas conservan nombre accesible completo y atributo `title`.
- `WbsTab.tsx` permanece en 550 líneas al retirar `isLoading={false}`, que era redundante.

Evidencia adicional:

- `npm run test -- --run src/components/molecules/__tests__/DataTable.test.tsx` — PASS, 5 pruebas.
- Ancla de 420 px — popover WBS de 320 px.
- Viewport de 320 px — popover de 296 px con margen lateral de 12 px.
- Redimensionamiento con el popover abierto — PASS, recalcula ancho y posición.
- Build de producción — PASS.
- ESLint de archivos modificados — 0 errores y 7 advertencias preexistentes en `WbsTab.tsx`.
- Suite frontend global — 129 aprobadas, 2 omitidas y los mismos 6 fallos ajenos en 3 archivos.
