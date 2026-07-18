# 📑 Catálogo Maestro de Pruebas - Gestor de Proyectos TI

Este documento centraliza la estrategia, catálogo y ejecución de pruebas del proyecto.

## 🎯 Estrategia de Testing

Nuestra estrategia se divide en tres capas fundamentales:
1. **Pruebas Unitarias/Integración (Backend)**: Validan lógica de negocio y endpoints API.
2. **Pruebas de Regresión**: Garantizan que las funcionalidades core no se rompan con nuevos cambios.
3. **Pruebas de Carga**: Miden el rendimiento bajo estrés.

---

## 📂 Catálogo de Pruebas Existentes

### 1. Backend (Pytest)
Ubicación: `testing/backend/`

| Módulo | Archivo | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **Infra Health** | `test_infrastructure.py` | **Crítico**: Escritura en disco (Adjuntos) y Puente ERP. | ⚠️ 1 PASSED / 1 SKIPPED sin ERP objetivo |
| **Regresiones** | `test_regresiones.py` | **Master Health Check**: Ciclo de vida, Adjuntos y RBAC. | ⚠️ 3 PASSED / 3 SKIPPED ERP tras cutover; aceptación FastAPI aislada OK |
| **Autenticación** | `test_auth_verification.py` | Verificación de correo y flujo de seguridad. | ✅ PASSED |
| **Autogestión ERP Auth** | `test_autogestion_usuarios_erp.py` | JIT, registro público y validación fail-closed contra empleados activos del ERP. | ✅ PASSED |
| **Setup Password** | `test_setup_password.py` | Configuración de contraseña primera vez (setup-password), estado (password-status) y login con password no configurado. | ⚠️ BLOQUEADO LOCAL: credenciales PostgreSQL |
| **Escalado de Roles** | `test_auth_escalation.py` | **Seguridad**: Escalado de roles, invalidación de sesiones, cambio forzado de contraseña. | ✅ PASSED |
| **Líneas Corp.** | `test_lineas_corporativas.py` | Gestión de equipos móviles y personal. | ✅ PASSED |
| **Core API** | `test_api_v2.py` | Salud general y Auth básico. | ✅ PASSED |
| **ERP Sync** | `test_requisiciones.py` | Sincronización de catálogos con el ERP. | ✅ PASSED |
| **ERP Empleados** | `test_erp_empleados_service.py` | Contrato ERP de empleado para HE: autorización, `beneficio.salario`, resolución de salario/ARL, firma de pre-liquidación y rechazo de importes manipulados. | ✅ PASSED |
| **Viáticos** | `test_viaticos.py` | Flujo de legalización y solicitudes. | ✅ PASSED |
| **Desarrollos** | `test_desarrollos_update.py` | Actualización de proyectos/desarrollos existentes y manejo 404. | ✅ PASSED |
| **Desarrollos Autoridad** | `test_desarrollos_autoridad.py` | Persistencia y respuesta del campo autoridad en proyectos/desarrollos. | ✅ PASSED |
| **Catálogos Desarrollos** | `test_tipos_desarrollo.py` | Catálogo de tipos de proyectos/desarrollos activo, semillado y ordenado. | ✅ PASSED |
| **Jerarquía Usuarios** | `test_jerarquia.py` | Árbol de subordinados, usuarios sin equipo y bloqueo de doble superior activo. | ✅ PASSED |
| **Jerarquía Organizacional** | `test_jerarquia_admin.py` | Reasignación de superiores, desactivación de relaciones, prevención de ciclos e historial. | ✅ PASSED |
| **Asignación Jerárquica** | `test_asignacion_desarrollos_actividades.py` | Persistencia de responsable, ejecutor, delegador y estado de validación. | ✅ PASSED |
| **Validaciones Asignación** | `test_validaciones_asignacion.py` | Creación automática de validaciones indirectas y resolución aprobada/rechazada. | ✅ PASSED |
| **Anulación Actividades** | `test_actividad_delete.py` | Anulación lógica recursiva de actividades, metadatos de anulación y limpieza de validaciones asociadas. | ✅ PASSED |
| **Prioridad Desarrollos** | `test_desarrollo_prioridad.py` | Ciclo CRUD de prioridades en desarrollos. | ✅ PASSED |
| **Notificaciones** | `test_notificaciones.py` | Ciclo CRUD de notificaciones persistentes de usuario. | ✅ PASSED |
| **Horas Extras S0 Semillas** | `test_horas_extras_s0.py` | Semillado, catalogo base, factores legales y topes iniciales del modulo. | ✅ PASSED |
| **Horas Extras S1 Calculo** | `test_horas_extras_s1.py` | Motor de calculo semanal, clasificacion HED/HEN/HEFD/HEFN/HF, HF ordinaria festiva dentro de 42h, separacion HF+HEFD, valores numericos festivos, pre-vigencia 44h/220 y validaciones de entrada. | ✅ PASSED |
| **Horas Extras S2 Confirmacion** | `test_horas_extras_s2.py` | Persistencia de calculo, detalle, bolsa, costo OT, idempotencia y auditoria desde usuario autenticado. | ✅ PASSED |
| **Horas Extras Endpoint Audit** | `test_horas_extras_endpoint_audit.py` | Endpoint de confirmación ignora `usuario_confirma` enviado por cliente y persiste el usuario autenticado. | ✅ PASSED |
| **Horas Extras S4 Workflow** | `test_horas_extras_s4.py` | Transiciones PAGADO/COMPENSADO/ANULADO, compensacion manual y persistencia endpoint-level con commit. | ✅ PASSED |
| **Horas Extras S5 Festivos** | `test_horas_extras_s5_festivos.py` | Calendario de festivos, cache, sincronizacion Calendarific y manejo de errores externos. | ✅ PASSED |
| **Horas Extras S5 Novedades** | `test_horas_extras_s5_novedades.py` | Eventos VAC/LIC/INC/AUS, solapes, confirmacion/anulacion y efecto sobre calculo HE. | ✅ PASSED |
| **Horas Extras S5'' Horario Semana** | `test_horas_extras_s5pp_horario_semana.py` | Horario pactado por dia editable, validaciones y compatibilidad con horario legacy. | ✅ PASSED |
| **Horas Extras S5''' Integracion** | `test_horas_extras_s5ppp_integracion.py` | Integracion horario diario + festivos + novedades en pre-liquidacion; festivos diurnos/nocturnos separan recargo ordinario HF y extra HEFD/HEFN. | ✅ PASSED |
| **Horas Extras S6 Bolsa** | `test_horas_extras_s6.py` | Bolsa desactivable, override por OT, ruta sin prefijo duplicado y RBAC en estado global. | ✅ PASSED |
| **Horas Extras S7 Planificador** | `test_horas_extras_s7.py` | Planificador semanal masivo, selector ERP protegido por RBAC, borrador, pre-calculo y confirmacion. | ✅ PASSED |
| **Horas Extras Planificador Festivos** | `test_horas_extras_planificador_festivos.py` | HF del 13-jul-2026, HF+HEFD/HEFN, novedades oficiales, actividad en snapshot, días únicos, semana entre años, contrato ISO y paridad confirmación/trazabilidad. | ⚠️ 13 casos; 2 focales nuevos PASS, suite DB pendiente por reset de PostgreSQL |
| **Horas Extras S8 OT/CC** | `test_horas_extras_s8_ot_mano_obra.py` | Reparto por horas/porcentaje con conciliación monetaria y residuo, concurrencia sobre la misma OT, validación del hash del snapshot y reversión exacta tras eliminar asignaciones mutables. | ✅ 10 PASSED |
| **Horas Extras S9 Reglas GH** | `test_horas_extras_s9_reglas_gh.py` | Reglas confirmadas por Gestion Humana: jornada semanal 42h/210h desde 2026-07-16, compensacion semanal, nocturna 19:00-06:00 y turnos cruzados en dos dias. | ✅ PASSED |
| **Horas Extras S10 Trazabilidad Diaria** | `test_horas_extras_s10_trazabilidad_diaria.py` | Persistencia del snapshot diario de 7 dias asociado al calculo confirmado; lectura de estados `DISPONIBLE`, `HISTORICO_SIN_SNAPSHOT` e `INCOMPLETO`, sin ejecutar DDL con el rol runtime. | ✅ 3 PASSED |
| **Horas Extras Parametros Calculo** | `test_horas_extras_parametros_calculo.py` | Consulta y edicion de reglas vigentes en `nomina_parametros_legales`; valida ruta sin prefijo duplicado, RBAC y uso de parametros editados. | ✅ PASSED |
| **Horas Extras RBAC Granular** | `test_horas_extras_rbac_granular.py` | Manifiesto RBAC granular, dependencias por ruta critica, lectura de plantillas para planificar/administrar, rechazo 403 y separacion confirmar/compensar. | ✅ PASSED |
| **Horas Extras Autorización Posterior** | `test_horas_extras_autorizacion.py` | Estado pendiente sin crédito, autorización idempotente, concurrencia de una misma autorización y sobre la bolsa compartida, y bloqueo del endpoint genérico. | ✅ 5 PASSED |
| **Biometría Engine Client** | `test_biometria_engine_client.py` | Mapeo saneado de errores del motor, contrato de embedding y rechazo de respuestas invalidas. | ✅ PASSED |
| **Biometría Service** | `test_biometria_service.py` | Flujo de negocio sin embedding, estado biométrico backend-source, geocerca backend, comparación vectorial y protección contra traversal en archivos. | ✅ PASSED |
| **Biometría RBAC/Router** | `test_biometria_router_engine.py` | Dependencia RBAC del módulo `biometria` y delegación del endpoint de estado biométrico. | ✅ PASSED |
| **Biometría Engine API** | `test_biometria_engine_api.py` | Token interno del servicio biométrico sin importar DeepFace durante colección. | ✅ PASSED |
| **Indicadores de Auditoría** | `test_auditoria_estadisticas.py` | Valida límites e integridad de rangos temporales del dashboard. | ✅ PASSED |
| **RBAC de Auditoría** | `test_auditoria_estadisticas_rbac.py` | Autoriza el dashboard por permiso efectivo y rechaza accesos sin permiso. | ✅ PASSED |
| **API de Auditoría** | `test_auditoria_estadisticas_http.py` | Contrato HTTP 401/403/200 del endpoint de indicadores. | ✅ PASSED |
| **Diagnóstico de Estados** | `test_validate_estados.py` | Manejo seguro de resultados y errores DB del script diagnóstico. | ✅ PASSED |
| **Horarios Plantillas - Contratos y Migración** | `test_horarios_plantillas.py` | Siete días, validación de francos y turnos nocturnos, migración PostgreSQL idempotente y preservación de usuarios. | ✅ PASSED (reporte focal) |
| **Horarios Plantillas - Servicio** | `test_horarios_plantillas_service.py` | CRUD versionado, búsqueda, historial, copy-on-apply, snapshots, replay/conflicto idempotente y rollback atómico. | ✅ PASSED (reporte focal) |
| **Alcance Gestor-Empleado** | `test_alcance_empleados.py` | Cédula canónica, M:N, límites bulk, autoedición, bypass admin, filtros/facetas, IDOR, RBAC y ciclo de sesión ERP. | ✅ PASSED (reporte focal) |
| **Actualización de Tickets** | `test_ticket_update_errors.py` | Preserva errores HTTP de negocio, sanea fallos inesperados, garantiza rollback y mantiene el evento WebSocket si falla una notificación nativa. | ✅ PASSED |
| **Horarios Migración/Integridad** | `test_horarios_migracion_seguridad.py` | Reparación de constraints PostgreSQL, rechazo de datos inválidos, triggers append-only y propagación de fallo crítico. | ✅ PASSED (reporte final) |
| **Startup/Migrador Fase 1P** | `test_startup_migration_roles.py` | Startup verify-only, job exclusivo, capacidad por archivo, sesiones hasheadas, schemas estrictos, namespace/ACL, ausencia de DDL runtime y allowlist. | ✅ 30 PASSED |
| **Anotaciones de Auditoría SQL** | `test_sql_audit_annotations.py` | Impide que comentarios `@audit-ok` formen parte de literales enviados mediante `sqlalchemy.text(...)`. | ✅ 1 PASSED (reporte focal) |
| **Sesión/Identidad Fase 1P** | `test_phase1p_auth_security.py` | Revocación fail-closed, refresh, reset CAS, guard JWT, onboarding de analistas, carrera de creación y payload MCP estricto. | ✅ 9 PASSED |
| **Autorización HTTP Fase 1P** | `test_phase1p_endpoint_security.py` | Scope MCP persistido, bloqueo de mutaciones REST, Panel Control autenticado, PII de lockout hasheada, recuperación uniforme, migrador sin JWT y módulos RBAC protegidos. | ✅ 8 PASSED |
| **Roles PostgreSQL Fase 1P** | `test_startup_migration_roles_postgres.py` | Dos migradores reales, FastAPI/Redis, reset concurrente, MCP, identidad protegida, namespace/ACL/trigger exactos y reparación de auditoría. | ✅ 1 PASSED en PostgreSQL 15 aislado |
| **Horarios Seguridad HTTP** | `test_horarios_security_http.py` | IDOR de cálculo, alcance SQL GeoFace, redacción de cédulas y `Cache-Control: no-store, private`. | ✅ PASSED (reporte final) |
| **Planificador Savepoints** | `test_planificador_savepoints.py` | Identidad canónica, éxito/error/éxito con savepoints y ciclo de sesión ERP del worker OT. | ✅ PASSED (reporte final) |
| **Horarios Segunda Revisión** | `test_horarios_segunda_revision.py` | IDOR antes de ERP, cédula canónica, recursos indirectos, GeoFace relacionado/no relacionado, RBAC, jefe contractual, ERP `503`, disponibilidad VAC/INC/LIC y overrides GET/POST con alcance, admin, canonicalización y no-store. | ✅ PASSED (incluida en 154) |
| **Overrides HE - Alcance** | `test_horarios_segunda_revision.py` (casos de overrides) | POST relacionado canoniza antes de mutar; POST/GET no relacionado no opera; GET relacionado/admin canoniza y usa `no-store, private`. | ✅ FOCAL 19 PASSED |
| **Concurrencia PostgreSQL Real** | `test_relaciones_concurrencia.py` | Dos sesiones reales: serialización de una relación con UUID distintos y replay concurrente del mismo ledger de aplicación. | ✅ 2 PASSED |
| **Horas Extras S7 Helpers** | `horas_extras_s7_helpers.py` | Helpers y fixtures extraídos de S7 para dividir la suite sin duplicar preparación del planificador. | Soporte de suite |

### 2. Frontend (Vitest)
Ubicación: `frontend/src/`

| Módulo | Archivo | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **Registro** | `pages/Login/RegisterSidebar.test.tsx` | Mensajes de autoactivación y normalización de errores de registro. | ✅ PASSED |
| **Áreas** | `components/molecules/__tests__/AreaAutocomplete.test.tsx` | Selector buscable cerrado, requerido y con opciones estrictas. | ✅ PASSED |
| **Anulación WBS** | `pages/DevelopmentDetail/DeleteActivityModal.test.tsx` | Modal confirma anulación lógica y evita copy de eliminación física. | ✅ PASSED |
| **Indicadores de Auditoría** | `pages/ServicePortal/pages/AuditoriaIndicadores/index.test.tsx` | Estados de éxito, error y actualización manual del dashboard. | ✅ PASSED |
| **Organigrama interactivo** | `pages/OrganizationalHierarchy/*.test.tsx` y `utils.test.ts` | Expansión inicial, paneo móvil, layout aislado y controles accesibles. | ✅ PASSED |

### 3. Rendimiento (Locust)
Ubicación: `testing/backend/load_test.py`
*   **Escenario Base**: Autenticación y navegación por el portal.
*   **Capacidad**: Hasta 400 usuarios concurrentes.

### 2.1 Frontend focal: horarios y relaciones

Ubicación: `frontend/src/tests/`

| Suite | Cobertura |
| :--- | :--- |
| `WeeklyScheduleEditor.test.tsx` | Siete días, acción Limpiar, horas netas diarias, total semanal, cruces válidos/incoherentes y diálogo accesible. |
| `horarioUtils.test.ts` | Cálculo diario/semanal, almuerzo, cruce de medianoche y formatos `HH:MM`/`HH:MM:SS`. |
| `AplicarPlantillaModal.test.tsx` | Selección por cédula entre páginas y confirmación bulk. |
| `horariosRelacionesService.test.ts` | Serialización de filtros, rutas, inactivas y UUID de solicitud. |
| `PlanificadorHorarioDraft.test.tsx` | Aplicación masiva y persistencia local normalizada del borrador. |
| `servicePortalFeatureRoutes.test.tsx` | Guardas independientes de Plantillas, Alcance y Biometría. |
| `horasExtrasWorkflowService.test.ts` | Servicios de transición, bolsa y festivos separados del servicio principal. |
| `CalculoDetailAutorizacion.test.tsx` | Visibilidad RBAC y ejecución del botón Autorizar para cálculos pendientes. |
| `AlcanceEmpleados.test.tsx` | Estado inicial, filtros de tabla remotos, UUID estable en reintento, doble submit, descarte y límite 200. |
| `useAlcanceEmpleados.test.tsx` | Filtros multivalor, reinicio de paginación y descarte de resultados obsoletos ante error. |
| `PlantillasHorarioPage.test.tsx` | Crear/duplicar/desactivar, UUID estable y doble submit de aplicación. |
| `PlanificadorPlantillas.test.tsx` | Carga del selector, aplicación semanal, francos y conservación de novedades/OT. |
| `PlanificadorSemanalFestivos.test.tsx` | Badge combinado HF+HEFD, horas festivas separadas, vista tabular, cliente/OT/CC, actividad masiva, persistencia local y limpieza al cambiar semana. |
| `ModalStack.test.tsx` | Escape solo sobre modal superior, scroll lock contado y restauración de foco. |
| `BiometriaModule.test.tsx` | Error/reintento de capacidades y tabs enlazadas con teclado. |
| `BiometriaAdminView.test.tsx` | Tabs ARIA y confirmación antes de eliminar zona. |
| `CeldaDiaEditor.test.tsx` / `validarTurno.test.ts` | Feedback y reglas compartidas para turnos nocturnos. |
| `gestionTiempoAsistenciaConfig.test.ts` | Matriz exacta de permisos, unión sin duplicados, fail-closed y `moduleStatus`. |
| `GestionTiempoAsistenciaHub.test.tsx` | Secciones autorizadas, agrupación, navegación y descripciones compactas mediante tooltips accesibles. |
| `DashboardView.test.tsx` | Tarjeta única de Tiempo y Asistencia, alias de búsqueda y ausencia sin permiso navegable. |
| `IndicatorsVolumeView.test.tsx` | Dimensiones iniciales positivas en los cuatro gráficos de volumen para evitar advertencias previas a `ResizeObserver`. |
| `servicePortalFeatureRoutes.test.tsx` | Nueva ruta autenticada y conservación de guardas independientes históricas. |
| `GestionTiempoAsistenciaReturns.test.tsx` | Retornos directos al hub y alias de empleados hacia el panel integrado del Planificador. |
| `ConfiguracionHorasExtrasView.test.tsx` | Cambios pendientes, justificación obligatoria, descarte protegido, reintento y payload mínimo de reglas. |
| `components/molecules/__tests__/ServiceCard.test.tsx` | Semántica nativa, foco e interacción de la tarjeta accesible. |

La evidencia del planificador tabular ejecutada el 2026-07-17 es 33/33 focales; build y lint focal están OK. La última suite global previa al ajuste de aislamiento del borrador reportó 298 passed/2 skipped/2 failed: `MyDevelopmentsRequirements.test.tsx` y `RegisterSidebar.test.tsx` conservan expectativas desactualizadas fuera del alcance. El lint global mantiene errores preexistentes fuera del módulo. Estos conteos no constituyen medición de cobertura.

Backend consolidado final reportado: 154 passed; focal overrides: 19 passed; health: 4 passed/4 skipped; carreras PostgreSQL reales: 2 passed. La suite ERP no recolecta localmente sin `pdfplumber`; el import Docker reporta 318 rutas.

### 3. Scripts de Verificación Manual
Ubicación: `testing/backend/scripts/`
Estos scripts se utilizan para validaciones específicas que requieren intervención manual o envío de datos reales.

| Script | Descripción |
| :--- | :--- |
| `test_smtp_verification.py` | Envía un correo real de verificación para validar configuración SMTP. |
| `test_email_templates.py` | Genera y envía correos con las plantillas Premium para validar diseño. |
| `test_pdf_generation.py` | Genera un certificado PDF de prueba (Formato 220) localmente. |
| `test_polars_integration.py` | Valida la lectura de datos pesados con Polars. |

---

## 🚀 Guía de Ejecución

### Scripts de rendimiento

| Archivo | Cobertura |
|---|---|
| `testing/scripts/test_performance_baseline.py` | Autoevaluación de percentiles y contrato de evidencia sin secretos del baseline PowerShell. |

Ejecutar con `python -m pytest testing/scripts/test_performance_baseline.py -v`.

### Backend
Para ejecutar el **Master Health Check** (Recomendado antes de cualquier commit):
```powershell
$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH
python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v
```

Para ejecutar todas las pruebas de backend:
```powershell
$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH
python -m pytest testing/backend/ -v
```

### 🖥️ Interfaz Gráfica (GUI)
Para una experiencia más visual y sencilla, puedes usar el lanzador de pruebas:
```powershell
$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH
python testing/GUI_TESTS.py
```
Esta herramienta permite:
*   Correr la suite completa con un clic.
*   Filtrar por pruebas críticas.
*   Ver logs coloreados (Éxitos en verde, Fallos en rojo).
*   Generar el informe automático en `testing/logs/`.

### Carga
```bash
locust -f testing/backend/load_test.py --host=http://localhost:8000
```

---

## 🛠️ Pruebas de Nuevas Funcionalidades (Abril 2026)

### [Backend] Verificación de Correo
- **Endpoint**: `/auth/confirmar_correo`
- **Casos**:
    - Verificación exitosa con token válido.
    - Fallo con token expirado o inexistente.
    - Manejo de errores de base de datos (Reliability).

### [Frontend] Dashboard de Tickets (12 Columnas)
- **Visualización**: Layout responsivo en 12 columnas.
- **Historial**: Scroll limitado a 250px en ampliaciones.
- **Formulario**: Validación de campos obligatorios en el nuevo átomo de diseño.

### [Backend] Verificación Admin RBAC Dinámico (Junio 2026)
- **Archivo**: `testing/backend/test_verify_admin_whitelist.py`
- **Casos (17 totales — 5 unitarios + 12 E2E marcados con skip condicional)**:
    - Unitarios (5): SSOT `roles.py` contiene los 5 roles admin esperados, manager NO está en `ROLES_ADMIN_PANEL`, `ServicioAuth.tiene_acceso_panel_admin` y `registrar_verificacion_panel` existen, modelo `AuditoriaEvento` está definido.
    - E2E (12): manager rechazado, sin token → 401, payload sin password → 422, password corta → 422, password larga → 422, password incorrecta → 401, happy path 200, no leak de password, usuario estándar rechazado, rol inexistente rechazado, permiso revocado rechazado, RBAC dinámico sin cache.

### [Backend] Seguridad Verify-Admin (Junio 2026)
- **Archivo**: `testing/backend/test_verify_admin_security.py`
- **Casos (8 totales — 3 unitarios + 5 E2E)**:
    - Unitarios (3): audit log resiliente a caída de DB, `tiene_acceso_panel_admin` es async, registro de verificación exitoso.
    - E2E (5): audit éxito, audit fallo, password nunca en DB, 5 fallos → 429, rate limit por usuario+IP.

---

## 🧹 Mantenimiento
Antes de ejecutar pruebas masivas, se recomienda limpiar el entorno:
```sql
-- Ejecutar sql/util_limpiar_tickets.sql
```
