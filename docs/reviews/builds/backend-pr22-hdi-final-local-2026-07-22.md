# Reporte de Revisión de Build — PR #22 HDI, backend local final

**Fecha:** 2026-07-22
**Build:** Cierre de contrato HDI, RBAC y concurrencia de nómina
**Autor del build:** árbol de trabajo local
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/novedades_nomina/nomina_router.py`
- `backend_v2/app/services/novedades_nomina/errores.py`
- `backend_v2/app/services/novedades_nomina/hdi_extractor.py`
- `backend_v2/app/services/novedades_nomina/nomina_service.py`
- `testing/backend/test_hdi_excel_security.py`
- `testing/backend/test_hdi_extractor_grupos.py`
- `testing/backend/test_nomina_rbac_concurrencia.py`
- `testing/CATALOGO_PRUEBAS.md`

Se revisaron además `dependencies.py`, `routers/otros_hdi.py` y el registro `nomina_novedades` del manifiesto RBAC. Los cambios frontend y de memoria presentes en el árbol quedan fuera de este dictamen backend.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | aprobado | no | Sin hallazgos funcionales o de seguridad bloqueantes en el alcance solicitado. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes

### BAJO — Falta una regresión positiva explícita para importe US con decimales

La gramática y conversión admiten correctamente `1,234,567.89` en `backend_v2/app/services/novedades_nomina/hdi_extractor.py:62-79`, pero las aserciones positivas de `testing/backend/test_hdi_extractor_grupos.py:6-14,293-314` ejercitan COP y agrupación US sin decimales, no el formato US completo con miles y centavos. No bloquea porque la expresión regular y la rama de conversión son coherentes, y los casos adversariales sí están cubiertos en `test_hdi_extractor_grupos.py:202-216`.

### BAJO — Algunas pruebas de seguridad demuestran el control por una sola variante

La sanitización 500 se prueba directamente solo en preview (`testing/backend/test_nomina_rbac_concurrencia.py:221-232`), aunque todos los handlers genéricos revisados devuelven literales genéricos en `nomina_router.py:120-123,135-139,205-210,221-225,267-273,294-299,340-354,389-394`. Asimismo, la prueba de descarga usa una ruta externa normalmente inexistente (`test_nomina_rbac_concurrencia.py:235-248`), por lo que puede terminar en el `resolve(strict=True)` antes de alcanzar la comparación de confinamiento. La implementación estática sí resuelve symlinks y exige padre inmediato igual a la raíz en `nomina_router.py:230-243`.

### BAJO — La sincronización de la prueba PostgreSQL usa una espera temporal

`testing/backend/test_nomina_rbac_concurrencia.py:70-87` valida con dos sesiones reales que el segundo lock espera al commit, pero `sleep(0.1)` no confirma de manera determinista que la segunda consulta ya llegó al servidor. Es un riesgo menor de falso positivo de prueba, no un defecto observado del uso de `pg_advisory_xact_lock`.

## 5. Tests / comandos ejecutados

- Evidencia aportada por el solicitante: **68 pruebas focalizadas pasan en Docker**.
- Evidencia aportada por el solicitante: health **4 passed / 4 skipped**.
- `python -m pytest --collect-only testing/backend/test_hdi_extractor_grupos.py testing/backend/test_hdi_excel_security.py testing/backend/test_nomina_rbac_concurrencia.py` — no ejecutable en host: `No module named pytest`.
- No se ejecutó Docker por restricción del rol `backend-reviewer`.

Validación estática focal:

- `NOMBRES Y APELLIDOS` rechaza valores no `str`, vacíos incluidos (`hdi_extractor.py:189-194`); regresiones numérica, booleana y flotante en `test_hdi_extractor_grupos.py:188-199`.
- `PRIMA ANUAL` rechaza booleanos, no finitos, cadenas con basura y gramáticas ambiguas/mal agrupadas; exige valor positivo (`hdi_extractor.py:39-98,196-204`), con adversariales en `test_hdi_extractor_grupos.py:202-216`.
- Las rutas genéricas sensibles tienen `Depends(requiere_permiso_nomina_novedades)` y pruebas 401/403 para ocho rutas (`nomina_router.py:58-62,125-128,192-196,212-215,246-250,275-278,301-304,375-378`; `test_nomina_rbac_concurrencia.py:21-51`). El permiso coincide con `rbac_manifest.py`.
- Los 500 del router genérico no interpolan excepciones en la respuesta; los detalles quedan en logs de servidor.
- La descarga usa `Path.resolve(strict=True)`, rechaza symlinks/rutas externas y solo sirve archivos regulares directamente bajo `uploads/nomina` (`nomina_router.py:230-243`).
- El lock PostgreSQL es transaccional, parametrizado y estable por subcategoría/año/mes; se adquiere antes de escritura física, `DELETE` y persistencia (`nomina_service.py:18-28,176-203`).
- Archivo, borrado y nuevas filas quedan coordinados con publicación física atómica, rollback y eliminación compensatoria (`nomina_service.py:159-174,183-203,293-303`).
- El commit corre en tarea protegida con `shield`; ante cancelación se espera su resultado antes de marcar la confirmación y relanzar, evitando borrar un archivo ya referenciado por una transacción confirmada (`nomina_service.py:205-212,293-303`). La regresión está en `test_hdi_excel_security.py:230-300`.
- Los archivos revisados permanecen bajo el máximo de 550 líneas. No hay cambios de modelos/esquema ni SQL ajeno a PostgreSQL.

## 6. Documentación actualizada

- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] Reporte final en `docs/reviews/builds/`
- [ ] `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no cambiaron modelos ni estructura DB.
- [ ] ADR/RBAC: no aplica; se reutiliza el permiso registrado `nomina_novedades`.

## 7. Decisión final

- [x] `aprobado`
- [ ] `aprobado_con_riesgos`
- [ ] `bloqueado`

Los bloqueantes previos sobre tipos estrictos, RBAC genérico, exposición de errores, confinamiento de descarga y cancelación durante commit están corregidos. Los riesgos restantes son exclusivamente mejoras de cobertura.

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Añadir caso positivo `1,234,567.89` y variantes límites COP/US. | Equipo backend | Recomendado |
| Parametrizar sanitización 500 y probar una ruta externa existente/symlink. | Equipo backend | Recomendado |
| Sustituir el `sleep` de la prueba del advisory lock por sincronización observable. | Equipo backend | Recomendado |
