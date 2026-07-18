# Revisión final del merge origin/main

**Fecha:** 2026-07-18
**Build:** Integración de `origin/main` en `Modulo_Geoface`
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Alcance

- Backend: evidencias WBS, Líneas Corporativas, Nómina, cooperativas, ERP, auditoría y seguridad de archivos.
- Frontend: WBS, Líneas Corporativas, tablas, filtros, modales y accesibilidad.
- Infraestructura: volúmenes persistentes de nómina en producción y Pruebas3.
- Arnés: adaptadores Antigravity/OpenCode, documentación y validador.
- Pruebas y reportes de revisión del merge.

## 2. Subagentes ejecutados

| Subagente | Resultado final | Bloquea | Notas |
|---|---|---|---|
| harness-router | matriz emitida | No | Backend, frontend, seguridad, docs/tests y alcance obligatorios. |
| backend-reviewer | bloqueo corregido | No | La suite ERP se dividió; ambos archivos quedaron bajo 550 líneas. |
| frontend-reviewer | approved | No | Sin hallazgos bloqueantes. |
| frontend-table-specialist | approved_with_risks | No | Carga incremental de 200 filas; virtualización queda como mejora futura. |
| security-rbac-reviewer | approved | No | RBAC, uploads, PII, storage y rate limiter verificados. |
| docs-tests-reviewer | approved_with_risks | No | Persistencia, catálogo y 11 adaptadores confirmados. |
| scope-reviewer | bloqueo documental corregido | No | Este reporte cierra la matriz sobre el snapshot staged. |

## 3. Hallazgos bloqueantes

Ninguno pendiente.

## 4. Riesgos no bloqueantes

- Faltan pruebas HTTP específicas de respuesta `429` para WBS, Beneficiar y Grancoop.
- Los advisory locks tienen pruebas unitarias; falta una carrera con dos sesiones PostgreSQL reales.
- Un rollback posterior a la escritura física puede dejar un archivo huérfano. La guía operativa define cuarentena y limpieza auditada.
- La virtualización genérica de `DataTable` queda pendiente; Equipos y Personas limitan el render inicial y permiten cargar lotes adicionales.
- `docker compose config --quiet` no pudo completarse sin las variables y archivos secretos obligatorios de cada entorno.

## 5. Verificación

- Backend focal de seguridad, cooperativas, ERP, facturas y líneas: `78 passed`.
- ERP después de dividir la suite: `15 passed`.
- Frontend focal final: 24 casos verdes entre DataTable, Modal, Select, gestores, facturas y hook.
- `npx tsc --noEmit`: PASS.
- ESLint focal: PASS.
- `npm run build`: PASS, 4.039 módulos.
- Infraestructura/regresiones: `4 passed, 4 skipped` por dependencias ERP externas.
- Arnés Antigravity: `22 passed`; validador: PASS con 11 adaptadores.
- `pre-commit run`: PASS completo sobre el índice final.

## 6. Documentación

- `testing/CATALOGO_PRUEBAS.md` actualizado.
- `docs/GUIA_ALMACENAMIENTO_NOMINA.md` documenta volumen, backup, restauración, retención y huérfanos.
- No hubo cambio de esquema; `docs/ESQUEMA_BASE_DATOS.md` no requiere actualización.
- Los reportes previos bloqueados se conservan como trazabilidad de hallazgos y correcciones.

## 7. Decisión final

- [ ] aprobado
- [x] aprobado_con_riesgos
- [ ] bloqueado

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Añadir pruebas HTTP `429` de uploads limitados | Equipo backend | Próxima iteración de seguridad |
| Añadir carreras PostgreSQL reales para reemplazos por período | Equipo backend | Próxima iteración de integración |
