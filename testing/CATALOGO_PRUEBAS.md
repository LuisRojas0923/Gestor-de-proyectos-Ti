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
| **Portal JIT** | `test_portal_login_autoprovision.py` | Auto-provisionamiento JIT y flag password_set en login de portal. | ✅ PASSED |
| **Escalado de Roles** | `test_auth_escalation.py` | **Seguridad**: Escalado de roles, invalidación de sesiones, cambio forzado de contraseña. | ✅ PASSED |
| **Líneas Corp.** | `test_lineas_corporativas.py` | Gestión de equipos móviles y personal. | ✅ PASSED |
| **Core API** | `test_api_v2.py` | Salud general y Auth básico. | ✅ PASSED |
| **ERP Sync** | `test_requisiciones.py` | Sincronización de catálogos con el ERP. | ✅ PASSED |
| **Viáticos** | `test_viaticos.py` | Flujo de legalización y solicitudes. | ✅ PASSED |
| **Desarrollos** | `test_desarrollos_update.py` | Actualización de proyectos/desarrollos existentes y manejo 404. | ✅ PASSED |

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

---

## 🧹 Mantenimiento
Antes de ejecutar pruebas masivas, se recomienda limpiar el entorno:
```sql
-- Ejecutar sql/util_limpiar_tickets.sql
```
