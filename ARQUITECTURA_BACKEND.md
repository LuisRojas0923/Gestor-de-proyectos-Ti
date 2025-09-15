# 🏗️ Arquitectura del Backend - Sistema de Gestión de Proyectos TI

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura completa del backend del Sistema de Gestión de Proyectos TI, incluyendo la nueva estructura de base de datos normalizada, modelos SQLAlchemy, endpoints de API, y servicios de negocio.

---

## 🎯 Objetivos de la Arquitectura

### **Funcionalidades Principales:**
- ✅ **Gestión de Desarrollos** con estructura normalizada
- ✅ **Sistema de Controles de Calidad** (FD-PR-072)
- ✅ **Sistema de Alertas** para próximas actividades
- ✅ **KPIs y Métricas** automáticas
- ✅ **Autenticación y Autorización** completa
- ✅ **Chat y Comunicación** entre usuarios
- ✅ **Auditoría y Trazabilidad** completa

### **Tecnologías:**
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.0
- **Validación**: Pydantic v1.x
- **Base de Datos**: PostgreSQL
- **Migraciones**: Alembic
- **Autenticación**: JWT + bcrypt
- **IA Integration**: Model Context Protocol (MCP)
- **AI Models**: Claude (Anthropic), OpenAI GPT
- **Documentación**: Swagger UI / ReDoc

---

## 📊 Estructura de Base de Datos

### **24 Tablas Normalizadas:**

#### **🔐 Autenticación y Usuarios:**
1. **`auth_users`** - Usuarios del sistema
2. **`auth_tokens`** - Tokens de API y sesiones
3. **`user_sessions`** - Sesiones activas
4. **`permissions`** - Permisos del sistema
5. **`role_permissions`** - Relación roles-permisos

#### **📋 Gestión de Desarrollos:**
6. **`development_phases`** - Fases generales del desarrollo (En Ejecución, En Espera, Finales / Otros)
7. **`development_stages`** - Etapas específicas del ciclo (0-10 con nombres amigables)
8. **`developments`** - Tabla principal con campos de fase y etapa actual
9. **`development_dates`** - Fechas y cronograma
10. **`development_proposals`** - Propuestas comerciales
11. **`development_installers`** - Instaladores y versiones
12. **`development_providers`** - Proveedores y radicados
13. **`development_responsibles`** - Responsables y asignaciones
14. **`development_status_history`** - Historial de estados
15. **`development_observations`** - Observaciones y bitácora

#### **🎯 Controles de Calidad:**
16. **`quality_control_catalog`** - Catálogo de controles (FD-PR-072)
17. **`development_quality_controls`** - Controles por desarrollo

#### **📈 KPIs y Métricas:**
18. **`development_kpi_metrics`** - Métricas de rendimiento
19. **`development_functionalities`** - Funcionalidades entregadas
20. **`development_quality_metrics`** - Métricas de calidad calculadas
21. **`development_test_results`** - Resultados de pruebas y defectos
22. **`development_delivery_history`** - Historial de entregas y devoluciones

#### **⏰ Sistema de Alertas:**
23. **`development_upcoming_activities`** - Próximas actividades

#### **💬 Comunicación:**
24. **`chat_sessions`** - Sesiones de chat
25. **`chat_messages`** - Mensajes del chat

#### **⚙️ Sistema:**
26. **`system_settings`** - Configuraciones del sistema
27. **`activity_logs`** - Bitácora de actividades (existente)
28. **`incidents`** - Incidencias post-producción (existente)

---

## 🏗️ Arquitectura de Modelos SQLAlchemy

### **Estructura de Archivos:**
```
backend/app/
├── models/
│   ├── __init__.py
│   ├── auth.py              # Modelos de autenticación
│   ├── development.py       # Modelos de desarrollos, fases y etapas
│   ├── quality.py          # Modelos de controles de calidad
│   ├── kpi.py              # Modelos de métricas y KPIs
│   ├── alerts.py           # Modelos de alertas
│   ├── chat.py             # Modelos de chat
│   └── system.py           # Modelos del sistema
├── schemas/
│   ├── __init__.py
│   ├── auth.py              # Schemas de autenticación
│   ├── development.py       # Schemas de desarrollos
│   ├── quality.py          # Schemas de controles
│   ├── kpi.py              # Schemas de métricas
│   ├── alerts.py           # Schemas de alertas
│   ├── chat.py             # Schemas de chat
│   └── mcp.py              # Schemas MCP
├── api/
│   ├── __init__.py
│   ├── auth.py              # Endpoints de autenticación
│   ├── developments.py      # Endpoints de desarrollos
│   ├── quality.py          # Endpoints de controles
│   ├── kpi.py              # Endpoints de métricas
│   ├── alerts.py           # Endpoints de alertas
│   ├── chat.py             # Endpoints de chat
│   └── ai.py               # Endpoints de IA con MCP
├── services/
│   ├── __init__.py
│   ├── auth_service.py      # Servicios de autenticación
│   ├── development_service.py # Servicios de desarrollos
│   ├── quality_service.py   # Servicios de controles
│   ├── kpi_service.py       # Servicios de métricas
│   ├── alert_service.py     # Servicios de alertas
│   ├── notification_service.py # Servicios de notificaciones
│   └── ai_service.py        # Servicios de IA (actualizado con MCP)
├── mcp/
│   ├── __init__.py
│   ├── servers/
│   │   ├── __init__.py
│   │   ├── development_server.py # MCP Server para desarrollos
│   │   ├── quality_server.py     # MCP Server para calidad
│   │   ├── kpi_server.py         # MCP Server para KPIs
│   │   └── chat_server.py        # MCP Server para chat
│   ├── clients/
│   │   ├── __init__.py
│   │   ├── anthropic_client.py   # Cliente MCP para Claude
│   │   └── openai_client.py      # Cliente MCP para OpenAI
│   └── middleware/
│       ├── __init__.py
│       ├── auth.py               # Autenticación MCP
│       ├── context_builder.py    # Constructor de contexto
│       └── rate_limiter.py       # Rate limiting para IA
└── crud/
    ├── __init__.py
    ├── auth.py              # CRUD de autenticación
    ├── development.py       # CRUD de desarrollos
    ├── quality.py          # CRUD de controles
    ├── kpi.py              # CRUD de métricas
    └── alerts.py           # CRUD de alertas
```

---

## 🔧 Modelos SQLAlchemy Detallados

### **1. Modelos de Autenticación (`models/auth.py`)**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class AuthUser(Base):
    __tablename__ = "auth_users"
    
    id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    avatar_url = Column(String(500))
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relaciones
    tokens = relationship("AuthToken", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("SystemSetting", back_populates="user", cascade="all, delete-orphan")

class AuthToken(Base):
    __tablename__ = "auth_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("auth_users.id"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    token_type = Column(String(50), nullable=False)  # 'access', 'refresh', 'api'
    name = Column(String(255))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_used_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="tokens")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("auth_users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="sessions")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    resource = Column(String(100), nullable=False)  # 'developments', 'quality', 'kpi'
    action = Column(String(50), nullable=False)     # 'read', 'write', 'delete', 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    role = Column(String(50), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    permission = relationship("Permission")
```

### **2. Modelos de Desarrollos (`models/development.py`)**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, DECIMAL, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DevelopmentPhase(Base):
    __tablename__ = "development_phases"
    
    id = Column(Integer, primary_key=True, index=True)
    phase_name = Column(String(100), nullable=False)  # 'En Ejecución', 'En Espera', 'Finales / Otros'
    phase_description = Column(Text)
    phase_color = Column(String(20))  # 'info', 'warning', 'success'
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    stages = relationship("DevelopmentStage", back_populates="phase", cascade="all, delete-orphan")
    developments = relationship("Development", back_populates="current_phase")

class DevelopmentStage(Base):
    __tablename__ = "development_stages"
    
    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("development_phases.id"), nullable=False)
    stage_code = Column(String(20), nullable=False)  # '0', '1', '2', '3', etc.
    stage_name = Column(String(255), nullable=False)  # Nombre amigable de la etapa
    stage_description = Column(Text)
    is_milestone = Column(Boolean, default=False)
    estimated_days = Column(Integer)
    responsible_party = Column(String(100))  # 'proveedor', 'usuario', 'equipo_interno'
    sort_order = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    phase = relationship("DevelopmentPhase", back_populates="stages")
    developments = relationship("Development", back_populates="current_stage")

class Development(Base):
    __tablename__ = "developments"
    
    id = Column(String(50), primary_key=True)  # No.Remedy
    name = Column(String(255), nullable=False)
    description = Column(Text)
    module = Column(String(100))
    type = Column(String(50))  # 'Desarrollo', 'Consulta'
    environment = Column(String(100))
    remedy_link = Column(Text)
    
    # CAMPOS PARA CICLO DE DESARROLLO
    current_phase_id = Column(Integer, ForeignKey("development_phases.id"))
    current_stage_id = Column(Integer, ForeignKey("development_stages.id"))
    stage_progress_percentage = Column(DECIMAL(5, 2), default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    current_phase = relationship("DevelopmentPhase", back_populates="developments")
    current_stage = relationship("DevelopmentStage", back_populates="developments")
    dates = relationship("DevelopmentDate", back_populates="development", cascade="all, delete-orphan")
    proposals = relationship("DevelopmentProposal", back_populates="development", cascade="all, delete-orphan")
    installers = relationship("DevelopmentInstaller", back_populates="development", cascade="all, delete-orphan")
    providers = relationship("DevelopmentProvider", back_populates="development", cascade="all, delete-orphan")
    responsibles = relationship("DevelopmentResponsible", back_populates="development", cascade="all, delete-orphan")
    status_history = relationship("DevelopmentStatusHistory", back_populates="development", cascade="all, delete-orphan")
    observations = relationship("DevelopmentObservation", back_populates="development", cascade="all, delete-orphan")
    upcoming_activities = relationship("DevelopmentUpcomingActivity", back_populates="development", cascade="all, delete-orphan")
    kpi_metrics = relationship("DevelopmentKpiMetric", back_populates="development", cascade="all, delete-orphan")
    quality_controls = relationship("DevelopmentQualityControl", back_populates="development", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="development", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="development", cascade="all, delete-orphan")

class DevelopmentDate(Base):
    __tablename__ = "development_dates"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    date_type = Column(String(50), nullable=False)  # 'inicio', 'fin_estimado', 'entrega', 'cierre', 'produccion'
    planned_date = Column(Date)
    actual_date = Column(Date)
    days_estimated = Column(Integer)
    days_actual = Column(Integer)
    
    # CAMPOS PARA INDICADORES DE CALIDAD
    delivery_status = Column(String(50))  # 'on_time', 'delayed', 'cancelled'
    approval_status = Column(String(50))  # 'approved_first_time', 'approved_with_returns', 'rejected'
    functionality_count = Column(Integer, default=0)
    production_deployment_date = Column(Date)
    delivery_compliance_score = Column(DECIMAL(5, 2))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="dates")

class DevelopmentProposal(Base):
    __tablename__ = "development_proposals"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    proposal_number = Column(String(100), nullable=False)
    cost = Column(DECIMAL(15, 2))
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="proposals")

class DevelopmentInstaller(Base):
    __tablename__ = "development_installers"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    installer_number = Column(String(100))
    version = Column(String(50))
    environment = Column(String(100))
    installation_date = Column(Date)
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="installers")

class DevelopmentProvider(Base):
    __tablename__ = "development_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    provider_name = Column(String(100), nullable=False)  # 'Ingesoft', 'ITC', 'TI'
    side_service_point = Column(String(100))  # SIDE/Service Point
    provider_system = Column(String(100))  # Sistema del proveedor
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="providers")

class DevelopmentResponsible(Base):
    __tablename__ = "development_responsibles"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    user_name = Column(String(255), nullable=False)
    role_type = Column(String(50), nullable=False)  # 'solicitante', 'tecnico', 'area'
    area = Column(String(100))
    is_primary = Column(Boolean, default=False)
    assigned_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="responsibles")

class DevelopmentStatusHistory(Base):
    __tablename__ = "development_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    status = Column(String(50), nullable=False)
    progress_stage = Column(String(100))
    change_date = Column(DateTime(timezone=True), server_default=func.now())
    changed_by = Column(String(255))
    previous_status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="status_history")

class DevelopmentObservation(Base):
    __tablename__ = "development_observations"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    observation_type = Column(String(50), nullable=False)  # 'estado', 'seguimiento', 'problema', 'acuerdo'
    content = Column(Text, nullable=False)
    author = Column(String(255))
    observation_date = Column(DateTime(timezone=True), server_default=func.now())
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="observations")
```

### **3. Modelos de Controles de Calidad (`models/quality.py`)**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class QualityControlCatalog(Base):
    __tablename__ = "quality_control_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    control_code = Column(String(20), unique=True, nullable=False)  # C003-GT, C021-GT, etc.
    control_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    stage_prefix = Column(String(50), nullable=False)  # '1-2', '5-7', '8-10'
    stage_description = Column(String(255))
    deliverables = Column(Text)
    validation_criteria = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development_controls = relationship("DevelopmentQualityControl", back_populates="catalog")

class DevelopmentQualityControl(Base):
    __tablename__ = "development_quality_controls"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    control_catalog_id = Column(Integer, ForeignKey("quality_control_catalog.id"), nullable=False)
    control_code = Column(String(20), nullable=False)
    status = Column(String(50), default="Pendiente")  # 'Pendiente', 'Completado', 'No Aplica', 'Rechazado'
    validation_status = Column(String(50), default="Pendiente")  # 'Pendiente', 'Validado', 'Rechazado', 'En Revisión'
    completed_by = Column(String(255))
    completed_at = Column(DateTime(timezone=True))
    validated_by = Column(String(255))
    validated_at = Column(DateTime(timezone=True))
    deliverables_provided = Column(Text)
    validation_notes = Column(Text)
    rejection_reason = Column(Text)
    evidence_files = Column(Text)  # JSON array de archivos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="quality_controls")
    catalog = relationship("QualityControlCatalog", back_populates="development_controls")
```

### **4. Modelos de KPIs y Métricas (`models/kpi.py`)**

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, DECIMAL, Date, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DevelopmentKpiMetric(Base):
    __tablename__ = "development_kpi_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    metric_type = Column(String(100), nullable=False)  # 'cumplimiento_fechas', 'calidad_primera_entrega', etc.
    provider = Column(String(100))
    period_start = Column(Date)
    period_end = Column(Date)
    value = Column(DECIMAL(10, 2))
    target_value = Column(DECIMAL(10, 2))
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    calculated_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="kpi_metrics")

class DevelopmentFunctionality(Base):
    __tablename__ = "development_functionalities"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    functionality_name = Column(String(255), nullable=False)
    functionality_code = Column(String(100))
    description = Column(Text)
    status = Column(String(50), default="delivered")  # 'delivered', 'pending', 'rejected', 'in_progress'
    delivery_date = Column(Date)
    defects_count = Column(Integer, default=0)
    test_coverage_percentage = Column(DECIMAL(5, 2))
    complexity_level = Column(String(20), default="medium")  # 'low', 'medium', 'high', 'critical'
    estimated_hours = Column(DECIMAL(8, 2))
    actual_hours = Column(DECIMAL(8, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="functionalities")
    test_results = relationship("DevelopmentTestResult", back_populates="functionality")

class DevelopmentQualityMetric(Base):
    __tablename__ = "development_quality_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    provider = Column(String(100))
    metric_type = Column(String(100), nullable=False)  # 'first_time_quality', 'defects_per_delivery', etc.
    metric_name = Column(String(255), nullable=False)
    value = Column(DECIMAL(10, 2))
    target_value = Column(DECIMAL(10, 2))
    unit = Column(String(20), default="percentage")  # 'percentage', 'hours', 'count', 'days'
    calculation_method = Column(String(100))
    period_start = Column(Date)
    period_end = Column(Date)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    calculated_by = Column(String(255))
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="quality_metrics")

class DevelopmentTestResult(Base):
    __tablename__ = "development_test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    functionality_id = Column(Integer, ForeignKey("development_functionalities.id"))
    test_type = Column(String(50), nullable=False)  # 'unit', 'integration', 'system', 'user_acceptance'
    test_phase = Column(String(50))  # 'development', 'testing', 'pre_production', 'production'
    test_date = Column(Date)
    test_status = Column(String(50))  # 'passed', 'failed', 'blocked', 'not_executed'
    defects_found = Column(Integer, default=0)
    defects_severity = Column(String(50))  # 'low', 'medium', 'high', 'critical'
    test_coverage = Column(DECIMAL(5, 2))
    execution_time_hours = Column(DECIMAL(8, 2))
    tester_name = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="test_results")
    functionality = relationship("DevelopmentFunctionality", back_populates="test_results")

class DevelopmentDeliveryHistory(Base):
    __tablename__ = "development_delivery_history"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    delivery_version = Column(String(50))
    delivery_type = Column(String(50))  # 'initial', 'revision', 'fix', 'final'
    delivery_date = Column(Date)
    delivery_status = Column(String(50))  # 'delivered', 'returned', 'accepted', 'rejected'
    return_reason = Column(Text)
    return_count = Column(Integer, default=0)
    approval_date = Column(Date)
    approved_by = Column(String(255))
    quality_score = Column(DECIMAL(5, 2))
    defects_reported = Column(Integer, default=0)
    defects_resolved = Column(Integer, default=0)
    delivery_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="delivery_history")
```

### **5. Modelos de Alertas (`models/alerts.py`)**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DevelopmentUpcomingActivity(Base):
    __tablename__ = "development_upcoming_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    activity_type = Column(String(100), nullable=False)  # 'entrega_proveedor', 'reunion', 'entrega_usuario', 'revision'
    title = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(Date, nullable=False)
    responsible_party = Column(String(100), nullable=False)  # 'proveedor', 'usuario', 'equipo_interno'
    responsible_person = Column(String(255))
    status = Column(String(50), default="Pendiente")  # 'Pendiente', 'Completado', 'Vencido', 'Cancelado'
    priority = Column(String(20), default="Media")  # 'Alta', 'Media', 'Baja'
    alert_sent = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))
    created_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="upcoming_activities")
```

### **6. Modelos de Chat (`models/chat.py`)**

```python
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("auth_users.id"), nullable=False)
    title = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    content = Column(Text, nullable=False)
    sender = Column(String(50), nullable=False)  # 'user', 'assistant'
    message_type = Column(String(50), default="text")  # 'text', 'file', 'image'
    metadata = Column(JSON)  # Información adicional
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    session = relationship("ChatSession", back_populates="messages")
```

### **7. Modelos del Sistema (`models/system.py`)**

```python
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("auth_users.id"), nullable=False)
    category = Column(String(100), nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="settings")

# Modelos existentes (mantener compatibilidad)
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100))
    user_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="activity_logs")

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    report_date = Column(DateTime(timezone=True), nullable=False)
    resolution_date = Column(DateTime(timezone=True))
    description = Column(Text, nullable=False)
    severity = Column(String(50))
    impact = Column(String(50))
    status = Column(String(50), default="Abierta")
    assigned_to = Column(String(255))
    
    # CAMPOS PARA INDICADORES DE CALIDAD
    is_production_derived = Column(Boolean, default=False)
    incident_type = Column(String(50))  # 'production', 'development', 'testing', 'deployment'
    severity_level = Column(String(20))  # 'low', 'medium', 'high', 'critical'
    response_time_hours = Column(DECIMAL(8, 2))
    resolution_time_hours = Column(DECIMAL(8, 2))
    is_rework = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="incidents")
```

---

## 🤖 Arquitectura MCP (Model Context Protocol)

### **Integración de IA con MCP:**

MCP permite que los modelos de IA accedan a contexto estructurado y específico del dominio, mejorando significativamente la calidad de las respuestas y análisis.

#### **🏗️ Componentes MCP:**

### **1. MCP Servers (Servidores de Contexto)**

```python
# backend/app/mcp/servers/development_server.py
class DevelopmentMCPServer:
    """Servidor MCP para contexto de desarrollos"""
    
    async def get_development_context(self, development_id: str) -> dict:
        """Contexto completo del desarrollo para IA"""
        return {
            "development_info": await self.get_basic_info(development_id),
            "current_status": await self.get_current_status(development_id),
            "quality_controls": await self.get_quality_status(development_id),
            "kpi_metrics": await self.get_kpi_summary(development_id),
            "timeline": await self.get_timeline_info(development_id),
            "risks": await self.get_risk_analysis(development_id)
        }
    
    async def get_provider_context(self, provider_name: str) -> dict:
        """Contexto del proveedor para análisis"""
        return {
            "provider_info": await self.get_provider_info(provider_name),
            "performance_metrics": await self.get_provider_kpis(provider_name),
            "active_developments": await self.get_active_developments(provider_name),
            "historical_trends": await self.get_historical_data(provider_name)
        }
```

### **2. MCP Clients (Clientes de IA)**

```python
# backend/app/mcp/clients/anthropic_client.py
class AnthropicMCPClient:
    """Cliente MCP para Claude"""
    
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.context_builder = ContextBuilder()
    
    async def analyze_development(self, development_id: str, query: str) -> str:
        """Análisis inteligente de desarrollo"""
        context = await self.context_builder.build_development_context(development_id)
        
        response = await self.client.messages.create(
            model="claude-3-sonnet-20240229",
            messages=[{
                "role": "user",
                "content": f"""
                Contexto del desarrollo: {context}
                
                Pregunta: {query}
                
                Proporciona un análisis detallado considerando:
                - Estado actual del desarrollo
                - Riesgos potenciales
                - Recomendaciones de mejora
                - Próximos pasos sugeridos
                """
            }]
        )
        return response.content[0].text
```

### **3. Context Builder (Constructor de Contexto)**

```python
# backend/app/mcp/middleware/context_builder.py
class ContextBuilder:
    """Constructor inteligente de contexto para IA"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.development_server = DevelopmentMCPServer(db_session)
        self.quality_server = QualityMCPServer(db_session)
        self.kpi_server = KpiMCPServer(db_session)
    
    async def build_development_context(self, development_id: str) -> dict:
        """Construye contexto completo para análisis de desarrollo"""
        
        # Contexto base del desarrollo
        dev_context = await self.development_server.get_development_context(development_id)
        
        # Contexto de calidad
        quality_context = await self.quality_server.get_quality_context(development_id)
        
        # Contexto de KPIs
        kpi_context = await self.kpi_server.get_kpi_context(development_id)
        
        # Contexto histórico similar
        similar_context = await self.get_similar_developments_context(development_id)
        
        return {
            "development": dev_context,
            "quality": quality_context,
            "kpis": kpi_context,
            "similar_cases": similar_context,
            "best_practices": await self.get_best_practices_context(),
            "industry_benchmarks": await self.get_benchmarks_context()
        }
```

### **4. Casos de Uso MCP:**

#### **🔍 Análisis Inteligente de Desarrollos:**
```python
# Endpoint para análisis IA
@router.post("/developments/{development_id}/analyze")
async def analyze_development(
    development_id: str,
    query: AnalysisQuery,
    mcp_client: AnthropicMCPClient = Depends(get_mcp_client)
):
    """Análisis inteligente del desarrollo usando MCP"""
    analysis = await mcp_client.analyze_development(development_id, query.question)
    return {"analysis": analysis, "timestamp": datetime.now()}
```

#### **📊 Dashboard Inteligente de KPIs:**
```python
# Análisis automático de tendencias
@router.get("/kpis/intelligent-dashboard")
async def intelligent_kpi_dashboard(
    provider: Optional[str] = None,
    mcp_client: AnthropicMCPClient = Depends(get_mcp_client)
):
    """Dashboard con análisis IA de KPIs"""
    
    kpi_context = await kpi_server.get_dashboard_context(provider)
    analysis = await mcp_client.analyze_kpi_trends(kpi_context)
    
    return {
        "metrics": kpi_context,
        "ai_insights": analysis,
        "recommendations": await mcp_client.get_recommendations(kpi_context)
    }
```

#### **🚨 Detección Inteligente de Riesgos:**
```python
# Sistema de alertas inteligentes
@router.get("/alerts/intelligent-risks")
async def detect_intelligent_risks(
    mcp_client: AnthropicMCPClient = Depends(get_mcp_client)
):
    """Detección automática de riesgos usando IA"""
    
    # Obtener contexto de todos los desarrollos activos
    active_developments = await get_active_developments()
    risks = []
    
    for dev in active_developments:
        context = await context_builder.build_development_context(dev.id)
        risk_analysis = await mcp_client.analyze_risks(context)
        
        if risk_analysis["risk_level"] > 0.7:  # Alto riesgo
            risks.append({
                "development_id": dev.id,
                "risk_analysis": risk_analysis,
                "recommended_actions": risk_analysis["actions"]
            })
    
    return {"high_risk_developments": risks}
```

### **5. Configuración MCP:**

```python
# backend/app/mcp/__init__.py
class MCPConfig:
    """Configuración MCP"""
    
    # Clientes de IA
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Límites de rate limiting
    MAX_REQUESTS_PER_MINUTE = 60
    MAX_TOKENS_PER_REQUEST = 4000
    
    # Contexto máximo por request
    MAX_CONTEXT_SIZE = 10000  # tokens
    
    # Cache de contexto
    CONTEXT_CACHE_TTL = 300  # 5 minutos

# Dependency injection
async def get_mcp_client() -> AnthropicMCPClient:
    """Dependency para obtener cliente MCP"""
    return AnthropicMCPClient()
```

---

## 🔌 Endpoints de API

### **Estructura de Endpoints:**

```
/api/v1/
├── auth/
│   ├── POST /login              # Iniciar sesión
│   ├── POST /logout             # Cerrar sesión
│   ├── POST /refresh            # Renovar token
│   ├── POST /register           # Registrar usuario
│   └── GET /me                  # Información del usuario
├── phases/
│   ├── GET /                    # Listar fases del desarrollo
│   ├── GET /{id}                # Obtener fase específica
│   └── GET /{id}/stages         # Etapas de una fase
├── stages/
│   ├── GET /                    # Listar etapas del ciclo
│   ├── GET /{id}                # Obtener etapa específica
│   └── GET /cycle-flow          # Flujo completo del ciclo
├── developments/
│   ├── GET /                    # Listar desarrollos
│   ├── POST /                   # Crear desarrollo
│   ├── GET /{id}                # Obtener desarrollo
│   ├── PUT /{id}                # Actualizar desarrollo
│   ├── DELETE /{id}             # Eliminar desarrollo
│   ├── POST /bulk               # Importar múltiples
│   ├── PUT /{id}/stage          # Cambiar etapa del desarrollo
│   ├── PUT /{id}/progress       # Actualizar progreso de etapa
│   ├── GET /{id}/current-status # Estado actual con fase y etapa
│   ├── GET /{id}/dates          # Fechas del desarrollo
│   ├── GET /{id}/proposals      # Propuestas del desarrollo
│   ├── GET /{id}/installers     # Instaladores del desarrollo
│   ├── GET /{id}/providers      # Proveedores del desarrollo
│   ├── GET /{id}/responsibles   # Responsables del desarrollo
│   ├── GET /{id}/status-history # Historial de estados
│   ├── GET /{id}/observations   # Observaciones del desarrollo
│   ├── GET /{id}/activities     # Actividades del desarrollo
│   ├── GET /{id}/functionalities # Funcionalidades del desarrollo
│   ├── GET /{id}/test-results   # Resultados de pruebas
│   ├── GET /{id}/delivery-history # Historial de entregas
│   └── GET /{id}/quality-metrics # Métricas de calidad
├── quality/
│   ├── GET /catalog             # Catálogo de controles
│   ├── GET /controls            # Controles de desarrollos
│   ├── POST /controls           # Crear control
│   ├── PUT /controls/{id}       # Actualizar control
│   ├── POST /controls/{id}/validate # Validar control
│   └── GET /controls/{id}/evidence # Evidencia del control
├── kpi/
│   ├── GET /metrics             # Métricas de KPIs
│   ├── POST /calculate          # Calcular métricas
│   ├── GET /dashboard           # Dashboard de KPIs
│   ├── GET /reports             # Reportes de rendimiento
│   ├── GET /functionalities     # Funcionalidades por desarrollo
│   ├── POST /functionalities    # Crear funcionalidad
│   ├── GET /test-results        # Resultados de pruebas
│   ├── POST /test-results       # Crear resultado de prueba
│   ├── GET /delivery-history    # Historial de entregas
│   ├── POST /delivery-history   # Registrar entrega
│   └── GET /quality-metrics     # Métricas de calidad
├── alerts/
│   ├── GET /upcoming            # Próximas actividades
│   ├── POST /activities         # Crear actividad
│   ├── PUT /activities/{id}     # Actualizar actividad
│   ├── POST /activities/{id}/complete # Completar actividad
│   └── GET /alerts              # Alertas del sistema
├── chat/
│   ├── GET /sessions            # Sesiones de chat
│   ├── POST /sessions           # Crear sesión
│   ├── GET /sessions/{id}/messages # Mensajes de sesión
│   ├── POST /sessions/{id}/messages # Enviar mensaje
│   └── DELETE /sessions/{id}    # Eliminar sesión
└── ai/
    ├── POST /analyze/development/{id}    # Análisis IA de desarrollo
    ├── POST /analyze/provider/{name}     # Análisis IA de proveedor
    ├── GET /dashboard/intelligent        # Dashboard inteligente
    ├── GET /risks/detect                 # Detección automática de riesgos
    ├── POST /recommendations/{dev_id}    # Recomendaciones personalizadas
    ├── POST /chat/contextual            # Chat con contexto completo
    ├── GET /insights/trends             # Análisis de tendencias
    └── POST /predict/timeline           # Predicción de cronogramas
```

---

## 🛠️ Servicios de Negocio

### **1. Servicio de Autenticación (`services/auth_service.py`)**
- Validación de credenciales
- Generación de tokens JWT
- Gestión de sesiones
- Verificación de permisos

### **2. Servicio de Desarrollos (`services/development_service.py`)**
- CRUD de desarrollos
- Gestión de fases y etapas del ciclo
- Cambio automático de etapas
- Gestión de fechas y cronogramas
- Manejo de propuestas e instaladores
- Coordinación con proveedores
- Cálculo automático de progreso

### **3. Servicio de Controles de Calidad (`services/quality_service.py`)**
- Validación automática por etapa
- Gestión de entregables
- Proceso de validación
- Generación de reportes

### **4. Servicio de KPIs (`services/kpi_service.py`)**
- Cálculo automático de métricas
- Agregación por proveedor
- Generación de dashboards
- Alertas de rendimiento
- Gestión de funcionalidades
- Registro de resultados de pruebas
- Historial de entregas
- Métricas de calidad

### **5. Servicio de Alertas (`services/alert_service.py`)**
- Gestión de próximas actividades
- Notificaciones automáticas
- Escalamiento de alertas
- Integración con email

### **6. Servicio de Notificaciones (`services/notification_service.py`)**
- Envío de emails
- Notificaciones push
- Integración con Microsoft Graph
- Plantillas de mensajes

### **7. Servicio de IA con MCP (`services/ai_service.py`)**
- Integración con modelos de IA (Claude, GPT)
- Constructor de contexto inteligente
- Análisis automático de desarrollos
- Detección de riesgos y anomalías
- Generación de recomendaciones
- Predicción de cronogramas
- Chat contextual inteligente
- Análisis de tendencias y patrones

---

## 📊 Schemas Pydantic

### **Estructura de Validación:**

```python
# Ejemplo: schemas/development.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class DevelopmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    module: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(None, max_length=50)
    environment: Optional[str] = Field(None, max_length=100)
    remedy_link: Optional[str] = None

class DevelopmentCreate(DevelopmentBase):
    pass

class DevelopmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    module: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(None, max_length=50)
    environment: Optional[str] = Field(None, max_length=100)
    remedy_link: Optional[str] = None

class Development(DevelopmentBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class DevelopmentWithRelations(Development):
    dates: List[DevelopmentDate] = []
    proposals: List[DevelopmentProposal] = []
    installers: List[DevelopmentInstaller] = []
    providers: List[DevelopmentProvider] = []
    responsibles: List[DevelopmentResponsible] = []
    quality_controls: List[DevelopmentQualityControl] = []
    upcoming_activities: List[DevelopmentUpcomingActivity] = []
```

---

## 🔄 Flujo del Ciclo de Desarrollo

### **📊 Gestión Automática de Etapas:**

El sistema implementa un ciclo de desarrollo estructurado con 11 etapas organizadas en 3 fases principales, siguiendo un agrupamiento lógico basado en el tipo de actividad:

#### **🔵 FASE: En Ejecución**
- **Etapa 1**: Definición
- **Etapa 2**: Análisis
- **Etapa 5**: Desarrollo
- **Etapa 6**: Despliegue (Pruebas)
- **Etapa 7**: Plan de Pruebas
- **Etapa 8**: Ejecución Pruebas

#### **🟡 FASE: En Espera**
- **Etapa 3**: Propuesta
- **Etapa 4**: Aprobación
- **Etapa 9**: Aprobación (Pase)

#### **🟢 FASE: Finales / Otros**
- **Etapa 10**: Desplegado
- **Etapa 0**: Cancelado

### **🎯 Lógica del Agrupamiento:**

#### **🔵 En Ejecución (Actividades Activas)**
Agrupa todas las etapas donde hay trabajo activo de desarrollo, análisis, implementación y pruebas. Estas etapas requieren acción continua del equipo.

#### **🟡 En Espera (Aprobaciones y Decisiones)**
Agrupa las etapas que dependen de aprobaciones externas, decisiones del comité o autorizaciones. El desarrollo está pausado esperando decisiones.

#### **🟢 Finales / Otros (Estados Terminales)**
Agrupa los estados finales del desarrollo: exitoso (desplegado) o cancelado. Representa el fin del ciclo de desarrollo.

### **🎯 Disparadores Automáticos:**

```python
# Ejemplo de servicio para cambio de etapa
class DevelopmentStageService:
    async def change_development_stage(self, development_id: str, new_stage_id: int):
        # 1. Validar transición permitida
        # 2. Actualizar etapa del desarrollo
        # 3. Registrar en historial
        # 4. Activar controles de calidad
        # 5. Disparar cálculo de indicadores
        # 6. Generar alertas si es necesario
        
        if new_stage_id == 5:  # Desarrollo
            await self.trigger_delivery_tracking(development_id)
        elif new_stage_id == 6:  # Despliegue (Pruebas)
            await self.trigger_installation_tracking(development_id)
        elif new_stage_id == 8:  # Ejecución Pruebas
            await self.trigger_testing_tracking(development_id)
        elif new_stage_id == 10:  # Desplegado
            await self.trigger_production_metrics(development_id)
```

### **📈 Integración con Indicadores:**

- **Etapa 5 (Desarrollo)** → Dispara cálculo de "Cumplimiento de fechas"
- **Etapa 6 (Despliegue Pruebas)** → Dispara cálculo de "Calidad en primera entrega"
- **Etapa 8 (Ejecución Pruebas)** → Dispara cálculo de "Defectos por entrega"
- **Etapa 10 (Desplegado)** → Dispara cálculo de "Retrabajo post-producción"

---

## 🔄 Flujo de Datos

### **1. Creación de Desarrollo:**
```
POST /api/v1/developments
→ Validación con Pydantic
→ Creación en base de datos
→ Generación automática de controles de calidad
→ Creación de próximas actividades
→ Respuesta con datos completos
```

### **2. Cambio de Etapa:**
```
PUT /api/v1/developments/{id}/stage
→ Validación de transición permitida
→ Actualización de etapa del desarrollo
→ Registro en historial de estados
→ Activación de controles de calidad por etapa
→ Disparo de cálculo de indicadores
→ Generación de alertas automáticas
→ Notificaciones a responsables
```

### **3. Registro de Entrega:**
```
POST /api/v1/kpi/delivery-history
→ Detección automática de tipo de entrega
→ Registro en historial de entregas
→ Actualización de métricas de calidad
→ Cálculo de indicadores automático
→ Notificaciones a stakeholders
```

### **4. Validación de Control:**
```
POST /api/v1/quality/controls/{id}/validate
→ Verificación de entregables
→ Actualización de estado
→ Registro de evidencia
→ Cálculo de KPIs
→ Notificaciones de resultado
```

### **5. Registro de Resultado de Prueba:**
```
POST /api/v1/kpi/test-results
→ Registro de defectos encontrados
→ Actualización de cobertura de pruebas
→ Cálculo de métricas de calidad
→ Generación de alertas por defectos críticos
```

---

## 🚀 Próximos Pasos

1. **Crear script SQL** para eliminar y recrear todas las tablas
2. **Implementar modelos SQLAlchemy** con el nuevo agrupamiento de fases
3. **Crear schemas Pydantic** para validación de fases y etapas
4. **Desarrollar endpoints de API** para gestión de fases y etapas
5. **Implementar servicios de negocio** para ciclo de desarrollo
6. **Crear lógica de transición** entre etapas por agrupamiento
7. **Implementar cálculo automático** de indicadores por etapa
8. **Integrar sistema de alertas** basado en fases (En Ejecución, En Espera)
9. **Crear datos de prueba** para las 3 fases y 11 etapas
10. **Implementar vistas SQL** para KPIs automáticos
11. **Desarrollar dashboard** con agrupamiento visual por fases
12. **Integrar notificaciones** por cambio de fase y etapa
13. **Crear documentación** de API con nuevo agrupamiento
14. **Pruebas de integración** del ciclo completo con 3 fases

---

*Documento de arquitectura del backend - Sistema de Gestión de Proyectos TI*
