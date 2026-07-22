# Reporte de Revisión de Build — PR #22 HDI, últimos hallazgos

**Fecha:** 2026-07-22
**Build:** Endurecimiento final del contrato HDI y serialización de nómina
**Autor del build:** árbol de trabajo local
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/novedades_nomina/nomina_router.py`
- `backend_v2/app/services/novedades_nomina/{errores,hdi_extractor,nomina_service}.py`
- `testing/backend/{test_hdi_excel_security,test_hdi_extractor_grupos,test_nomina_rbac_concurrencia}.py`
- `testing/CATALOGO_PRUEBAS.md`

También se comprobó el impacto del servicio compartido sobre Otros Gerencia, Medicina Prepagada y Pólizas Vehículos. Los cambios frontend y de memoria presentes en el árbol no forman parte del dictamen backend.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | sí | Persiste una aceptación permisiva de tipos en dos campos obligatorios HDI. |

## 3. Hallazgos bloqueantes

### Media — El contrato de tipos de filas HDI aún acepta valores obligatorios mal tipados

`backend_v2/app/services/novedades_nomina/hdi_extractor.py:175-185` solo exige que `NOMBRES Y APELLIDOS` sea no vacío, por lo que una celda numérica o booleana se convierte con `str(...)` y se acepta como nombre. Para `PRIMA ANUAL`, `_limpiar_numero` (`hdi_extractor.py:38-84`) elimina cualquier carácter no numérico antes de convertir; una cadena mal formada que contenga dígitos puede convertirse en otro importe positivo y superar la validación. Por tanto, no queda garantizado el requisito de tipos exactos ni que **toda** fila con un obligatorio inválido aborte el lote.

Los tests agregados en `testing/backend/test_hdi_extractor_grupos.py:165-185` solo cubren nombre vacío y una prima sin ningún dígito (`valor-invalido`), de modo que no detectan esas aceptaciones. Se requiere validación léxica/tipado estricto antes de normalizar y regresiones con, al menos, nombre numérico/booleano y primas mal formadas con dígitos.

## 4. Hallazgos no bloqueantes

- `testing/backend/test_nomina_rbac_concurrencia.py:65-81` usa dos sesiones PostgreSQL reales y verifica que el segundo advisory lock no finaliza antes del commit de la primera. El `sleep(0.1)` no demuestra de forma determinista que la segunda tarea alcanzó el servidor antes del commit, por lo que la prueba conserva un riesgo bajo de falso positivo bajo carga extrema. No invalida la implementación observada.
- Persiste el riesgo previamente documentado de aritmética monetaria con `float`; no fue introducido por este endurecimiento.

## 5. Tests / comandos ejecutados

- Evidencia suministrada por el autor: **48 focused backend tests passed**.
- Evidencia suministrada por el autor: health checks **4 passed, 4 skipped**.
- Evidencia suministrada por el autor: `py_compile` — **PASS**.
- `git diff --check` — **PASS** durante esta revisión.
- `python -m pytest --collect-only testing/backend/test_hdi_extractor_grupos.py testing/backend/test_hdi_excel_security.py testing/backend/test_nomina_rbac_concurrencia.py` — no ejecutable en el host: `No module named pytest`. No se ejecutó Docker por restricción del rol.

La revisión estática confirma:

- Encabezados obligatorios exactos y detección de duplicados en `hdi_extractor.py:118-141`, sin inferencia posicional de columnas.
- Rechazo inmediato de filas obligatorias vacías o inválidas en los casos cubiertos en `hdi_extractor.py:146-185`.
- `ErrorEstructuraNomina` se publica como 422 y los demás `ValueError` se anonimizan en `nomina_service.py:113-123`.
- `pg_advisory_xact_lock` es PostgreSQL nativo, transaccional y se adquiere antes de guardar archivo, ejecutar `DELETE` o persistir (`nomina_service.py:176-205`).
- Los regresores del servicio compartido comprueban lock antes de delete, commit exitoso y rollback ante fallo de escritura (`test_nomina_rbac_concurrencia.py:101-187`).

## 6. Documentación actualizada

- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] Reporte de revisión bajo `docs/reviews/builds/`
- [ ] `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no cambiaron modelos ni esquema PostgreSQL.
- [ ] ADR/RBAC: no aplica; no se añadió módulo ni decisión arquitectónica nueva. Las rutas genéricas ahora reutilizan el permiso existente `nomina_novedades`.

## 7. Decisión final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

El lock transaccional, la propagación segura y la eliminación de inferencia posicional están correctamente resueltos. El build no satisface todavía el requisito explícito de tipos exactos para todos los campos obligatorios.

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Rechazar nombres no textuales y primas con gramática monetaria inválida antes de normalizar. | Autor del build | Antes de aprobar PR #22 |
| Añadir regresiones de fila completa para esos tipos inválidos. | Autor del build | Antes de aprobar PR #22 |
| Hacer determinista la prueba de llegada de la segunda sesión al lock. | Equipo backend | Recomendado |
