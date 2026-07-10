# Revision de Plan - Autogestion de usuarios activos ERP

**Fecha:** 2026-07-06
**Plan:** autogestion de usuarios activos ERP
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Corregir el flujo de primer acceso y registro para que los usuarios nuevos puedan autogestionarse sin activacion manual cuando el ERP confirme que tienen contrato/estado activo en el establecimiento.

La solucion debe reemplazar la politica previa de aprobacion manual por una validacion estricta contra ERP como fuente de verdad, sin abrir acceso a empleados inactivos, no encontrados, con ERP no disponible, ni a usuarios desactivados manualmente.

Evidencia actual:

- `backend_v2/app/services/auth/provisioning_service.py:173-182` crea usuarios de registro publico con `esta_activo=False`.
- `backend_v2/app/api/auth/login_router.py:113-154` crea usuarios JIT con `esta_activo=settings.jit_auto_aprobar` y devuelve 403 si el flag es falso.
- `backend_v2/app/api/auth/login_router.py:197-201` rechaza cualquier usuario con `esta_activo=False`.
- `backend_v2/app/api/auth/public_auth_router.py:225-229` responde que la cuenta queda pendiente de aprobacion.
- `testing/backend/test_jit_approval.py:1-151` prueba la politica anterior de aprobacion manual por defecto.
- `backend_v2/app/services/erp/empleados_service.py:31-35` filtra `C.estado = 'Activo'` dentro de un `LEFT JOIN`, lo que puede devolver establecimiento sin contrato activo.

## 2. No-objetivos

- No crear migraciones ni cambiar el modelo `Usuario` salvo que en implementacion se decida agregar una marca explicita para distinguir pendientes de desactivados manuales.
- No reactivar usuarios existentes con `esta_activo=False` de forma masiva.
- No crear pantallas administrativas nuevas de aprobacion.
- No modificar `rbac_manifest.py` si no se agregan endpoints o modulos nuevos.
- No tocar `modulo_actividades_fork/`.
- No refactorizar todo auth, ERP o frontend fuera del flujo de primer acceso.

## 3. Archivos / modulos afectados

- `backend_v2/app/services/erp/empleados_service.py`
- `backend_v2/app/services/auth/provisioning_service.py`
- `backend_v2/app/api/auth/login_router.py`
- `backend_v2/app/api/auth/public_auth_router.py`
- `backend_v2/app/api/auth/profile_router.py` si `/auth/setup-password` crea usuarios nuevos por ERP.
- `backend_v2/app/core/config.py` si se depreca o cambia la semantica de `jit_auto_aprobar`.
- `testing/backend/test_jit_approval.py`
- `testing/backend/test_jit_contrasena_eq_cedula.py`
- `testing/backend/test_jit_race.py`
- `testing/backend/test_setup_password.py`
- Nuevos tests backend para registro publico y validacion ERP activa.
- `frontend/src/pages/Login.tsx` si cambia el manejo de errores de login/primer acceso.
- `frontend/src/pages/Login/RegisterSidebar.tsx` para reemplazar textos de pendiente por validacion ERP/autogestion.
- `testing/CATALOGO_PRUEBAS.md` para registrar las suites JIT/registro actualizadas.
- `docs/GUIA_DESARROLLO.md` y `.env.example` si `jit_auto_aprobar` queda obsoleto o cambia de significado.

## 4. Pasos de implementacion

1. Corregir la validacion de empleado activo en ERP.
2. Cambiar `EmpleadosService.obtener_empleado_por_cedula(..., solo_activos=True)` para que no devuelva filas sin contrato activo.
3. Verificar defensivamente que el resultado tenga `estado == "Activo"` antes de autoactivar.
4. Eliminar `print()` con PII en los caminos tocados y usar logging redacted si hace falta.
5. Crear o centralizar una funcion de servicio para validar autogestion, por ejemplo `validar_empleado_activo_autogestion(db_erp, cedula)`.
6. Hacer que la funcion falle cerrado si `db_erp` no existe, ERP falla, el empleado no existe, el contrato no esta activo o `estado` viene vacio.
7. Normalizar `viaticante` para no usar `bool(valor)` con strings como `"N"`, `"False"` o `"0"`.
8. Aplicar la misma validacion a JIT en `/auth/login`.
9. Para usuario nuevo con ERP activo, crear con `esta_activo=True`, hash temporal pendiente y devolver `400` con `X-Password-Not-Set: true` para configurar contrasena antes de entregar token.
10. Para ERP inactivo/no encontrado/no disponible en login, no crear usuario, no hacer commit y devolver respuesta publica no enumerable.
11. Aplicar la misma validacion a `/auth/registro`.
12. Para registro publico con ERP activo, crear con `esta_activo=True`, contrasena configurada por el usuario y mensaje de cuenta habilitada.
13. Para registro publico sin ERP activo, rechazar sin crear usuario y con mensaje generico.
14. Revisar `/auth/setup-password` en `profile_router.py`; si crea usuarios nuevos desde ERP, debe exigir la misma validacion activa.
15. No reactivar automaticamente usuarios existentes con `esta_activo=False` salvo que exista una marca explicita de pendiente creada por autogestion y se defina una regla auditada.
16. Controlar `IntegrityError` en registro publico con rollback y respuesta controlada para duplicados/carreras.
17. Redefinir `jit_auto_aprobar`: preferencia del plan es deprecarlo para autogestion o dejarlo solo como compatibilidad sin poder activar usuarios que ERP no confirme activos.
18. Actualizar textos de `RegisterSidebar.tsx` para indicar validacion contra ERP/establecimiento y exito de cuenta habilitada.
19. Mantener `PasswordSetupModal` si JIT sigue creando cuenta activa sin contrasena configurada.
20. Actualizar tests backend que codifican la politica anterior.
21. Ejecutar validaciones backend y frontend aplicables.

## 5. Criterios de aceptacion

- Usuario nuevo no existente localmente y activo en ERP/establecimiento queda `esta_activo=True`.
- Usuario nuevo activo por JIT no recibe token hasta configurar contrasena.
- Usuario nuevo activo por registro publico puede iniciar sesion con la contrasena registrada.
- Usuario no encontrado, inactivo, con `estado=None`, sin contrato activo o con ERP no disponible no se crea ni se activa.
- Usuario existente con `esta_activo=False` no se reactiva automaticamente solo por aparecer activo en ERP.
- Los roles autoasignados quedan limitados a `usuario` o `viaticante`.
- Los mensajes publicos no revelan si una cedula existe en ERP.
- Se conserva la regla de que la contrasena no puede ser igual a la cedula.
- Se conservan rate limits, lockout por cuenta y auditoria de login.

## 6. Comandos de validacion

- `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/test_jit_approval.py testing/backend/test_jit_contrasena_eq_cedula.py testing/backend/test_jit_race.py testing/backend/test_setup_password.py -v`
- `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/test_auth_escalation.py testing/backend/test_config_pending_pwd.py -v`
- `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v`
- `cd frontend; npm run lint`
- `cd frontend; npm run test`
- `cd frontend; npm run build`

## 7. Pruebas minimas requeridas

- JIT con ERP activo crea usuario activo y retorna `400` con `X-Password-Not-Set`.
- JIT con `jit_auto_aprobar=False` no bloquea a un empleado activo confirmado si el flag queda deprecado.
- JIT con `jit_auto_aprobar=True` no activa empleados inactivos/no encontrados.
- JIT con establecimiento existente pero contrato no activo no crea usuario.
- JIT con ERP caido/no disponible no crea usuario.
- Registro publico con ERP activo crea usuario activo y devuelve mensaje de cuenta habilitada.
- Registro publico con ERP inactivo/no encontrado/no disponible rechaza sin `db.add` ni `commit`.
- Registro publico duplicado y carrera por `IntegrityError` hacen rollback y devuelven error controlado.
- `/auth/setup-password` solo crea usuario nuevo si ERP confirma activo.
- `viaticante` con `"N"`, `"False"`, `"0"`, `None` asigna rol `usuario`.
- Usuario existente inactivo manualmente no se reactiva automaticamente.
- Contrasena igual a cedula, con espacios o distinto case, se rechaza.
- Respuestas publicas para no encontrado/inactivo/no autorizado no permiten enumerar cedulas.

## 8. Impacto en documentacion

- [ ] `docs/ESQUEMA_BASE_DATOS.md` solo si cambia el modelo o se agrega campo persistido.
- [ ] `docs/decisions/ADR-NNN-autogestion-usuarios-erp.md` recomendado si `jit_auto_aprobar` se depreca como decision durable.
- [ ] `docs/bitacora/2026-07-06-autogestion-usuarios-activos-erp.md` recomendado al implementar.
- [ ] `docs/GUIA_DESARROLLO.md` si cambia la semantica de `jit_auto_aprobar` o variables de entorno.
- [ ] `.env.example` si se agrega, renombra o depreca una variable auth.
- [ ] `testing/CATALOGO_PRUEBAS.md` para listar suites JIT/registro actualizadas.

## 9. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Autoactivar empleados no activos por el `LEFT JOIN` actual | Alta | Corregir query ERP y validar `estado == "Activo"` defensivamente |
| Reactivar usuarios desactivados manualmente | Alta | No autoactivar usuarios existentes `esta_activo=False` sin marca explicita y auditoria |
| Enumeracion de cedulas por mensajes diferentes | Media | Usar respuestas genericas en endpoints publicos y mantener rate limits |
| `jit_auto_aprobar` activa usuarios sin ERP activo | Media | Deprecarlo o impedir que sobreescriba la validacion ERP activa |
| Roles excesivos por autogestion | Media | Permitir solo `usuario`/`viaticante` y normalizar `viaticante` |
| Regresion en flujo de contrasena pendiente | Media | Mantener `X-Password-Not-Set` y cubrir con tests |
| Carreras de registro/JIT terminan en 500 | Media | Manejar `IntegrityError` con rollback y relectura/respuesta controlada |
| Dependencia fuerte del ERP afecta primer acceso | Media | Fail closed y mensaje claro; no crear usuarios parciales |

## 10. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
graphify-searcher x3 | Localizacion inicial de auth, modelos y frontend | completado | no
harness-router | Recomendacion de matriz | completado | no
scope-reviewer | Validar alcance y limites | approved_with_risks | no
backend-reviewer | Auth FastAPI, provisioning, ERP, tests | blocked hasta incluir validacion ERP activa estricta y setup-password | si para build si se omite
security-rbac-reviewer | Seguridad, RBAC, enumeracion, activacion automatica | blocked hasta agregar salvaguardas | si para build si se omite
frontend-reviewer | Mensajes login/registro y design system | approved_with_risks | no
docs-tests-reviewer | Tests, evidencia y documentacion | approved_with_risks | no
mobile-reviewer | Sin alcance mobile | no aplica | no
```

## 11. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` (riesgos documentados arriba)
- [ ] `bloqueado` (motivos en columna "Bloquea")

El plan queda aprobado con riesgos porque incorpora los bloqueos de backend y seguridad como precondiciones obligatorias de implementacion. La implementacion debe bloquearse si intenta autoactivar sin validar contrato/estado activo real en ERP o si reactiva usuarios existentes inactivos sin una marca explicita de pendiente/autogestion.

## 12. Notas adicionales

- `frontend-reviewer` guardo un reporte relacionado en `docs/reviews/builds/frontend-autogestion-usuarios-nuevos-2026-07-06.md`.
- `docs-tests-reviewer` reporto que `python -m pytest --collect-only testing/backend/test_jit_approval.py testing/backend/test_jit_contrasena_eq_cedula.py testing/backend/test_config_pending_pwd.py testing/backend/test_jit_race.py` recolecta 26 tests en el estado actual.
- No se recomienda activar automaticamente usuarios pendientes historicos hasta tener una marca que diferencie pendiente de aprobacion vs desactivacion manual.
