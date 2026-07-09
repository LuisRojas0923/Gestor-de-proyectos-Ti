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
| **Regresiones** | `test_regresiones.py` | **Master Health Check**: Ciclo de vida, Adjuntos y RBAC. | ✅ PASSED |
| **Autenticación** | `test_auth_verification.py` | Verificación de correo y flujo de seguridad. | ✅ PASSED |
| **Autogestión ERP Auth** | `test_autogestion_usuarios_erp.py` | JIT, registro público y validación fail-closed contra empleados activos del ERP. | ✅ PASSED |
| **Setup Password** | `test_setup_password.py` | Configuración de contraseña primera vez (setup-password), estado (password-status) y login con password no configurado. | ⚠️ BLOQUEADO LOCAL: credenciales PostgreSQL |
| **Escalado de Roles** | `test_auth_escalation.py` | **Seguridad**: Escalado de roles, invalidación de sesiones, cambio forzado de contraseña. | ✅ PASSED |
| **Líneas Corp.** | `test_lineas_corporativas.py` | Gestión de equipos móviles y personal. | ✅ PASSED |
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
| **Eliminación Actividades** | `test_actividad_delete.py` | Eliminación en cascada de actividades y limpieza de validaciones asociadas. | ✅ PASSED |
| **Prioridad Desarrollos** | `test_desarrollo_prioridad.py` | Ciclo CRUD de prioridades en desarrollos. | ✅ PASSED |
| **Notificaciones** | `test_notificaciones.py` | Ciclo CRUD de notificaciones persistentes de usuario. | ✅ PASSED |
| **Horas Extras S0 Semillas** | `test_horas_extras_s0.py` | Semillado, catalogo base, factores legales y topes iniciales del modulo. | ✅ PASSED |
| **Horas Extras S1 Calculo** | `test_horas_extras_s1.py` | Motor de calculo semanal, clasificacion HED/HEN/HEFD/HEFN/HF, HF ordinaria festiva dentro de 42h, separacion HF+HEFD, valores numericos festivos, pre-vigencia 44h/220 y validaciones de entrada. | ✅ PASSED |
| **Horas Extras S2 Confirmacion** | `test_horas_extras_s2.py` | Persistencia de calculo, detalle, bolsa, costo OT, idempotencia y auditoria desde usuario autenticado. | ✅ PASSED |
| **Horas Extras S4 Workflow** | `test_horas_extras_s4.py` | Transiciones PAGADO/COMPENSADO/ANULADO, compensacion manual y persistencia endpoint-level con commit. | ✅ PASSED |
| **Horas Extras S5 Festivos** | `test_horas_extras_s5_festivos.py` | Calendario de festivos, cache, sincronizacion Calendarific y manejo de errores externos. | ✅ PASSED |
| **Horas Extras S5 Novedades** | `test_horas_extras_s5_novedades.py` | Eventos VAC/LIC/INC/AUS, solapes, confirmacion/anulacion y efecto sobre calculo HE. | ✅ PASSED |
| **Horas Extras S5'' Horario Semana** | `test_horas_extras_s5pp_horario_semana.py` | Horario pactado por dia editable, validaciones y compatibilidad con horario legacy. | ✅ PASSED |
| **Horas Extras S5''' Integracion** | `test_horas_extras_s5ppp_integracion.py` | Integracion horario diario + festivos + novedades en pre-liquidacion; festivos diurnos/nocturnos separan recargo ordinario HF y extra HEFD/HEFN. | ✅ PASSED |
| **Horas Extras S6 Bolsa** | `test_horas_extras_s6.py` | Bolsa desactivable, override por OT, ruta sin prefijo duplicado y RBAC en estado global. | ✅ PASSED |
| **Horas Extras S7 Planificador** | `test_horas_extras_s7.py` | Planificador semanal masivo, selector ERP protegido por RBAC, borrador, pre-calculo y confirmacion. | ✅ PASSED |
| **Horas Extras S8 OT/CC** | `test_horas_extras_s8_ot_mano_obra.py` | Consulta ERP `basegeneralcostos`, maximo 3 OT por empleado/dia, validacion de reparto numerico, CRC32 para orden no numerica y distribucion de costo por OT. | ✅ PASSED |
| **Horas Extras S9 Reglas GH** | `test_horas_extras_s9_reglas_gh.py` | Reglas confirmadas por Gestion Humana: jornada semanal 42h/210h desde 2026-07-16, compensacion semanal, nocturna 19:00-06:00 y turnos cruzados en dos dias. | ✅ PASSED |
| **Horas Extras Parametros Calculo** | `test_horas_extras_parametros_calculo.py` | Consulta y edicion de reglas vigentes en `nomina_parametros_legales`; valida ruta sin prefijo duplicado, RBAC y uso de parametros editados. | ✅ PASSED |
| **Horas Extras RBAC Granular** | `test_horas_extras_rbac_granular.py` | Manifiesto RBAC granular, dependencias por ruta critica, rechazo 403 sin permiso exacto y separacion confirmar/compensar. | ✅ PASSED |
| **Biometría Engine Client** | `test_biometria_engine_client.py` | Mapeo saneado de errores del motor, contrato de embedding y rechazo de respuestas invalidas. | ✅ PASSED |
| **Biometría Service** | `test_biometria_service.py` | Flujo de negocio sin embedding, estado biométrico backend-source, geocerca backend, comparación vectorial y protección contra traversal en archivos. | ✅ PASSED |
| **Biometría RBAC/Router** | `test_biometria_router_engine.py` | Dependencia RBAC del módulo `biometria` y delegación del endpoint de estado biométrico. | ✅ PASSED |
| **Biometría Engine API** | `test_biometria_engine_api.py` | Token interno del servicio biométrico sin importar DeepFace durante colección. | ✅ PASSED |

### 2. Rendimiento (Locust)
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
