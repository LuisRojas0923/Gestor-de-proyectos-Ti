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










## Restricciones De Integridad De Nómina

- `uq_excepcion_historial_periodo`: garantiza un único registro en
  `nomina_excepciones_historial` por `(excepcion_id, mes, anio)`.
- El arranque aplica esta restricción mediante la migración idempotente
  `nomina_excepciones_migration.py`.
- `uq_nomina_archivo_identidad_periodo`: evita metadata duplicada en
  `nomina_archivos` por `(hash_archivo, subcategoria, mes_fact, año_fact)`.
- `nomina_archivos_migration.py` consolida referencias duplicadas bajo advisory
  lock antes de crear la restricción.

## 🔄 Detalles Técnicos (Auto-generado)
> [!NOTE]
> Esta sección es generada automáticamente por `scripts/sync_docs.py`. No editar manualmente.

### 📊 Diagrama Entidad-Relación Dinámico
```mermaid
erDiagram
    ACTIVIDADES {
        integer id
        character varying desarrollo_id
        integer parent_id
        character varying titulo
        character varying descripcion
        character varying estado
        character varying responsable_id
        date fecha_inicio_estimada
        date fecha_fin_estimada
        date fecha_inicio_real
        date fecha_fin_real
        numeric horas_estimadas
        numeric horas_reales
        numeric porcentaje_avance
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        text seguimiento
        text compromiso
        character varying archivo_url
        character varying asignado_a_id
        character varying delegado_por_id
        character varying estado_validacion
        integer validacion_id
        boolean anulada
        timestamp without time zone anulada_en
        character varying anulada_por_id
    }
    ACTIVIDADES_PROXIMAS {
        integer id
        character varying desarrollo_id
        character varying tipo_actividad
        character varying titulo
        character varying descripcion
        date fecha_vencimiento
        character varying parte_responsable
        character varying persona_responsable
        character varying estado
        character varying prioridad
        boolean alerta_enviada
        timestamp without time zone completado_en
        character varying creado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    ADJUNTOS_TICKET {
        integer id
        character varying ticket_id
        character varying nombre_archivo
        character varying contenido_base64
        character varying tipo_mime
        timestamp without time zone creado_en
        character varying ruta_archivo
        integer tamano_bytes
    }
    ASIGNACIONINVENTARIO {
        integer id
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying cedula
        character varying nombre
        character varying cedula_companero
        character varying nombre_companero
        integer numero_pareja
        integer ronda_vista
        character varying cargo
        timestamp with time zone creado_en
    }
    AUDITORIA_EVENTOS {
        integer id
        timestamp with time zone timestamp
        character varying usuario_id
        character varying rol
        character varying direccion_ip
        text agente_usuario
        character varying resultado
        text motivo
        character varying endpoint
    }
    CACHE_CONTEXTO_IA {
        integer id
        character varying clave_contexto
        character varying desarrollo_id
        character varying tipo_contexto
        jsonb datos_contexto
        timestamp without time zone expira_en
        integer conteo_accesos
        timestamp without time zone ultimo_acceso_en
        timestamp without time zone creado_en
    }
    CATEGORIAS_TICKET {
        character varying id
        character varying nombre
        character varying descripcion
        character varying icono
        character varying tipo_formulario
        timestamp without time zone creado_en
    }
    COMENTARIOS_TICKET {
        integer id
        character varying ticket_id
        character varying comentario
        boolean es_interno
        character varying usuario_id
        character varying nombre_usuario
        timestamp without time zone creado_en
        boolean leido
        timestamp with time zone leido_en
    }
    CONFIGURACIONINVENTARIO {
        integer id
        integer ronda_activa
        character varying conteo_nombre
        timestamp with time zone ultima_actualizacion
    }
    CONTEOHISTORICO {
        integer id
        integer original_id
        integer b_siigo
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying codigo
        text descripcion
        character varying unidad
        double precision cantidad_sistema
        double precision invporlegalizar
        double precision cantidad_final
        double precision cant_c1
        character varying user_c1
        double precision cant_c2
        character varying user_c2
        double precision cant_c3
        character varying user_c3
        double precision cant_c4
        character varying user_c4
        character varying conteo
        character varying estado
        double precision diferencia
        double precision diferencia_total
        timestamp with time zone snapshot_at
    }
    CONTEOINVENTARIO {
        integer id
        integer b_siigo
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying codigo
        text descripcion
        character varying unidad
        double precision cantidad_sistema
        double precision invporlegalizar
        double precision cantidad_final
        double precision cant_c1
        text obs_c1
        character varying user_c1
        double precision cant_c2
        text obs_c2
        character varying user_c2
        double precision cant_c3
        text obs_c3
        character varying user_c3
        double precision cant_c4
        text obs_c4
        character varying user_c4
        character varying conteo
        character varying estado
        double precision diferencia
        double precision diferencia_total
        timestamp with time zone fecha_creacion
    }
    CONTROL_CAMBIOS {
        integer id
        character varying ticket_id
        character varying desarrollo_id
        integer modulo_solid_id
        integer componente_solid_id
        character varying tipo_objeto
        character varying accion_requerida
        character varying impacto_operativo
        text justificacion
        text descripcion_cambio
    }
    CONTROL_DESCUENTOS_ACTIVOS {
        integer id
        character varying cedula
        character varying nombre
        character varying empresa
        character varying cargo
        character varying area
        character varying concepto
        double precision valor_descuento
        integer n_cuotas
        double precision valor_cuota
        character varying concepto_nomina
        date fecha_inicio
        date fecha_finalizacion
        character varying observaciones
        timestamp without time zone creado_en
    }
    CONTROL_DESCUENTOS_CONCEPTOS {
        integer id
        character varying nombre
        character varying concepto_nomina
        boolean activo
    }
    DESARROLLOS {
        character varying id
        character varying nombre
        character varying descripcion
        character varying modulo
        character varying tipo
        character varying ambiente
        character varying enlace_portal
        character varying proveedor
        character varying responsable
        character varying estado_general
        integer fase_actual_id
        integer etapa_actual_id
        numeric porcentaje_progreso
        date fecha_inicio
        date fecha_estimada_fin
        date fecha_real_fin
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        character varying area_desarrollo
        character varying analista
        character varying autoridad
        character varying creado_por_id
        character varying responsable_id
        character varying estado_validacion
        character varying validado_por_id
        timestamp with time zone validado_en
        character varying supervisor
        character varying area_ejecutor
        character varying prioridad
    }
    EMPLEADOS_LINEAS {
        character varying documento
        character varying nombre
        character varying tipo
        character varying cargo
        character varying area
        character varying centro_costo
    }
    EQUIPOS_MOVILES {
        integer id
        character varying marca
        character varying modelo
        character varying imei
        character varying serial
        character varying estado_fisico
        text observaciones
    }
    ETAPAS_DESARROLLO {
        integer id
        integer fase_id
        character varying nombre
        character varying codigo
        integer orden
        character varying descripcion
        integer duracion_estimada_dias
        numeric porcentaje_inicio
        numeric porcentaje_fin
        boolean esta_activa
        timestamp without time zone creado_en
    }
    FACTURAS_LINEAS {
        integer id
        integer linea_id
        character varying periodo
        character varying documento_asignado
        character varying centro_costo
        numeric cargo_mes
        numeric descuento_mes
        numeric impoconsumo
        numeric descuento_iva
        numeric iva_19
        numeric total
        numeric pago_empleado
        numeric pago_refridcol
        timestamp without time zone created_at
    }
    FACTURAS_LINEAS_DETALLE {
        integer id
        character varying periodo
        character varying min
        character varying nombre
        character varying descripcion
        numeric valor
        numeric iva
        character varying criterio
        timestamp without time zone created_at
    }
    FASES_DESARROLLO {
        integer id
        character varying nombre
        character varying codigo
        integer orden
        character varying descripcion
        character varying color
        boolean esta_activa
        timestamp without time zone creado_en
    }
    FORMATO_2276 {
        integer id
        integer ano_gravable
        timestamp without time zone fecha_carga
        character varying cargado_por
        character varying entidad_informante
        character varying tdocb
        character varying nitb
        character varying pap
        character varying sap
        character varying pno
        character varying ono
        character varying dir
        character varying dpto
        character varying mun
        character varying pais
        double precision pasa
        double precision paec
        double precision pabop
        double precision vaex
        double precision paho
        double precision pase
        double precision paco
        double precision papre
        double precision pavia
        double precision paga
        double precision patra
        double precision vapo
        double precision potro
        double precision cein
        double precision ceco
        double precision auce
        double precision peju
        double precision tingbtp
        double precision apos
        double precision apof
        double precision aprais
        double precision apov
        double precision apafc
        double precision apavc
        double precision vare
        double precision ivav
        double precision rfiva
        double precision pagahuvt
        double precision vilap
        character varying tdocde
        character varying nitde
        character varying identfc
        character varying tdocpcc
        character varying nitpcc
    }
    FUNCIONALIDADES {
        integer id
        character varying desarrollo_id
        character varying nombre_funcionalidad
        character varying codigo_funcionalidad
        character varying descripcion
        character varying estado
        date fecha_entrega
        integer cantidad_defectos
        character varying nivel_complejidad
        numeric horas_estimadas
        numeric horas_reales
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    HERRAMIENTAS_INFORMATICAS {
        integer id
        character varying nombre
        character varying descripcion
        character varying funcionalidad
        character varying responsable
        character varying departamento
        character varying fecha_creacion
        character varying ultima_actualizacion
        character varying estado
        character varying version
        character varying ubicacion_archivo
        character varying fallas_comunes
        character varying fuentes
        character varying observaciones
        character varying ecosistema
        timestamp without time zone sys_fecha_creacion
        timestamp without time zone sys_ultima_modificacion
    }
    HISTORIAL_ANALISIS_IA {
        integer id
        character varying desarrollo_id
        character varying tipo_analisis
        character varying texto_consulta
        jsonb contexto_usado
        character varying respuesta_ia
        character varying modelo_ia
        integer tokens_usados
        integer tiempo_respuesta_ms
        character varying usuario_id
        numeric puntaje_confianza
        boolean fue_util
        timestamp without time zone creado_en
    }
    HISTORIAL_ENTREGAS {
        integer id
        character varying desarrollo_id
        character varying version_entrega
        character varying tipo_entrega
        date fecha_entrega
        character varying estado_entrega
        character varying motivo_devolucion
        integer cantidad_devoluciones
        date fecha_aprobacion
        character varying aprobado_por
        numeric puntaje_calidad
        integer defectos_reportados
        integer defectos_resueltos
        character varying notas_entrega
        timestamp without time zone creado_en
    }
    HISTORIAL_RELACIONES_USUARIOS {
        integer id
        character varying usuario_id
        character varying superior_anterior_id
        character varying superior_nuevo_id
        character varying accion
        character varying realizado_por_id
        character varying observacion
        timestamp without time zone creado_en
    }
    HISTORIAL_TICKET {
        integer id
        character varying ticket_id
        character varying usuario_id
        character varying nombre_usuario
        character varying accion
        character varying detalle
        timestamp without time zone creado_en
    }
    INVENTARIO_ASIGNACION_PERSONAL {
        integer id
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying cedula
        character varying nombre
        character varying cargo
        timestamp without time zone creado_en
    }
    LINEAS_CORPORATIVAS {
        integer id
        date fecha_actualizacion
        character varying linea
        character varying empresa
        character varying estatus
        character varying estado_asignacion
        integer equipo_id
        character varying documento_asignado
        character varying documento_cobro
        character varying nombre_plan
        character varying convenio
        character varying aprobado_por
        text observaciones
        double precision cobro_fijo_coef
        double precision cobro_especiales_coef
        numeric cfm_con_iva
        numeric cfm_sin_iva
        numeric descuento_39
        numeric vr_factura
        numeric pago_empleado
        numeric pago_empresa
        numeric primera_quincena
        numeric segunda_quincena
        timestamp without time zone created_at
        timestamp without time zone updated_at
    }
    LINEASOLICITUDMATERIAL {
        integer codigo
        integer solicitudmaterial
        date fecha
        character varying especialidad
        character varying subindice
        character varying centrocosto
        character varying subcentrocosto
        character varying tipodestino
        character varying tipoproducto
        character varying materialde
        character varying referenciaproducto
        character varying descripcionproducto
        double precision cantidad
        character varying unidadmedida
        character varying tipo
        character varying clasificacion
        character varying rotacion
        character varying proveedorfrecuente
        character varying observaciones
    }
    METRICAS_KPI {
        integer id
        character varying desarrollo_id
        character varying tipo_metrica
        character varying proveedor
        date periodo_inicio
        date periodo_fin
        numeric valor
        numeric valor_objetivo
        character varying calculado_por
        timestamp without time zone calculado_en
        timestamp without time zone creado_en
    }
    METRICAS_SISTEMA {
        integer id
        timestamp without time zone timestamp
        integer usuarios_online
        integer usuarios_activos_24h
        double precision cpu_uso_porcentaje
        double precision ram_uso_mb
        double precision ram_total_mb
        integer tickets_pendientes
        double precision latencia_db_ms
        character varying estado_servidor
    }
    MODULOS_SISTEMA {
        character varying id
        character varying nombre
        character varying categoria
        character varying descripcion
        boolean esta_activo
        boolean es_critico
        timestamp with time zone actualizado_en
    }
    NOMINA_ARCHIVOS {
        integer id
        character varying nombre_archivo
        character varying hash_archivo
        integer tamaño_bytes
        character varying tipo_archivo
        character varying ruta_almacenamiento
        integer mes_fact
        integer año_fact
        character varying categoria
        character varying subcategoria
        character varying estado
        character varying error_log
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    NOMINA_CONCEPTOS {
        integer id
        character varying empresa
        character varying concepto
        character varying categoria
        character varying subcategoria
        integer prioridad
        boolean es_regex
        character varying keywords
        timestamp without time zone creado_en
    }
    NOMINA_EXCEPCIONES {
        integer id
        character varying cedula
        character varying nombre_asociado
        character varying subcategoria
        character varying tipo
        character varying estado
        double precision valor_configurado
        double precision saldo_actual
        character varying pagador_cedula
        timestamp without time zone fecha_inicio
        timestamp without time zone fecha_fin
        character varying observacion
        character varying creado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    NOMINA_EXCEPCIONES_HISTORIAL {
        integer id
        integer excepcion_id
        integer mes
        integer anio
        double precision valor_aplicado
        character varying mensaje
        timestamp without time zone creado_en
    }
    NOMINA_FAVORITOS {
        integer id
        character varying usuario_id
        character varying cedula
        character varying subcategoria
        timestamp without time zone creado_en
    }
    NOMINA_REGISTROS_CRUDOS {
        integer id
        integer archivo_id
        integer fila_origen
        json payload
        timestamp without time zone creado_en
    }
    NOMINA_REGISTROS_NORMALIZADOS {
        integer id
        integer archivo_id
        timestamp without time zone fecha_creacion
        integer mes_fact
        integer año_fact
        character varying cedula
        character varying nombre_asociado
        double precision valor
        character varying empresa
        character varying concepto
        character varying categoria_final
        character varying subcategoria_final
        character varying estado_validacion
        double precision horas
        double precision dias
        character varying ciudad
        integer fila_origen
        character varying observaciones
    }
    NOTIFICACIONES_USUARIO {
        integer id
        character varying usuario_id
        character varying titulo
        character varying mensaje
        boolean leido
        character varying tipo_evento
        character varying referencia_id
        timestamp without time zone creado_en
    }
    PERMISOS_ROL {
        integer id
        character varying rol
        character varying modulo
        boolean permitido
    }
    PLANTILLAS_ACTIVIDADES {
        integer id
        character varying nombre_plantilla
        integer parent_id
        character varying titulo
        character varying descripcion
        numeric horas_estimadas
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    RECOMENDACIONES_IA {
        integer id
        character varying desarrollo_id
        character varying tipo_recomendacion
        character varying titulo
        character varying descripcion
        character varying prioridad
        numeric puntaje_impacto
        numeric puntaje_esfuerzo
        numeric confianza_ia
        character varying estado
        character varying asignado_a
        date fecha_limite
        character varying notas_implementacion
        timestamp without time zone implementado_en
        character varying retroalimentacion_resultados
        character varying generado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    REGISTRO_ACTIVIDADES {
        integer id
        character varying desarrollo_id
        integer etapa_id
        character varying tipo_actividad
        timestamp without time zone fecha_inicio
        timestamp without time zone fecha_fin
        timestamp without time zone proximo_seguimiento_en
        character varying estado
        character varying tipo_actor
        character varying datos_dinamicos
        character varying creado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    RELACIONES_USUARIOS {
        integer id
        character varying usuario_id
        character varying superior_id
        character varying tipo_relacion
        boolean esta_activa
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    REQUERIMIENTOS_DESARROLLO {
        integer id
        character varying external_id
        character varying desarrollo_id
        character varying titulo
        character varying descripcion
        character varying prioridad
        character varying estado
        date fecha_limite
        integer responsable_id
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    REQUISICIONES_PERSONAL {
        integer id
        character varying solicitante_nombre
        character varying solicitante_area
        character varying solicitante_sede
        character varying solicitante_email
        character varying ciudad_contratacion
        character varying orden_trabajo
        character varying nombre_proyecto
        character varying direccion_proyecto
        character varying encargado_sitio
        character varying area_destino
        character varying cargo_nombre
        integer numero_personas
        character varying trabajo_alturas
        character varying duracion_contrato
        date fecha_ingreso
        character varying centro_costo
        character varying causal_requisicion
        text perfil_o
        character varying equipos_oficina
        text equipos_detalle
        character varying equipos_tecnologicos
        text tecnologia_detalle
        character varying sim_card_requerida
        character varying sim_card_plan
        character varying programas_especiales_requeridos
        text programas_especiales_detalle
        bigint salario_asignado
        character varying horas_extra
        character varying modalidad_contratacion
        character varying tipo_contratacion
        bigint auxilio_movilizacion
        bigint auxilio_alimentacion
        bigint auxilio_vivienda
        character varying estado
        integer id_creador
        timestamp without time zone fecha_creacion
    }
    RESERVATION_AUDIT {
        integer id
        uuid reservation_id
        character varying action
        character varying changed_by_name
        character varying changed_by_document
        jsonb old_data
        jsonb new_data
        timestamp without time zone created_at
    }
    RESERVATION_SERIES {
        uuid id
        uuid room_id
        time without time zone start_time
        time without time zone end_time
        character varying title
        character varying pattern_type
        integer pattern_interval
        date start_date
        date end_date
        character varying created_by_name
        character varying created_by_document
        timestamp without time zone created_at
    }
    RESERVATIONS {
        uuid id
        uuid room_id
        uuid series_id
        timestamp with time zone start_datetime
        timestamp with time zone end_datetime
        character varying title
        character varying status
        character varying created_by_name
        character varying created_by_document
        character varying updated_by_name
        character varying updated_by_document
        character varying cancelled_by_name
        character varying cancelled_by_document
        timestamp with time zone created_at
        timestamp with time zone updated_at
    }
    ROLES_SISTEMA {
        character varying id
        character varying nombre
        character varying descripcion
        boolean es_sistema
        timestamp without time zone creado_en
    }
    ROOMS {
        uuid id
        character varying name
        integer capacity
        ARRAY resources
        boolean is_active
        text notes
        timestamp without time zone created_at
        timestamp without time zone updated_at
    }
    SESIONES {
        integer id
        character varying usuario_id
        character varying token_sesion
        character varying direccion_ip
        character varying agente_usuario
        timestamp with time zone expira_en
        timestamp with time zone creado_en
        character varying nombre_usuario
        character varying rol_usuario
        timestamp with time zone fin_sesion
        timestamp with time zone ultima_actividad_en
        character varying tipo_sesion
        character varying jti
        character varying scope
    }
    SOLICITUDES_ACTIVO {
        integer id
        character varying ticket_id
        character varying item_solicitado
        text especificaciones
        integer cantidad
        timestamp without time zone creado_en
    }
    SOLICITUDES_DESARROLLO {
        integer id
        character varying ticket_id
        character varying que_necesita
        character varying porque
        character varying paraque
        character varying justificacion_ia
        timestamp without time zone creado_en
    }
    SOLICITUDMATERIAL {
        integer codigo
        character varying codigosolicitud
        date fecha
        time without time zone hora
        character varying ordentrabajo
        character varying cliente
        character varying uen
        date fechanecesidad
        character varying estado
        integer usuario
        character varying nombreusuario
        character varying observaciones
        integer anexo
    }
    SOLID_COMPONENTES {
        integer id
        integer modulo_id
        character varying nombre
        text descripcion
        character varying version
        timestamp without time zone creado_en
    }
    SOLID_MODULOS {
        integer id
        character varying nombre
        text descripcion
        character varying version_actual
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    SOLID_OPCIONES {
        integer id
        integer componente_id
        character varying nombre
        character varying valor
        text descripcion
    }
    TICKETS {
        character varying id
        character varying categoria_id
        character varying asunto
        character varying descripcion
        character varying prioridad
        character varying estado
        character varying creador_id
        character varying nombre_creador
        character varying correo_creador
        character varying area_creador
        character varying cargo_creador
        character varying sede_creador
        character varying asignado_a
        character varying diagnostico
        character varying resolucion
        character varying causa_novedad
        character varying notas
        numeric horas_tiempo_empleado
        character varying desarrollo_id
        jsonb datos_extra
        jsonb areas_impactadas
        timestamp without time zone fecha_entrega_ideal
        timestamp without time zone fecha_creacion
        timestamp without time zone fecha_cierre
        timestamp without time zone resuelto_en
        timestamp without time zone atendido_en
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        character varying sub_estado
    }
    TIPOS_DESARROLLO {
        integer id
        character varying valor
        character varying etiqueta
        integer orden
        boolean esta_activo
        timestamp without time zone creado_en
    }
    TOKENS {
        integer id
        character varying usuario_id
        character varying hash_token
        character varying tipo_token
        character varying nombre
        timestamp without time zone expira_en
        timestamp without time zone ultimo_uso_en
        timestamp without time zone creado_en
    }
    TRANSITOINVENTARIO {
        integer id
        character varying sku
        character varying documento
        double precision cantidad
        timestamp with time zone fecha_proceso
    }
    USUARIOS {
        character varying id
        character varying cedula
        character varying correo
        character varying hash_contrasena
        character varying nombre
        character varying rol
        boolean esta_activo
        character varying url_avatar
        character varying zona_horaria
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        timestamp without time zone ultimo_login
        character varying area
        character varying cargo
        character varying sede
        character varying centrocosto
        boolean viaticante
        double precision baseviaticos
        character varying especialidades
        character varying areas_asignadas
        boolean correo_actualizado
        boolean correo_verificado
    }
    VALIDACIONES_ASIGNACION {
        integer id
        character varying desarrollo_id
        integer actividad_id
        character varying solicitado_por_id
        character varying validador_id
        character varying asignado_a_id
        character varying estado
        character varying motivo
        character varying observacion
        timestamp without time zone creado_en
        timestamp without time zone validado_en
    }
```

### 📋 Diccionario de Datos
#### Tabla: `actividades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('actividades_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| parent_id | integer | YES | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| estado | character varying | NO | - |
| responsable_id | character varying | YES | - |
| fecha_inicio_estimada | date | YES | - |
| fecha_fin_estimada | date | YES | - |
| fecha_inicio_real | date | YES | - |
| fecha_fin_real | date | YES | - |
| horas_estimadas | numeric | NO | - |
| horas_reales | numeric | NO | - |
| porcentaje_avance | numeric | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| seguimiento | text | YES | - |
| compromiso | text | YES | - |
| archivo_url | character varying | YES | - |
| asignado_a_id | character varying | YES | - |
| delegado_por_id | character varying | YES | - |
| estado_validacion | character varying | YES | 'aprobada'::character varying |
| validacion_id | integer | YES | - |
| anulada | boolean | NO | false |
| anulada_en | timestamp without time zone | YES | - |
| anulada_por_id | character varying | YES | - |

#### Tabla: `actividades_proximas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('actividades_proximas_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| tipo_actividad | character varying | NO | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| fecha_vencimiento | date | NO | - |
| parte_responsable | character varying | NO | - |
| persona_responsable | character varying | YES | - |
| estado | character varying | NO | - |
| prioridad | character varying | NO | - |
| alerta_enviada | boolean | NO | - |
| completado_en | timestamp without time zone | YES | - |
| creado_por | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `adjuntos_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('adjuntos_ticket_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| nombre_archivo | character varying | NO | - |
| contenido_base64 | character varying | YES | - |
| tipo_mime | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| ruta_archivo | character varying | YES | - |
| tamano_bytes | integer | YES | - |

#### Tabla: `asignacioninventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('asignacioninventario_id_seq'::regclass) |
| bodega | character varying | NO | - |
| bloque | character varying | YES | - |
| estante | character varying | YES | - |
| nivel | character varying | YES | - |
| cedula | character varying | NO | - |
| nombre | character varying | YES | - |
| cedula_companero | character varying | YES | - |
| nombre_companero | character varying | YES | - |
| numero_pareja | integer | NO | - |
| ronda_vista | integer | YES | 1 |
| cargo | character varying | YES | - |
| creado_en | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `auditoria_eventos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('auditoria_eventos_id_seq'::regclass) |
| timestamp | timestamp with time zone | NO | now() |
| usuario_id | character varying | NO | - |
| rol | character varying | NO | - |
| direccion_ip | character varying | YES | - |
| agente_usuario | text | YES | - |
| resultado | character varying | NO | - |
| motivo | text | YES | - |
| endpoint | character varying | NO | '/api/v2/config/verify-admin'::character varying |

#### Tabla: `cache_contexto_ia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('cache_contexto_ia_id_seq'::regclass) |
| clave_contexto | character varying | NO | - |
| desarrollo_id | character varying | YES | - |
| tipo_contexto | character varying | NO | - |
| datos_contexto | jsonb | YES | - |
| expira_en | timestamp without time zone | NO | - |
| conteo_accesos | integer | NO | - |
| ultimo_acceso_en | timestamp without time zone | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `categorias_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| icono | character varying | YES | - |
| tipo_formulario | character varying | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `comentarios_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('comentarios_ticket_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| comentario | character varying | NO | - |
| es_interno | boolean | NO | - |
| usuario_id | character varying | YES | - |
| nombre_usuario | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| leido | boolean | YES | false |
| leido_en | timestamp with time zone | YES | - |

#### Tabla: `configuracioninventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('configuracioninventario_id_seq'::regclass) |
| ronda_activa | integer | YES | 1 |
| conteo_nombre | character varying | NO | - |
| ultima_actualizacion | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `conteohistorico`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('conteohistorico_id_seq'::regclass) |
| original_id | integer | NO | - |
| b_siigo | integer | YES | - |
| bodega | character varying | YES | - |
| bloque | character varying | YES | - |
| estante | character varying | YES | - |
| nivel | character varying | YES | - |
| codigo | character varying | YES | - |
| descripcion | text | YES | - |
| unidad | character varying | YES | - |
| cantidad_sistema | double precision | YES | - |
| invporlegalizar | double precision | YES | - |
| cantidad_final | double precision | YES | - |
| cant_c1 | double precision | YES | - |
| user_c1 | character varying | YES | - |
| cant_c2 | double precision | YES | - |
| user_c2 | character varying | YES | - |
| cant_c3 | double precision | YES | - |
| user_c3 | character varying | YES | - |
| cant_c4 | double precision | YES | - |
| user_c4 | character varying | YES | - |
| conteo | character varying | YES | - |
| estado | character varying | YES | - |
| diferencia | double precision | YES | - |
| diferencia_total | double precision | YES | - |
| snapshot_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `conteoinventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('conteoinventario_id_seq'::regclass) |
| b_siigo | integer | YES | - |
| bodega | character varying | NO | - |
| bloque | character varying | YES | - |
| estante | character varying | YES | - |
| nivel | character varying | YES | - |
| codigo | character varying | NO | - |
| descripcion | text | YES | - |
| unidad | character varying | YES | - |
| cantidad_sistema | double precision | YES | 0 |
| invporlegalizar | double precision | YES | 0 |
| cantidad_final | double precision | YES | 0 |
| cant_c1 | double precision | YES | 0 |
| obs_c1 | text | YES | - |
| user_c1 | character varying | YES | - |
| cant_c2 | double precision | YES | 0 |
| obs_c2 | text | YES | - |
| user_c2 | character varying | YES | - |
| cant_c3 | double precision | YES | 0 |
| obs_c3 | text | YES | - |
| user_c3 | character varying | YES | - |
| cant_c4 | double precision | YES | 0 |
| obs_c4 | text | YES | - |
| user_c4 | character varying | YES | - |
| conteo | character varying | NO | - |
| estado | character varying | YES | 'PENDIENTE'::character varying |
| diferencia | double precision | YES | 0 |
| diferencia_total | double precision | YES | 0 |
| fecha_creacion | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `control_cambios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('control_cambios_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| desarrollo_id | character varying | YES | - |
| modulo_solid_id | integer | YES | - |
| componente_solid_id | integer | YES | - |
| tipo_objeto | character varying | YES | - |
| accion_requerida | character varying | NO | - |
| impacto_operativo | character varying | NO | - |
| justificacion | text | YES | - |
| descripcion_cambio | text | YES | - |

#### Tabla: `control_descuentos_activos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('control_descuentos_activos_id_seq'::regclass) |
| cedula | character varying | NO | - |
| nombre | character varying | NO | - |
| empresa | character varying | NO | - |
| cargo | character varying | YES | - |
| area | character varying | YES | - |
| concepto | character varying | NO | - |
| valor_descuento | double precision | NO | - |
| n_cuotas | integer | NO | - |
| valor_cuota | double precision | NO | - |
| concepto_nomina | character varying | NO | - |
| fecha_inicio | date | NO | - |
| fecha_finalizacion | date | NO | - |
| observaciones | character varying | YES | - |
| creado_en | timestamp without time zone | NO | - |

#### Tabla: `control_descuentos_conceptos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('control_descuentos_conceptos_id_seq'::regclass) |
| nombre | character varying | NO | - |
| concepto_nomina | character varying | NO | - |
| activo | boolean | NO | - |

#### Tabla: `desarrollos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| modulo | character varying | YES | - |
| tipo | character varying | YES | - |
| ambiente | character varying | YES | - |
| enlace_portal | character varying | YES | - |
| proveedor | character varying | YES | - |
| responsable | character varying | YES | - |
| estado_general | character varying | NO | - |
| fase_actual_id | integer | YES | - |
| etapa_actual_id | integer | YES | - |
| porcentaje_progreso | numeric | NO | - |
| fecha_inicio | date | YES | - |
| fecha_estimada_fin | date | YES | - |
| fecha_real_fin | date | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| area_desarrollo | character varying | YES | - |
| analista | character varying | YES | - |
| autoridad | character varying | YES | - |
| creado_por_id | character varying | YES | - |
| responsable_id | character varying | YES | - |
| estado_validacion | character varying | YES | 'aprobada'::character varying |
| validado_por_id | character varying | YES | - |
| validado_en | timestamp with time zone | YES | - |
| supervisor | character varying | YES | - |
| area_ejecutor | character varying | YES | - |
| prioridad | character varying | YES | - |

#### Tabla: `empleados_lineas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| documento | character varying | NO | - |
| nombre | character varying | NO | - |
| tipo | character varying | NO | - |
| cargo | character varying | YES | - |
| area | character varying | YES | - |
| centro_costo | character varying | YES | - |

#### Tabla: `equipos_moviles`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('equipos_moviles_id_seq'::regclass) |
| marca | character varying | YES | - |
| modelo | character varying | NO | - |
| imei | character varying | YES | - |
| serial | character varying | YES | - |
| estado_fisico | character varying | NO | - |
| observaciones | text | YES | - |

#### Tabla: `etapas_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('etapas_desarrollo_id_seq'::regclass) |
| fase_id | integer | NO | - |
| nombre | character varying | NO | - |
| codigo | character varying | NO | - |
| orden | integer | NO | - |
| descripcion | character varying | YES | - |
| duracion_estimada_dias | integer | YES | - |
| porcentaje_inicio | numeric | NO | - |
| porcentaje_fin | numeric | NO | - |
| esta_activa | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `facturas_lineas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('facturas_lineas_id_seq'::regclass) |
| linea_id | integer | NO | - |
| periodo | character varying | NO | - |
| documento_asignado | character varying | NO | - |
| centro_costo | character varying | NO | - |
| cargo_mes | numeric | YES | - |
| descuento_mes | numeric | YES | - |
| impoconsumo | numeric | YES | - |
| descuento_iva | numeric | YES | - |
| iva_19 | numeric | YES | - |
| total | numeric | YES | - |
| pago_empleado | numeric | YES | - |
| pago_refridcol | numeric | YES | - |
| created_at | timestamp without time zone | NO | - |

#### Tabla: `facturas_lineas_detalle`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('facturas_lineas_detalle_id_seq'::regclass) |
| periodo | character varying | NO | - |
| min | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | NO | - |
| valor | numeric | YES | - |
| iva | numeric | YES | - |
| criterio | character varying | NO | - |
| created_at | timestamp without time zone | NO | - |

#### Tabla: `fases_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('fases_desarrollo_id_seq'::regclass) |
| nombre | character varying | NO | - |
| codigo | character varying | NO | - |
| orden | integer | NO | - |
| descripcion | character varying | YES | - |
| color | character varying | NO | - |
| esta_activa | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `formato_2276`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('formato_2276_id_seq'::regclass) |
| ano_gravable | integer | NO | - |
| fecha_carga | timestamp without time zone | NO | now() |
| cargado_por | character varying | NO | - |
| entidad_informante | character varying | YES | - |
| tdocb | character varying | NO | - |
| nitb | character varying | NO | - |
| pap | character varying | NO | - |
| sap | character varying | YES | - |
| pno | character varying | NO | - |
| ono | character varying | YES | - |
| dir | character varying | YES | - |
| dpto | character varying | YES | - |
| mun | character varying | YES | - |
| pais | character varying | YES | - |
| pasa | double precision | NO | - |
| paec | double precision | NO | - |
| pabop | double precision | NO | - |
| vaex | double precision | NO | - |
| paho | double precision | NO | - |
| pase | double precision | NO | - |
| paco | double precision | NO | - |
| papre | double precision | NO | - |
| pavia | double precision | NO | - |
| paga | double precision | NO | - |
| patra | double precision | NO | - |
| vapo | double precision | NO | - |
| potro | double precision | NO | - |
| cein | double precision | NO | - |
| ceco | double precision | NO | - |
| auce | double precision | NO | - |
| peju | double precision | NO | - |
| tingbtp | double precision | NO | - |
| apos | double precision | NO | - |
| apof | double precision | NO | - |
| aprais | double precision | NO | - |
| apov | double precision | NO | - |
| apafc | double precision | NO | - |
| apavc | double precision | NO | - |
| vare | double precision | NO | - |
| ivav | double precision | NO | - |
| rfiva | double precision | NO | - |
| pagahuvt | double precision | NO | - |
| vilap | double precision | NO | - |
| tdocde | character varying | YES | - |
| nitde | character varying | YES | - |
| identfc | character varying | YES | - |
| tdocpcc | character varying | YES | - |
| nitpcc | character varying | YES | - |

#### Tabla: `funcionalidades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('funcionalidades_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| nombre_funcionalidad | character varying | NO | - |
| codigo_funcionalidad | character varying | YES | - |
| descripcion | character varying | YES | - |
| estado | character varying | NO | - |
| fecha_entrega | date | YES | - |
| cantidad_defectos | integer | NO | - |
| nivel_complejidad | character varying | NO | - |
| horas_estimadas | numeric | YES | - |
| horas_reales | numeric | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `herramientas_informaticas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('herramientas_informaticas_id_seq'::regclass) |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| funcionalidad | character varying | YES | - |
| responsable | character varying | YES | - |
| departamento | character varying | YES | - |
| fecha_creacion | character varying | YES | - |
| ultima_actualizacion | character varying | YES | - |
| estado | character varying | NO | - |
| version | character varying | YES | - |
| ubicacion_archivo | character varying | YES | - |
| fallas_comunes | character varying | YES | - |
| fuentes | character varying | YES | - |
| observaciones | character varying | YES | - |
| ecosistema | character varying | YES | - |
| sys_fecha_creacion | timestamp without time zone | NO | now() |
| sys_ultima_modificacion | timestamp without time zone | NO | now() |

#### Tabla: `historial_analisis_ia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_analisis_ia_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| tipo_analisis | character varying | NO | - |
| texto_consulta | character varying | NO | - |
| contexto_usado | jsonb | YES | - |
| respuesta_ia | character varying | NO | - |
| modelo_ia | character varying | NO | - |
| tokens_usados | integer | YES | - |
| tiempo_respuesta_ms | integer | YES | - |
| usuario_id | character varying | YES | - |
| puntaje_confianza | numeric | YES | - |
| fue_util | boolean | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `historial_entregas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_entregas_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| version_entrega | character varying | YES | - |
| tipo_entrega | character varying | YES | - |
| fecha_entrega | date | YES | - |
| estado_entrega | character varying | YES | - |
| motivo_devolucion | character varying | YES | - |
| cantidad_devoluciones | integer | NO | - |
| fecha_aprobacion | date | YES | - |
| aprobado_por | character varying | YES | - |
| puntaje_calidad | numeric | YES | - |
| defectos_reportados | integer | NO | - |
| defectos_resueltos | integer | NO | - |
| notas_entrega | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `historial_relaciones_usuarios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_relaciones_usuarios_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| superior_anterior_id | character varying | YES | - |
| superior_nuevo_id | character varying | YES | - |
| accion | character varying | NO | - |
| realizado_por_id | character varying | YES | - |
| observacion | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `historial_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_ticket_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| usuario_id | character varying | YES | - |
| nombre_usuario | character varying | YES | - |
| accion | character varying | NO | - |
| detalle | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `inventario_asignacion_personal`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('inventario_asignacion_personal_id_seq'::regclass) |
| bodega | character varying | NO | - |
| bloque | character varying | NO | - |
| estante | character varying | NO | - |
| nivel | character varying | NO | - |
| cedula | character varying | NO | - |
| nombre | character varying | NO | - |
| cargo | character varying | NO | - |
| creado_en | timestamp without time zone | NO | now() |

#### Tabla: `lineas_corporativas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('lineas_corporativas_id_seq'::regclass) |
| fecha_actualizacion | date | YES | - |
| linea | character varying | NO | - |
| empresa | character varying | NO | - |
| estatus | character varying | NO | - |
| estado_asignacion | character varying | NO | - |
| equipo_id | integer | YES | - |
| documento_asignado | character varying | YES | - |
| documento_cobro | character varying | YES | - |
| nombre_plan | character varying | YES | - |
| convenio | character varying | YES | - |
| aprobado_por | character varying | YES | - |
| observaciones | text | YES | - |
| cobro_fijo_coef | double precision | NO | - |
| cobro_especiales_coef | double precision | NO | - |
| cfm_con_iva | numeric | YES | - |
| cfm_sin_iva | numeric | YES | - |
| descuento_39 | numeric | YES | - |
| vr_factura | numeric | YES | - |
| pago_empleado | numeric | YES | - |
| pago_empresa | numeric | YES | - |
| primera_quincena | numeric | YES | - |
| segunda_quincena | numeric | YES | - |
| created_at | timestamp without time zone | YES | - |
| updated_at | timestamp without time zone | YES | - |

#### Tabla: `lineasolicitudmaterial`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| codigo | integer | NO | nextval('lineasolicitudmaterial_codigo_seq'::regclass) |
| solicitudmaterial | integer | YES | - |
| fecha | date | NO | - |
| especialidad | character varying | YES | - |
| subindice | character varying | YES | - |
| centrocosto | character varying | YES | - |
| subcentrocosto | character varying | YES | - |
| tipodestino | character varying | YES | - |
| tipoproducto | character varying | YES | - |
| materialde | character varying | YES | - |
| referenciaproducto | character varying | YES | - |
| descripcionproducto | character varying | YES | - |
| cantidad | double precision | NO | - |
| unidadmedida | character varying | YES | - |
| tipo | character varying | YES | - |
| clasificacion | character varying | YES | - |
| rotacion | character varying | YES | - |
| proveedorfrecuente | character varying | YES | - |
| observaciones | character varying | YES | - |

#### Tabla: `metricas_kpi`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('metricas_kpi_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| tipo_metrica | character varying | NO | - |
| proveedor | character varying | YES | - |
| periodo_inicio | date | YES | - |
| periodo_fin | date | YES | - |
| valor | numeric | YES | - |
| valor_objetivo | numeric | YES | - |
| calculado_por | character varying | YES | - |
| calculado_en | timestamp without time zone | YES | now() |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `metricas_sistema`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('metricas_sistema_id_seq'::regclass) |
| timestamp | timestamp without time zone | NO | - |
| usuarios_online | integer | NO | - |
| usuarios_activos_24h | integer | NO | - |
| cpu_uso_porcentaje | double precision | NO | - |
| ram_uso_mb | double precision | NO | - |
| ram_total_mb | double precision | NO | - |
| tickets_pendientes | integer | NO | - |
| latencia_db_ms | double precision | NO | - |
| estado_servidor | character varying | NO | - |

#### Tabla: `modulos_sistema`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| categoria | character varying | NO | - |
| descripcion | character varying | YES | - |
| esta_activo | boolean | YES | true |
| es_critico | boolean | YES | false |
| actualizado_en | timestamp with time zone | YES | now() |

#### Tabla: `nomina_archivos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_archivos_id_seq'::regclass) |
| nombre_archivo | character varying | NO | - |
| hash_archivo | character varying | NO | - |
| tamaño_bytes | integer | NO | - |
| tipo_archivo | character varying | NO | - |
| ruta_almacenamiento | character varying | NO | - |
| mes_fact | integer | NO | - |
| año_fact | integer | NO | - |
| categoria | character varying | NO | - |
| subcategoria | character varying | NO | - |
| estado | character varying | NO | - |
| error_log | character varying | YES | - |
| creado_en | timestamp without time zone | YES | - |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `nomina_conceptos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_conceptos_id_seq'::regclass) |
| empresa | character varying | NO | - |
| concepto | character varying | NO | - |
| categoria | character varying | NO | - |
| subcategoria | character varying | NO | - |
| prioridad | integer | NO | - |
| es_regex | boolean | NO | - |
| keywords | character varying | YES | - |
| creado_en | timestamp without time zone | YES | '2026-05-29 11:39:11.964409'::timestamp without time zone |

#### Tabla: `nomina_excepciones`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_excepciones_id_seq'::regclass) |
| cedula | character varying | NO | - |
| nombre_asociado | character varying | YES | - |
| subcategoria | character varying | NO | - |
| tipo | character varying | NO | - |
| estado | character varying | NO | - |
| valor_configurado | double precision | NO | - |
| saldo_actual | double precision | NO | - |
| pagador_cedula | character varying | YES | - |
| fecha_inicio | timestamp without time zone | NO | - |
| fecha_fin | timestamp without time zone | YES | - |
| observacion | character varying | YES | - |
| creado_por | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `nomina_excepciones_historial`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_excepciones_historial_id_seq'::regclass) |
| excepcion_id | integer | NO | - |
| mes | integer | NO | - |
| anio | integer | NO | - |
| valor_aplicado | double precision | NO | - |
| mensaje | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |

#### Tabla: `nomina_favoritos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_favoritos_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| cedula | character varying | NO | - |
| subcategoria | character varying | NO | - |
| creado_en | timestamp without time zone | YES | '2026-05-29 11:39:11.964409'::timestamp without time zone |

#### Tabla: `nomina_registros_crudos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_registros_crudos_id_seq'::regclass) |
| archivo_id | integer | NO | - |
| fila_origen | integer | NO | - |
| payload | json | YES | - |
| creado_en | timestamp without time zone | YES | '2026-05-29 11:39:11.964409'::timestamp without time zone |

#### Tabla: `nomina_registros_normalizados`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_registros_normalizados_id_seq'::regclass) |
| archivo_id | integer | NO | - |
| fecha_creacion | timestamp without time zone | NO | - |
| mes_fact | integer | NO | - |
| año_fact | integer | NO | - |
| cedula | character varying | NO | - |
| nombre_asociado | character varying | YES | - |
| valor | double precision | NO | - |
| empresa | character varying | NO | - |
| concepto | character varying | NO | - |
| categoria_final | character varying | NO | - |
| subcategoria_final | character varying | NO | - |
| estado_validacion | character varying | NO | - |
| horas | double precision | NO | - |
| dias | double precision | NO | - |
| ciudad | character varying | YES | - |
| fila_origen | integer | NO | - |
| observaciones | character varying | YES | - |

#### Tabla: `notificaciones_usuario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('notificaciones_usuario_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| titulo | character varying | NO | - |
| mensaje | character varying | NO | - |
| leido | boolean | NO | - |
| tipo_evento | character varying | NO | - |
| referencia_id | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `permisos_rol`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('permisos_rol_id_seq'::regclass) |
| rol | character varying | NO | - |
| modulo | character varying | NO | - |
| permitido | boolean | YES | true |

#### Tabla: `plantillas_actividades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('plantillas_actividades_id_seq'::regclass) |
| nombre_plantilla | character varying | NO | - |
| parent_id | integer | YES | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| horas_estimadas | numeric | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `recomendaciones_ia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('recomendaciones_ia_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| tipo_recomendacion | character varying | NO | - |
| titulo | character varying | NO | - |
| descripcion | character varying | NO | - |
| prioridad | character varying | NO | - |
| puntaje_impacto | numeric | YES | - |
| puntaje_esfuerzo | numeric | YES | - |
| confianza_ia | numeric | YES | - |
| estado | character varying | NO | - |
| asignado_a | character varying | YES | - |
| fecha_limite | date | YES | - |
| notas_implementacion | character varying | YES | - |
| implementado_en | timestamp without time zone | YES | - |
| retroalimentacion_resultados | character varying | YES | - |
| generado_por | character varying | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `registro_actividades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('registro_actividades_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| etapa_id | integer | YES | - |
| tipo_actividad | character varying | NO | - |
| fecha_inicio | timestamp without time zone | YES | - |
| fecha_fin | timestamp without time zone | YES | - |
| proximo_seguimiento_en | timestamp without time zone | YES | - |
| estado | character varying | NO | - |
| tipo_actor | character varying | YES | - |
| datos_dinamicos | character varying | YES | - |
| creado_por | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `relaciones_usuarios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('relaciones_usuarios_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| superior_id | character varying | NO | - |
| tipo_relacion | character varying | NO | - |
| esta_activa | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `requerimientos_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('requerimientos_desarrollo_id_seq'::regclass) |
| external_id | character varying | NO | - |
| desarrollo_id | character varying | NO | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| prioridad | character varying | NO | - |
| estado | character varying | NO | - |
| fecha_limite | date | YES | - |
| responsable_id | integer | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `requisiciones_personal`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('requisiciones_personal_id_seq'::regclass) |
| solicitante_nombre | character varying | NO | - |
| solicitante_area | character varying | NO | - |
| solicitante_sede | character varying | NO | - |
| solicitante_email | character varying | NO | - |
| ciudad_contratacion | character varying | NO | - |
| orden_trabajo | character varying | NO | - |
| nombre_proyecto | character varying | NO | - |
| direccion_proyecto | character varying | NO | - |
| encargado_sitio | character varying | NO | - |
| area_destino | character varying | NO | - |
| cargo_nombre | character varying | NO | - |
| numero_personas | integer | NO | - |
| trabajo_alturas | character varying | NO | - |
| duracion_contrato | character varying | NO | - |
| fecha_ingreso | date | NO | - |
| centro_costo | character varying | NO | - |
| causal_requisicion | character varying | NO | - |
| perfil_o | text | YES | - |
| equipos_oficina | character varying | NO | - |
| equipos_detalle | text | YES | - |
| equipos_tecnologicos | character varying | NO | - |
| tecnologia_detalle | text | YES | - |
| sim_card_requerida | character varying | NO | - |
| sim_card_plan | character varying | YES | - |
| programas_especiales_requeridos | character varying | NO | - |
| programas_especiales_detalle | text | YES | - |
| salario_asignado | bigint | YES | - |
| horas_extra | character varying | NO | - |
| modalidad_contratacion | character varying | NO | - |
| tipo_contratacion | character varying | NO | - |
| auxilio_movilizacion | bigint | YES | - |
| auxilio_alimentacion | bigint | YES | - |
| auxilio_vivienda | bigint | YES | - |
| estado | character varying | NO | - |
| id_creador | integer | YES | - |
| fecha_creacion | timestamp without time zone | NO | now() |

#### Tabla: `reservation_audit`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('reservation_audit_id_seq'::regclass) |
| reservation_id | uuid | NO | - |
| action | character varying | NO | - |
| changed_by_name | character varying | YES | - |
| changed_by_document | character varying | YES | - |
| old_data | jsonb | YES | - |
| new_data | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

#### Tabla: `reservation_series`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | gen_random_uuid() |
| room_id | uuid | NO | - |
| start_time | time without time zone | NO | - |
| end_time | time without time zone | NO | - |
| title | character varying | NO | - |
| pattern_type | character varying | NO | - |
| pattern_interval | integer | NO | - |
| start_date | date | NO | - |
| end_date | date | YES | - |
| created_by_name | character varying | NO | - |
| created_by_document | character varying | NO | - |
| created_at | timestamp without time zone | YES | now() |

#### Tabla: `reservations`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | gen_random_uuid() |
| room_id | uuid | NO | - |
| series_id | uuid | YES | - |
| start_datetime | timestamp with time zone | YES | - |
| end_datetime | timestamp with time zone | YES | - |
| title | character varying | NO | - |
| status | character varying | NO | - |
| created_by_name | character varying | NO | - |
| created_by_document | character varying | NO | - |
| updated_by_name | character varying | YES | - |
| updated_by_document | character varying | YES | - |
| cancelled_by_name | character varying | YES | - |
| cancelled_by_document | character varying | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

#### Tabla: `roles_sistema`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| es_sistema | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `rooms`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | character varying | NO | - |
| capacity | integer | NO | - |
| resources | ARRAY | YES | - |
| is_active | boolean | NO | - |
| notes | text | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

#### Tabla: `sesiones`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('sesiones_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| token_sesion | character varying | NO | - |
| direccion_ip | character varying | YES | - |
| agente_usuario | character varying | YES | - |
| expira_en | timestamp with time zone | NO | - |
| creado_en | timestamp with time zone | YES | now() |
| nombre_usuario | character varying | YES | - |
| rol_usuario | character varying | YES | - |
| fin_sesion | timestamp with time zone | YES | - |
| ultima_actividad_en | timestamp with time zone | YES | now() |
| tipo_sesion | character varying | NO | 'web'::character varying |
| jti | character varying | YES | - |
| scope | character varying | YES | - |

#### Tabla: `solicitudes_activo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solicitudes_activo_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| item_solicitado | character varying | NO | - |
| especificaciones | text | YES | - |
| cantidad | integer | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `solicitudes_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solicitudes_desarrollo_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| que_necesita | character varying | YES | - |
| porque | character varying | YES | - |
| paraque | character varying | YES | - |
| justificacion_ia | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `solicitudmaterial`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| codigo | integer | NO | nextval('solicitudmaterial_codigo_seq'::regclass) |
| codigosolicitud | character varying | NO | - |
| fecha | date | NO | - |
| hora | time without time zone | NO | - |
| ordentrabajo | character varying | YES | - |
| cliente | character varying | YES | - |
| uen | character varying | YES | - |
| fechanecesidad | date | NO | - |
| estado | character varying | YES | - |
| usuario | integer | YES | - |
| nombreusuario | character varying | YES | - |
| observaciones | character varying | YES | - |
| anexo | integer | YES | - |

#### Tabla: `solid_componentes`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solid_componentes_id_seq'::regclass) |
| modulo_id | integer | NO | - |
| nombre | character varying | NO | - |
| descripcion | text | YES | - |
| version | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |

#### Tabla: `solid_modulos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solid_modulos_id_seq'::regclass) |
| nombre | character varying | NO | - |
| descripcion | text | YES | - |
| version_actual | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |
| actualizado_en | timestamp without time zone | NO | - |

#### Tabla: `solid_opciones`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solid_opciones_id_seq'::regclass) |
| componente_id | integer | NO | - |
| nombre | character varying | NO | - |
| valor | character varying | NO | - |
| descripcion | text | YES | - |

#### Tabla: `tickets`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| categoria_id | character varying | NO | - |
| asunto | character varying | NO | - |
| descripcion | character varying | NO | - |
| prioridad | character varying | NO | - |
| estado | character varying | NO | - |
| creador_id | character varying | NO | - |
| nombre_creador | character varying | YES | - |
| correo_creador | character varying | YES | - |
| area_creador | character varying | YES | - |
| cargo_creador | character varying | YES | - |
| sede_creador | character varying | YES | - |
| asignado_a | character varying | YES | - |
| diagnostico | character varying | YES | - |
| resolucion | character varying | YES | - |
| causa_novedad | character varying | YES | - |
| notas | character varying | YES | - |
| horas_tiempo_empleado | numeric | YES | - |
| desarrollo_id | character varying | YES | - |
| datos_extra | jsonb | YES | - |
| areas_impactadas | jsonb | YES | - |
| fecha_entrega_ideal | timestamp without time zone | YES | - |
| fecha_creacion | timestamp without time zone | YES | now() |
| fecha_cierre | timestamp without time zone | YES | - |
| resuelto_en | timestamp without time zone | YES | - |
| atendido_en | timestamp without time zone | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| sub_estado | character varying | YES | 'Asignado'::character varying |

#### Tabla: `tipos_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('tipos_desarrollo_id_seq'::regclass) |
| valor | character varying | NO | - |
| etiqueta | character varying | NO | - |
| orden | integer | NO | - |
| esta_activo | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `tokens`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('tokens_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| hash_token | character varying | NO | - |
| tipo_token | character varying | NO | - |
| nombre | character varying | YES | - |
| expira_en | timestamp without time zone | NO | - |
| ultimo_uso_en | timestamp without time zone | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `transitoinventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('transitoinventario_id_seq'::regclass) |
| sku | character varying | NO | - |
| documento | character varying | YES | - |
| cantidad | double precision | YES | 0 |
| fecha_proceso | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `usuarios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| cedula | character varying | NO | - |
| correo | character varying | YES | - |
| hash_contrasena | character varying | NO | - |
| nombre | character varying | NO | - |
| rol | character varying | NO | - |
| esta_activo | boolean | NO | - |
| url_avatar | character varying | YES | - |
| zona_horaria | character varying | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| ultimo_login | timestamp without time zone | YES | - |
| area | character varying | YES | - |
| cargo | character varying | YES | - |
| sede | character varying | YES | - |
| centrocosto | character varying | YES | - |
| viaticante | boolean | NO | - |
| baseviaticos | double precision | YES | - |
| especialidades | character varying | YES | - |
| areas_asignadas | character varying | YES | - |
| correo_actualizado | boolean | YES | false |
| correo_verificado | boolean | YES | false |

#### Tabla: `validaciones_asignacion`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('validaciones_asignacion_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| actividad_id | integer | YES | - |
| solicitado_por_id | character varying | NO | - |
| validador_id | character varying | NO | - |
| asignado_a_id | character varying | NO | - |
| estado | character varying | NO | - |
| motivo | character varying | YES | - |
| observacion | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| validado_en | timestamp without time zone | YES | - |
