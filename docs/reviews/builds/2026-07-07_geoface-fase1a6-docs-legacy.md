# Build Review - GeoFace Fase 1A.6 Limpieza Legacy y Documentacion Movil

**Fecha:** 2026-07-07
**Build:** Actualizacion documental de app movil y aislamiento de face-server legacy
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `movil/API_CONTRACT.md` - reemplaza contrato Flask `/v1/*` por contrato actual `/api/v2`.
- `movil/docs/CONTEXTO.md` - actualiza contexto con ruta `movil/`, `backend_v2` y `biometria-engine`.
- `movil/docs/ARQUITECTURA.md` - documenta arquitectura app -> backend -> engine -> DB/storage.
- `movil/docs/GUIA-DESARROLLO.md` - actualiza puerto 8000, `npm ci`, `.env`, EAS/APK y pruebas.
- `movil/CHECKLIST.md` - refleja estado real y pendientes productivos.
- `movil/face-server/README.md` - marca `face-server` como historico no productivo.
- `movil/docs/agents/*.md` - actualiza agentes que mencionaban Flask o `/v1/*` como runtime.
- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` - marca avances Fase 1A.6.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| mobile-reviewer | aprobado con riesgos | no | Pidio actualizar docs auxiliares legacy; corregido en `qa-tester.md` y `frontend-developer.md`. |
| security-rbac-reviewer | aprobado con riesgos | no | Contrato productivo alineado; `face-server` sigue como riesgo historico hasta eliminar/archivar. |
| docs-tests-reviewer | aprobado con riesgos | no | Pidio actualizar estado de revisores y corregir referencia legacy; aplicado. |

## 3. Hallazgos bloqueantes

Ninguno vigente antes de revisores.

## 4. Hallazgos no bloqueantes

### Media - `face-server/` sigue versionado

Se documento como historico no productivo. La eliminacion fisica queda pendiente de aprobacion del equipo para evitar borrar material que pueda usarse como referencia historica. Seguridad advierte que el codigo legacy no debe exponerse por CORS/rutas sin RBAC.

### Media - Referencias `/v1/*` permanecen solo como advertencia legacy

Las busquedas aun encuentran `/v1/*`, pero en frases que indican que no son contrato operativo.

## 5. Tests / comandos ejecutados

- `npm --prefix movil run typecheck` - PASS.
- Busqueda `modulo_autenticacion_facial_fork|:5005|servidor Flask|/v1/` en `movil/**/*.md` - solo quedan referencias historicas/no productivas.
- Actualizacion de `movil/docs/agents/qa-tester.md` y `movil/docs/agents/frontend-developer.md` para evitar recomendaciones legacy/base64.

## 6. Documentacion actualizada

- [x] `movil/API_CONTRACT.md`.
- [x] `movil/docs/CONTEXTO.md`.
- [x] `movil/docs/ARQUITECTURA.md`.
- [x] `movil/docs/GUIA-DESARROLLO.md`.
- [x] `movil/CHECKLIST.md`.
- [x] `movil/face-server/README.md`.
- [x] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md`.
- [x] `docs/reviews/builds/2026-07-07_geoface-fase1a6-docs-legacy.md`.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

La documentacion principal de `movil/` queda alineada con `/api/v2`, `backend_v2` y `biometria-engine`. Queda riesgo aceptado de mantener `face-server/` versionado hasta decision de eliminacion/archivo.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Decidir eliminar o archivar fisicamente `movil/face-server/`. | Equipo tecnico | 2026-07-08 |
| Validar APK preview en Android fisico. | Mobile/QA | 2026-07-08 |
| Continuar cierre de criterio de salida GeoFace. | Equipo tecnico | 2026-07-08 |
