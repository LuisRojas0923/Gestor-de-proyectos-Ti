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
| **Infra Health** | `test_infrastructure.py` | **Crítico**: Escritura en disco (Adjuntos) y Puente ERP. | ✅ PASSED |
| **Regresiones** | `test_regresiones.py` | **Master Health Check**: Ciclo de vida, Adjuntos y RBAC. | ⚠️ DB vacía requiere seed de categorías |
| **Autenticación** | `test_auth_verification.py` | Verificación de correo y flujo de seguridad. | ✅ PASSED |
| **Autogestión ERP Auth** | `test_autogestion_usuarios_erp.py` | JIT, registro público y validación fail-closed contra empleados activos del ERP. | ✅ PASSED |
| **Setup Password** | `test_setup_password.py` | Configuración de contraseña primera vez (setup-password), estado (password-status) y login con password no configurado. | ⚠️ BLOQUEADO LOCAL: credenciales PostgreSQL |
| **Escalado de Roles** | `test_auth_escalation.py` | **Seguridad**: Escalado de roles, invalidación de sesiones, cambio forzado de contraseña. | ✅ PASSED |
| **Líneas Corp.** | `test_lineas_corporativas.py` | CRUD autenticado de equipos, personas y líneas; reportes del módulo. | ✅ PASSED |
| **Seguridad Líneas Corp.** | `test_lineas_corporativas_seguridad.py` | RBAC administrativo, archivos, transacciones, auditoría sin PII, errores seguros y degradación del ERP. | ✅ PASSED |
| **Core API** | `test_api_v2.py` | Salud general y Auth básico. | ✅ PASSED |
| **ERP Sync** | `test_requisiciones.py` | Sincronización de catálogos con el ERP. | ✅ PASSED |
| **Viáticos** | `test_viaticos.py` | Flujo de legalización y solicitudes. | ✅ PASSED |
| **Desarrollos** | `test_desarrollos_update.py` | Actualización de proyectos/desarrollos existentes y manejo 404. | ✅ PASSED |
| **Desarrollos Autoridad** | `test_desarrollos_autoridad.py` | Persistencia y respuesta del campo autoridad en proyectos/desarrollos. | ✅ PASSED |
| **Catálogos Desarrollos** | `test_tipos_desarrollo.py` | Catálogo de tipos de proyectos/desarrollos activo, semillado y ordenado. | ✅ PASSED |
| **Jerarquía Usuarios** | `test_jerarquia.py` | Árbol de subordinados, usuarios sin equipo y bloqueo de doble superior activo. | ✅ PASSED |
| **Jerarquía Organizacional** | `test_jerarquia_admin.py` | Reasignación de superiores, desactivación de relaciones, prevención de ciclos e historial. | ✅ PASSED |
| **Asignación Jerárquica** | `test_asignacion_desarrollos_actividades.py` | Persistencia de responsable, ejecutor, delegador y estado de validación. | ✅ PASSED |
| **Validaciones Asignación** | `test_validaciones_asignacion.py` | Creación automática de validaciones indirectas y resolución aprobada/rechazada. | ✅ PASSED |
| **Anulación Actividades** | `test_actividad_delete.py` | Anulación lógica recursiva de actividades, metadatos de anulación y limpieza de validaciones asociadas. | ✅ PASSED |
| **Evidencias WBS** | `test_actividad_archivos.py` | Persistencia física, validación de tipo/tamaño/firma, aislamiento por actividad y auditoría de descargas. | ✅ PASSED |
| **Prioridad Desarrollos** | `test_desarrollo_prioridad.py` | Ciclo CRUD de prioridades en desarrollos. | ✅ PASSED |
| **Notificaciones** | `test_notificaciones.py` | Ciclo CRUD de notificaciones persistentes de usuario. | ✅ PASSED |
| **Indicadores de Auditoría** | `test_auditoria_estadisticas.py` | Valida límites e integridad de rangos temporales del dashboard. | ✅ PASSED |
| **RBAC de Auditoría** | `test_auditoria_estadisticas_rbac.py` | Autoriza el dashboard por permiso efectivo y rechaza accesos sin permiso. | ✅ PASSED |
| **API de Auditoría** | `test_auditoria_estadisticas_http.py` | Contrato HTTP 401/403/200 del endpoint de indicadores. | ✅ PASSED |
| **Diagnóstico de Estados** | `test_validate_estados.py` | Manejo seguro de resultados y errores DB del script diagnóstico. | ✅ PASSED |
| **ETL Beneficiar** | `test_beneficiar_prima.py` | Prima opcional, meses ordinarios y rechazo de columnas obligatorias ausentes. | ✅ PASSED |
| **ETL Grancoop** | `test_grancoop_nombre_matching.py` | CREDIPRIMA, NOMPRI estricto, sumatoria sin duplicar y límites PDF. | ✅ PASSED |
| **Seguridad Cooperativas** | `test_cooperativas_archivos_seguridad.py` | Firmas, límites, nombres, permiso `nomina_novedades` y parser en proceso cancelable. | ✅ PASSED |

### 2. Frontend (Vitest)
Ubicación: `frontend/src/`

| Módulo | Archivo | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **Registro** | `pages/Login/RegisterSidebar.test.tsx` | Mensajes de autoactivación y normalización de errores de registro. | ✅ PASSED |
| **Áreas** | `components/molecules/__tests__/AreaAutocomplete.test.tsx` | Selector buscable cerrado, requerido y con opciones estrictas. | ✅ PASSED |
| **Anulación WBS** | `pages/DevelopmentDetail/DeleteActivityModal.test.tsx` | Modal confirma anulación lógica y evita copy de eliminación física. | ✅ PASSED |
| **Descarga Evidencias WBS** | `services/ActivityEvidenceService.test.ts` | Clasificación de enlaces legados y descarga autenticada de archivos internos. | ✅ PASSED |
| **Carga Evidencias WBS** | `pages/DevelopmentDetail/WbsNodeModal.test.tsx` | Éxito parcial, mensaje de error y reintento de carga sin duplicar la actividad. | ✅ PASSED |
| **Indicadores de Auditoría** | `pages/ServicePortal/pages/AuditoriaIndicadores/index.test.tsx` | Estados de éxito, error y actualización manual del dashboard. | ✅ PASSED |
| **Organigrama interactivo** | `pages/OrganizationalHierarchy/*.test.tsx` y `utils.test.ts` | Expansión inicial, paneo móvil, layout aislado y controles accesibles. | ✅ PASSED |
| **Líneas Corporativas** | `components/atoms/SearchableSelect.test.tsx`, `components/molecules/__tests__/{DataTable,Modal}.test.tsx`, `pages/CorporateLines/**/*.test.tsx` | Teclado, tabla/filtros accesibles, modales, confirmaciones, reintentos y estados de gestores. | ✅ PASSED |

### 3. Rendimiento (Locust)
Ubicación: `testing/backend/load_test.py`
*   **Escenario Base**: Autenticación y navegación por el portal.
*   **Capacidad**: Hasta 400 usuarios concurrentes.

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
