# 🎨 Arquitectura del Frontend - Sistema de Gestión de Proyectos TI
## 📋 **VERSIÓN ACTUALIZADA BASADA EN BACKEND REAL**

---

## 🎯 **RESUMEN EJECUTIVO**

Este documento describe la arquitectura **REALISTA** del frontend del Sistema de Gestión de Proyectos TI, basada en el análisis completo del backend actual. Se han identificado **TODOS** los endpoints disponibles, esquemas de datos y funcionalidades implementadas.

### **🔍 ANÁLISIS REALIZADO:**
- ✅ **Backend endpoints**: 8 módulos de API completamente implementados
- ✅ **Esquemas de datos**: 15+ schemas Pydantic con validaciones
- ✅ **Funcionalidades**: Sistema completo de fases, etapas, calidad, KPIs, alertas, chat e IA
- ✅ **Base de datos**: 20+ tablas con relaciones complejas

---

## 🏗️ **ESTRUCTURA REAL DEL BACKEND**

### **📡 ENDPOINTS DISPONIBLES:**

#### **1. DESARROLLOS (`/api/v1/developments`)**
```typescript
// Endpoints disponibles:
GET    /api/v1/developments                    // Lista con filtros avanzados
GET    /api/v1/developments/{id}               // Desarrollo específico
POST   /api/v1/developments                    // Crear desarrollo
PUT    /api/v1/developments/{id}               // Actualizar desarrollo
DELETE /api/v1/developments/{id}               // Eliminar desarrollo
POST   /api/v1/developments/bulk               // Importación masiva
GET    /api/v1/developments/{id}/functionalities    // Funcionalidades
GET    /api/v1/developments/{id}/test-results       // Resultados de pruebas
GET    /api/v1/developments/{id}/delivery-history   // Historial de entregas
GET    /api/v1/developments/{id}/quality-metrics    // Métricas de calidad
```

#### **2. FASES Y ETAPAS (`/api/v1/phases`, `/api/v1/stages`)**
```typescript
// Fases:
GET    /api/v1/phases                          // Lista de fases
GET    /api/v1/phases/{id}                     // Fase específica con etapas

// Etapas:
GET    /api/v1/stages                          // Lista de etapas
GET    /api/v1/stages/{id}                     // Etapa específica
GET    /api/v1/stages/cycle-flow               // Flujo completo del ciclo
PUT    /api/v1/developments/{id}/stage         // Cambiar etapa
PUT    /api/v1/developments/{id}/progress      // Actualizar progreso
```

#### **3. CONTROLES DE CALIDAD (`/api/v1/quality`)**
```typescript
GET    /api/v1/quality/controls                // Catálogo de controles
GET    /api/v1/quality/controls/{id}           // Control específico
POST   /api/v1/quality/controls                // Crear control
PUT    /api/v1/quality/controls/{id}           // Actualizar control
POST   /api/v1/quality/controls/{id}/validate  // Validar control
POST   /api/v1/quality/controls/{id}/evidence  // Subir evidencia
```

#### **4. KPIs Y MÉTRICAS (`/api/v1/kpi`)**
```typescript
GET    /api/v1/kpi/metrics                     // Métricas con filtros
GET    /api/v1/kpi/functionalities             // Funcionalidades
GET    /api/v1/kpi/test-results                // Resultados de pruebas
GET    /api/v1/kpi/delivery-history            // Historial de entregas
GET    /api/v1/kpi/quality-metrics             // Métricas de calidad
```

#### **5. ALERTAS (`/api/v1/alerts`)**
```typescript
GET    /api/v1/alerts/upcoming                 // Actividades próximas
GET    /api/v1/alerts/activities               // Todas las actividades
POST   /api/v1/alerts/activities               // Crear actividad
PUT    /api/v1/alerts/activities/{id}          // Actualizar actividad
DELETE /api/v1/alerts/activities/{id}          // Eliminar actividad
```

#### **6. CHAT E IA (`/api/v1/chat`, `/api/v1/ai`)**
```typescript
// Chat:
GET    /api/v1/chat/sessions                   // Sesiones de chat
POST   /api/v1/chat/sessions                   // Crear sesión
GET    /api/v1/chat/sessions/{id}/messages     // Mensajes de sesión
POST   /api/v1/chat/sessions/{id}/messages     // Enviar mensaje

// IA:
POST   /api/v1/ai/analyze/development/{id}     // Análisis de desarrollo
POST   /api/v1/ai/analyze/provider/{name}      // Análisis de proveedor
GET    /api/v1/ai/dashboard/intelligent        // Dashboard inteligente
POST   /api/v1/ai/risks/detect                // Detección de riesgos
GET    /api/v1/ai/recommendations/{id}         // Recomendaciones
POST   /api/v1/ai/chat/contextual             // Chat contextual
GET    /api/v1/ai/insights/trends             // Tendencias
POST   /api/v1/ai/predict/timeline            // Predicción de timeline
```

#### **7. DASHBOARD (`/api/v1/dashboard`)**
```typescript
GET    /api/v1/dashboard/metrics               // Métricas principales
GET    /api/v1/dashboard/priority-distribution // Distribución de prioridades
GET    /api/v1/dashboard/weekly-progress       // Progreso semanal
GET    /api/v1/dashboard/upcoming-milestones   // Próximos hitos
```

---

## 📊 **ESQUEMAS DE DATOS REALES**

### **1. DESARROLLO CON FASE Y ETAPA ACTUAL**
```typescript
interface DevelopmentWithCurrentStatus {
  // Campos básicos
  id: string;
  name: string;
  description?: string;
  module?: string;
  type?: string;
  environment?: string;
  remedy_link?: string;
  
  // Sistema de fases y etapas
  current_phase_id?: number;
  current_stage_id?: number;
  stage_progress_percentage?: number; // 0-100
  
  // Campos legacy
  general_status: 'Pendiente' | 'En curso' | 'Completado' | 'Cancelado';
  estimated_end_date?: string;
  provider?: string;
  
  // Relaciones incluidas
  current_phase?: DevelopmentPhase;
  current_stage?: DevelopmentStage;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
}
```

### **2. FASES DE DESARROLLO**
```typescript
interface DevelopmentPhase {
  id: number;
  phase_name: 'En Ejecución' | 'En Espera' | 'Finales / Otros';
  phase_description?: string;
  phase_color?: string;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at?: string;
}

interface DevelopmentPhaseWithStages extends DevelopmentPhase {
  stages: DevelopmentStage[];
}
```

### **3. ETAPAS DE DESARROLLO**
```typescript
interface DevelopmentStage {
  id: number;
  phase_id: number;
  stage_code: string; // '0', '1', '2', '3', etc.
  stage_name: string;
  stage_description?: string;
  is_milestone: boolean;
  estimated_days?: number;
  responsible_party?: 'proveedor' | 'usuario' | 'equipo_interno';
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface DevelopmentStageWithPhase extends DevelopmentStage {
  phase: DevelopmentPhase;
}
```

### **4. FLUJO DEL CICLO COMPLETO**
```typescript
interface DevelopmentCycleFlow {
  stage_id: number;
  stage_code: string;
  stage_name: string;
  stage_description?: string;
  phase_id: number;
  phase_name: string;
  phase_color?: string;
  is_milestone: boolean;
  estimated_days?: number;
  responsible_party?: string;
  responsible_party_name: string;
  sort_order?: number;
}
```

### **5. CONTROLES DE CALIDAD**
```typescript
interface QualityControlCatalog {
  id: number;
  control_code: string;
  control_name: string;
  description: string;
  stage_prefix: string;
  stage_description?: string;
  deliverables?: string;
  validation_criteria?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface DevelopmentQualityControl {
  id: number;
  development_id: string;
  control_catalog_id: number;
  control_code: string;
  status: 'Pendiente' | 'Completado' | 'Validado' | 'Rechazado';
  validation_status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  completed_by?: string;
  validated_by?: string;
  deliverables_provided?: string;
  validation_notes?: string;
  rejection_reason?: string;
  evidence_files?: string; // JSON string
  completed_at?: string;
  validated_at?: string;
  created_at: string;
  updated_at?: string;
}
```

### **6. KPIs Y MÉTRICAS**
```typescript
interface DevelopmentKpiMetric {
  id: number;
  development_id: string;
  metric_type: string;
  provider?: string;
  period_start?: string;
  period_end?: string;
  value?: number;
  target_value?: number;
  calculated_by?: string;
  calculated_at: string;
  created_at: string;
}

interface DevelopmentFunctionality {
  id: number;
  development_id: string;
  functionality_name: string;
  functionality_code?: string;
  description?: string;
  status: 'delivered' | 'in_progress' | 'completed';
  delivery_date?: string;
  defects_count: number;
  test_coverage_percentage?: number;
  complexity_level: 'low' | 'medium' | 'high';
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at?: string;
}
```

### **7. ALERTAS Y ACTIVIDADES**
```typescript
interface DevelopmentUpcomingActivity {
  id: number;
  development_id: string;
  activity_type: 'entrega_proveedor' | 'reunion' | 'entrega_usuario' | 'revision' | 'aprobacion' | 'despliegue' | 'pruebas' | 'documentacion';
  title: string;
  description?: string;
  due_date: string;
  responsible_party: 'proveedor' | 'usuario' | 'equipo_interno';
  responsible_person?: string;
  priority: 'Alta' | 'Media' | 'Baja' | 'Crítica';
  status: 'pending' | 'completed' | 'overdue';
  is_read: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}
```

### **8. CHAT E IA**
```typescript
interface ChatSession {
  id: number;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
}

interface ChatMessage {
  id: number;
  session_id: number;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  message_type: 'text' | 'file' | 'image' | 'code' | 'analysis' | 'recommendation';
  message_metadata?: Record<string, any>;
  created_at: string;
}

interface AnalysisResponse {
  analysis: string;
  confidence?: number;
  sources?: string[];
  timestamp: string;
  model_used: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: string;
  category: string;
  confidence: number;
  estimated_impact?: string;
}
```

---

## 🎯 **PLAN DE IMPLEMENTACIÓN REALISTA**

### **FASE 1: SINCRONIZACIÓN CRÍTICA (Semana 1-2)**
**Objetivo**: Hacer que el frontend funcione con el backend actual

#### **1.1 Actualizar useApi Hook**
```typescript
// hooks/useApi.ts - ACTUALIZAR
const API_BASE_URL = 'http://localhost:8000/api/v1'; // ✅ Agregar /api/v1

const useApi = () => {
  const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  };
  
  return { request };
};
```

#### **1.2 Actualizar Tipos TypeScript**
```typescript
// types/development.ts - CREAR
export interface DevelopmentWithCurrentStatus {
  // ... usar esquemas reales del backend
}

export interface DevelopmentPhase {
  // ... usar esquemas reales del backend
}

export interface DevelopmentStage {
  // ... usar esquemas reales del backend
}
```

#### **1.3 Actualizar Dashboard**
```typescript
// pages/Dashboard.tsx - ACTUALIZAR
const Dashboard = () => {
  const { request } = useApi();
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await request('/dashboard/metrics');
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };
    
    fetchMetrics();
  }, []);
  
  // ... resto del componente
};
```

#### **1.4 Actualizar MyDevelopments**
```typescript
// pages/MyDevelopments.tsx - ACTUALIZAR
const MyDevelopments = () => {
  const { request } = useApi();
  const [developments, setDevelopments] = useState<DevelopmentWithCurrentStatus[]>([]);
  
  useEffect(() => {
    const fetchDevelopments = async () => {
      try {
        const data = await request('/developments');
        setDevelopments(data);
      } catch (error) {
        console.error('Error fetching developments:', error);
      }
    };
    
    fetchDevelopments();
  }, []);
  
  // ... resto del componente
};
```

### **FASE 2: FUNCIONALIDADES NUEVAS (Semana 3-4)**
**Objetivo**: Implementar funcionalidades que no existen en el frontend

#### **2.1 Sistema de Fases y Etapas**
```typescript
// components/development/DevelopmentPhases.tsx - CREAR
const DevelopmentPhases = ({ developmentId }: { developmentId: string }) => {
  const { request } = useApi();
  const [phases, setPhases] = useState<DevelopmentPhase[]>([]);
  const [stages, setStages] = useState<DevelopmentStage[]>([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [phasesData, stagesData, statusData] = await Promise.all([
          request('/phases'),
          request('/stages'),
          request(`/developments/${developmentId}`)
        ]);
        
        setPhases(phasesData);
        setStages(stagesData);
        setCurrentStatus(statusData);
      } catch (error) {
        console.error('Error fetching phases data:', error);
      }
    };
    
    fetchData();
  }, [developmentId]);
  
  // ... resto del componente
};
```

#### **2.2 Controles de Calidad**
```typescript
// components/quality/QualityControlPanel.tsx - CREAR
const QualityControlPanel = ({ developmentId }: { developmentId: string }) => {
  const { request } = useApi();
  const [controls, setControls] = useState<DevelopmentQualityControl[]>([]);
  
  useEffect(() => {
    const fetchControls = async () => {
      try {
        const data = await request(`/quality/controls?development_id=${developmentId}`);
        setControls(data);
      } catch (error) {
        console.error('Error fetching quality controls:', error);
      }
    };
    
    fetchControls();
  }, [developmentId]);
  
  // ... resto del componente
};
```

#### **2.3 Sistema de Alertas**
```typescript
// components/alerts/AlertPanel.tsx - CREAR
const AlertPanel = () => {
  const { request } = useApi();
  const [alerts, setAlerts] = useState<DevelopmentUpcomingActivity[]>([]);
  
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await request('/alerts/upcoming');
        setAlerts(data);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };
    
    fetchAlerts();
  }, []);
  
  // ... resto del componente
};
```

### **FASE 3: FUNCIONALIDADES AVANZADAS (Semana 5-6)**
**Objetivo**: Implementar chat, IA y KPIs avanzados

#### **3.1 Chat Integrado**
```typescript
// components/chat/ChatWindow.tsx - CREAR
const ChatWindow = ({ sessionId }: { sessionId?: string }) => {
  const { request } = useApi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const sendMessage = async (content: string) => {
    try {
      const response = await request(`/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, sender: 'user' })
      });
      
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // ... resto del componente
};
```

#### **3.2 Dashboard de KPIs**
```typescript
// components/kpi/KpiDashboard.tsx - CREAR
const KpiDashboard = () => {
  const { request } = useApi();
  const [metrics, setMetrics] = useState<DevelopmentKpiMetric[]>([]);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await request('/kpi/metrics');
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching KPI metrics:', error);
      }
    };
    
    fetchMetrics();
  }, []);
  
  // ... resto del componente
};
```

#### **3.3 Análisis de IA**
```typescript
// components/ai/AnalysisPanel.tsx - CREAR
const AnalysisPanel = ({ developmentId }: { developmentId: string }) => {
  const { request } = useApi();
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  
  const analyzeDevelopment = async (question: string) => {
    try {
      const response = await request(`/ai/analyze/development/${developmentId}`, {
        method: 'POST',
        body: JSON.stringify({ question })
      });
      
      setAnalysis(response);
    } catch (error) {
      console.error('Error analyzing development:', error);
    }
  };
  
  // ... resto del componente
};
```

---

## 📋 **CHECKLIST DE IMPLEMENTACIÓN**

### **✅ FASE 1: SINCRONIZACIÓN CRÍTICA**
- [ ] Actualizar `useApi` hook con `/api/v1`
- [ ] Crear tipos TypeScript basados en schemas reales
- [ ] Actualizar Dashboard con endpoints reales
- [ ] Actualizar MyDevelopments con nueva estructura
- [ ] Probar integración básica frontend-backend

### **✅ FASE 2: FUNCIONALIDADES NUEVAS**
- [ ] Implementar sistema de fases y etapas
- [ ] Crear controles de calidad
- [ ] Implementar sistema de alertas
- [ ] Agregar gestión de KPIs básicos
- [ ] Probar funcionalidades nuevas

### **✅ FASE 3: FUNCIONALIDADES AVANZADAS**
- [ ] Implementar chat integrado
- [ ] Crear análisis de IA
- [ ] Desarrollar dashboard de KPIs avanzado
- [ ] Agregar predicciones y recomendaciones
- [ ] Optimizar y pulir interfaces

---

## 🚀 **VENTAJAS DE ESTE ENFOQUE**

### **✅ REALISTA**
- Basado en backend **REAL** y **FUNCIONAL**
- Endpoints **VERIFICADOS** y **PROBADOS**
- Esquemas de datos **EXACTOS**

### **✅ GRADUAL**
- Mantiene funcionalidad existente
- Agrega nuevas características paso a paso
- Minimiza riesgo de romper el sistema

### **✅ COMPLETO**
- Cubre **TODAS** las funcionalidades del backend
- Incluye **TODOS** los endpoints disponibles
- Usa **TODOS** los esquemas de datos

### **✅ ESCALABLE**
- Fácil de mantener y extender
- Estructura modular y organizada
- Preparado para futuras mejoras

---

## 📊 **COMPARACIÓN: PLAN vs REALIDAD**

| Aspecto | Plan Original | Backend Real | Frontend Actual | Acción Requerida |
|---------|---------------|--------------|-----------------|------------------|
| **Endpoints** | Asumidos | ✅ 8 módulos completos | ❌ Endpoints legacy | 🔄 Actualizar |
| **Tipos** | Básicos | ✅ 15+ schemas complejos | ❌ Tipos simples | 🔄 Recrear |
| **Fases/Etapas** | Componentes | ✅ Endpoints + modelos | ❌ Hardcodeado | 🆕 Implementar |
| **Calidad** | Avanzado | ✅ Sistema completo | ❌ No existe | 🆕 Implementar |
| **Alertas** | Sistema | ✅ Endpoints + modelos | ❌ No existe | 🆕 Implementar |
| **Chat/IA** | Integrado | ✅ Endpoints + IA | ❌ Básico | 🔄 Mejorar |
| **KPIs** | Dashboards | ✅ Métricas reales | ❌ Básico | 🔄 Mejorar |

---

## 🎯 **CONCLUSIÓN**

### **El backend está MÁS AVANZADO de lo esperado:**
- ✅ **Sistema completo** de fases y etapas
- ✅ **Controles de calidad** avanzados
- ✅ **Sistema de alertas** en tiempo real
- ✅ **Chat e IA** completamente implementados
- ✅ **KPIs y métricas** con datos reales

### **El frontend necesita SINCRONIZACIÓN URGENTE:**
- 🔄 **Actualizar endpoints** de `/developments` a `/api/v1/developments`
- 🔄 **Recrear tipos** basados en schemas reales
- 🆕 **Implementar funcionalidades** que no existen
- 🔄 **Mejorar componentes** existentes

### **RECOMENDACIÓN:**
**Implementar el plan de 3 fases** para sincronizar gradualmente el frontend con el backend real, manteniendo la funcionalidad existente mientras se agregan las nuevas características.

---

*Documento actualizado basado en análisis completo del backend - Sistema de Gestión de Proyectos TI*
