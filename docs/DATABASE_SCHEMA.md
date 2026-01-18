# Modelo Entidad-Relación (MER) Completo

### 🏗️ Diagrama del Sistema de Gestión de Proyectos TI

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA DE GESTIÓN DE PROYECTOS TI                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   AUTH_USERS     │    │   DEVELOPMENTS   │    │  ACTIVITY_LOGS   │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ email (UNIQUE)   │    │ name             │    │ development_id(FK)│
│ password_hash    │    │ description      │    │ date             │
│ name             │    │ module           │    │ description      │
│ role             │    │ type             │    │ category         │
│ is_active        │    │ start_date       │    │ user_id (FK)     │
│ email_verified   │    │ estimated_end_date│   │ created_at       │
│ avatar_url       │    │ target_closure_date│   └──────────────────┘
│ timezone         │    │ estimated_days   │              │
│ created_at       │    │ main_responsible │              │
│ updated_at       │    │ provider         │              │
│ last_login       │    │ requesting_area  │              │
└──────────────────┘    │ general_status   │              │
         │               │ current_stage    │              │
         │               │ observations     │              │
         │               │ estimated_cost   │              │
         │               │ proposal_number  │              │
         │               │ environment      │              │
         │               │ portal_link      │              │
         │               │ scheduled_delivery_date │       │
         │               │ actual_delivery_date    │       │
         │               │ returns_count    │              │
         │               │ test_defects_count│             │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │    INCIDENTS     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ report_date      │              │
         │               │ resolution_date  │              │
         │               │ description      │              │
         │               │ severity         │              │
         │               │ impact           │              │
         │               │ status           │              │
         │               │ assigned_to (FK) │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   MILESTONES     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ title            │              │
         │               │ description      │              │
         │               │ due_date         │              │
         │               │ status           │              │
         │               │ completion_date  │              │
         │               │ created_by (FK)  │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │ QUALITY_CONTROLS │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ control_code     │              │
         │               │ control_name     │              │
         │               │ stage_prefix     │              │
         │               │ status           │              │
         │               │ completed_by (FK)│              │
         │               │ completed_at     │              │
         │               │ observations     │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   TEST_TASKS     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ requirement_id   │              │
         │               │ title            │              │
         │               │ description      │              │
         │               │ status           │              │
         │               │ estimated_hours  │              │
         │               │ actual_hours     │              │
         │               │ assigned_to (FK) │              │
         │               │ priority         │              │
         │               │ is_timer_active  │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   KPI_METRICS    │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ metric_type      │              │
         │               │ provider         │              │
         │               │ period_start     │              │
         │               │ period_end       │              │
         │               │ value            │              │
         │               │ target_value     │              │
         │               │ calculated_at    │              │
         │               │ calculated_by(FK)│              │
         │               └──────────────────┘              │
         │                                                 │
         │               ┌──────────────────┐              │
         │               │  CHAT_SESSIONS   │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ user_id (FK)     │──────────────┘
         │               │ title            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘
         │                        │
         │                        │
         │               ┌──────────────────┐
         │               │  CHAT_MESSAGES   │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ session_id (FK)  │
         │               │ content          │
         │               │ sender           │
         │               │ message_type     │
         │               │ metadata         │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │   AUTH_TOKENS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ token_hash       │
         │               │ token_type       │
         │               │ name             │
         │               │ expires_at       │
         │               │ last_used_at     │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ USER_SESSIONS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ session_token    │
         │               │ ip_address       │
         │               │ user_agent       │
         │               │ expires_at       │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ SYSTEM_SETTINGS  │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ category         │
         │               │ key              │
         │               │ value            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘

         ┌──────────────────┐
         │   PERMISSIONS    │
         ├──────────────────┤
         │ id (PK)          │
         │ name (UNIQUE)    │
         │ description      │
         │ resource         │
         │ action           │
         └──────────────────┘
                  │
                  │
         ┌──────────────────┐
         │ ROLE_PERMISSIONS │
         ├──────────────────┤
         │ role (PK)        │
         │ permission_id(PK)│
         └──────────────────┘
```

### 🔗 Relaciones Principales

#### **1. AUTH_USERS (1:N) con múltiples tablas:**
- `AUTH_USERS` → `AUTH_TOKENS` (Un usuario puede tener múltiples tokens)
- `AUTH_USERS` → `USER_SESSIONS` (Un usuario puede tener múltiples sesiones)
- `AUTH_USERS` → `CHAT_SESSIONS` (Un usuario puede tener múltiples chats)
- `AUTH_USERS` → `SYSTEM_SETTINGS` (Un usuario puede tener múltiples configuraciones)

#### **2. DEVELOPMENTS (1:N) como entidad central:**
- `DEVELOPMENTS` → `ACTIVITY_LOGS` (Un desarrollo tiene múltiples actividades)
- `DEVELOPMENTS` → `INCIDENTS` (Un desarrollo puede tener múltiples incidencias)
- `DEVELOPMENTS` → `MILESTONES` (Un desarrollo tiene múltiples hitos)
- `DEVELOPMENTS` → `QUALITY_CONTROLS` (Un desarrollo tiene múltiples controles)
- `DEVELOPMENTS` → `TEST_TASKS` (Un desarrollo tiene múltiples tareas de testing)
- `DEVELOPMENTS` → `KPI_METRICS` (Un desarrollo genera múltiples métricas)

#### **3. Relaciones de Chat:**
- `CHAT_SESSIONS` → `CHAT_MESSAGES` (Una sesión tiene múltiples mensajes)

#### **4. Sistema de Permisos:**
- `PERMISSIONS` ↔ `ROLE_PERMISSIONS` ↔ `AUTH_USERS.role` (Many-to-Many a través de roles)

### 📋 Cardinalidades Detalladas

```
AUTH_USERS (1) ──── (N) AUTH_TOKENS
AUTH_USERS (1) ──── (N) USER_SESSIONS  
AUTH_USERS (1) ──── (N) CHAT_SESSIONS
AUTH_USERS (1) ──── (N) SYSTEM_SETTINGS
AUTH_USERS (1) ──── (N) ACTIVITY_LOGS (created_by)
AUTH_USERS (1) ──── (N) INCIDENTS (assigned_to)
AUTH_USERS (1) ──── (N) MILESTONES (created_by)
AUTH_USERS (1) ──── (N) QUALITY_CONTROLS (completed_by)
AUTH_USERS (1) ──── (N) TEST_TASKS (assigned_to)
AUTH_USERS (1) ──── (N) KPI_METRICS (calculated_by)

DEVELOPMENTS (1) ──── (N) ACTIVITY_LOGS
DEVELOPMENTS (1) ──── (N) INCIDENTS
DEVELOPMENTS (1) ──── (N) MILESTONES
DEVELOPMENTS (1) ──── (N) QUALITY_CONTROLS
DEVELOPMENTS (1) ──── (N) TEST_TASKS
DEVELOPMENTS (1) ──── (N) KPI_METRICS

CHAT_SESSIONS (1) ──── (N) CHAT_MESSAGES

PERMISSIONS (N) ──── (N) ROLES (via ROLE_PERMISSIONS)
```

### 🎯 Índices Recomendados para Performance

```sql
-- Índices para performance
CREATE INDEX idx_developments_status ON developments(general_status);
CREATE INDEX idx_developments_provider ON developments(provider);
CREATE INDEX idx_developments_dates ON developments(start_date, estimated_end_date);
CREATE INDEX idx_activity_logs_dev_date ON activity_logs(development_id, date);
CREATE INDEX idx_incidents_dev_status ON incidents(development_id, status);
CREATE INDEX idx_quality_controls_dev ON quality_controls(development_id);
CREATE INDEX idx_test_tasks_assigned ON test_tasks(assigned_to, status);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, token_type);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_kpi_metrics_dev_type ON kpi_metrics(development_id, metric_type);
CREATE INDEX idx_milestones_dev_status ON milestones(development_id, status);
```

### 📊 Tablas por Estado de Implementación

#### ✅ **Implementadas Actualmente:**
- `developments` - Tabla principal de desarrollos
- `activity_logs` - Bitácora de actividades
- `incidents` - Incidencias post-producción

#### 🚧 **Pendientes de Implementar:**
- `auth_users` - Sistema de autenticación
- `auth_tokens` - Tokens de API y sesiones
- `user_sessions` - Sesiones de usuario
- `permissions` - Permisos del sistema
- `role_permissions` - Relación roles-permisos
- `milestones` - Hitos del proyecto
- `quality_controls` - Controles de calidad
- `test_tasks` - Tareas de testing
- `kpi_metrics` - Métricas de rendimiento
- `chat_sessions` - Sesiones de chat
- `chat_messages` - Mensajes del chat
- `system_settings` - Configuraciones del sistema

### 🔄 Flujo de Datos Completo

```
1. AUTENTICACIÓN:
   AUTH_USERS → AUTH_TOKENS → USER_SESSIONS

2. GESTIÓN DE PROYECTOS:
   DEVELOPMENTS → ACTIVITY_LOGS + INCIDENTS + MILESTONES

3. CONTROL DE CALIDAD:
   QUALITY_CONTROLS → TEST_TASKS → KPI_METRICS

4. COMUNICACIÓN:
   CHAT_SESSIONS → CHAT_MESSAGES

5. CONFIGURACIÓN:
   SYSTEM_SETTINGS (por usuario)
```
