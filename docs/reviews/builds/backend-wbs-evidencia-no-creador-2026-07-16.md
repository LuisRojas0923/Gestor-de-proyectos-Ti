# Revisión backend — autorización de carga de evidencia WBS

**Fecha:** 2026-07-16
**Build:** Evidencia WBS por usuario autorizado no creador
**Autor del build:** LuisRojas0923 (`ca5ddf76`)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `backend_v2/app/api/desarrollos/actividad_archivos_router.py`
- `backend_v2/app/services/desarrollos/actividad_access_service.py`
- Cobertura relacionada: `testing/backend/test_actividad_archivos.py`

Nota de baseline: los archivos se revisaron desde `main` (`1a181780`; implementación introducida por `ca5ddf76`). El checkout actual `Modulo_Geoface` no contiene `actividad_archivos_router.py` ni `usuario_puede_modificar_actividad`; en ese checkout el endpoint de carga no existe.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | aprobado_con_riesgos | No | Revisión estática de autorización, async, transacciones y pruebas |

## 3. Hallazgos bloqueantes

Ninguno para la implementación presente en `main`.

## 4. Hallazgos no bloqueantes

### MEDIO — falta una prueba que demuestre la autorización de un no creador

La suite existente prueba el ciclo HTTP con `usuario_puede_modificar_actividad` reemplazado por `AsyncMock(return_value=True)`. Por ello demuestra almacenamiento y endpoints, pero no demuestra que la política real permita cargar al asignado, responsable u otro participante no creador.

Prueba mínima requerida: autenticar un usuario B con permiso RBAC `developments`, crear o sembrar una actividad delegada por A y un desarrollo creado por A, asignar la actividad a B, ejecutar `POST /api/v2/actividades/{id}/archivo` como B sin mockear `usuario_puede_modificar_actividad`, y comprobar `200` más la persistencia de `archivo_url`.

### MEDIO — parte de la autorización depende de nombres no únicos

`usuario_puede_modificar_actividad` admite acceso por coincidencia de `Desarrollo.analista`, `supervisor`, `autoridad` o `responsable` con el nombre del usuario o de un subordinado. Nombres duplicados o modificables pueden ampliar acceso accidentalmente. La autorización por IDs de actividad/desarrollo es más robusta; este riesgo es preexistente y no equivale a una restricción exclusiva del creador.

### BAJO — consulta de modelo y orquestación transaccional permanecen en el router

El router ejecuta directamente `select(Actividad)` y coordina persistencia/rollback. No introduce acceso síncrono y delega almacenamiento y política a servicios, pero una separación estricta `api -> services -> models` movería `_obtener_actividad` y la unidad de trabajo a un servicio.

## 5. Quién puede cargar actualmente en `main`

Debe cumplirse todo lo siguiente:

1. Usuario autenticado.
2. Su rol tiene permiso activo `developments` en RBAC.
3. La actividad no está anulada.
4. El usuario o cualquiera de sus subordinados directos/indirectos es al menos uno de:
   - `Actividad.responsable_id`;
   - `Actividad.asignado_a_id`;
   - `Actividad.delegado_por_id`;
   - `Desarrollo.creado_por_id`;
   - `Desarrollo.responsable_id`;
   - o coincide por nombre con `Desarrollo.analista`, `supervisor`, `autoridad` o `responsable`.

No existe comparación exclusiva con el creador. `delegado_por_id` funciona como aproximación al creador de la actividad, pero es solo una alternativa entre varias. Tampoco hay bypass de modificación por ser `admin` o `director`: esos roles aún necesitan permiso `developments` y una relación de las anteriores.

## 6. Arquitectura async, transacciones y seguridad

- Endpoints, dependencia RBAC, jerarquía y consultas SQLAlchemy usan `async`/`await` y `AsyncSession`; no se observó DB síncrona.
- El multipart se recibe después de cerrar la transacción inicial de lectura.
- Después de guardar, se relee con `FOR UPDATE`, se reautoriza y se vuelve a validar `anulada` antes del commit, reduciendo TOCTOU y serializando reemplazos concurrentes.
- Los no autorizados reciben `404`, evitando enumeración por autorización de objeto.
- Hay autenticación, RBAC `developments`, rate limit, límite de cuerpo y validación del archivo delegada al servicio.
- No hay SQL específico de SQLite/MySQL ni cambios de esquema en estos dos archivos.
- Ambos archivos están por debajo de 550 líneas.

## 7. Tests / comandos ejecutados

- No se ejecutaron pruebas: el protocolo del revisor solo autoriza `pytest --collect-only`, y el archivo de prueba no existe en el checkout actual.
- Revisión estática de `testing/backend/test_actividad_archivos.py` desde `main`: existe cobertura de ciclo HTTP y rechazo RBAC, pero no del no creador con política real.

## 8. Documentación / RBAC

- `developments` ya está registrado en `backend_v2/app/core/rbac_manifest.py`; no requiere un módulo nuevo.
- No hay cambio de modelo o DDL en el alcance, por lo que no se requiere actualizar `docs/ESQUEMA_BASE_DATOS.md`.
- Registrar la prueba nueva en `testing/CATALOGO_PRUEBAS.md`.

## 9. Decisión final

- [ ] aprobado
- [x] aprobado_con_riesgos
- [ ] bloqueado

## 10. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Agregar prueba HTTP de carga por asignado no creador sin mock de autorización | Backend | Antes de cerrar el requisito |
| Sustituir gradualmente autorización por nombres por relaciones mediante IDs | Backend/Seguridad | Backlog de endurecimiento |
