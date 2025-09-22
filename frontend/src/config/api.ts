// Configuración de la API
// Sistema de Gestión de Proyectos TI

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  TIMEOUT: 30000, // 30 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
};

export const API_ENDPOINTS = {
  // Desarrollos
  DEVELOPMENTS: '/developments/',
  DEVELOPMENT_BY_ID: (id: string) => `/developments/${id}`,
  DEVELOPMENT_STAGE: (id: string) => `/developments/${id}/stage`,
  DEVELOPMENT_PROGRESS: (id: string) => `/developments/${id}/progress`,
  
  // Fases y etapas
  PHASES: '/phases/',
  PHASE_BY_ID: (id: number) => `/phases/${id}`,
  STAGES: '/stages/',
  STAGE_BY_ID: (id: number) => `/stages/${id}`,
  CYCLE_FLOW: '/stages/cycle-flow',
  
  // Controles de calidad
  QUALITY_CONTROLS: '/quality/controls',
  QUALITY_CONTROL_BY_ID: (id: number) => `/quality/controls/${id}`,
  QUALITY_CONTROL_VALIDATE: (id: number) => `/quality/controls/${id}/validate`,
  QUALITY_CONTROL_EVIDENCE: (id: number) => `/quality/controls/${id}/evidence`,
  QUALITY_CATALOG: '/quality/catalog',
  QUALITY_GENERATE_CONTROLS: (id: string) => `/quality/developments/${id}/generate-controls`,
  
  // KPIs y métricas
  KPI_METRICS: '/kpi/metrics',
  KPI_DASHBOARD: '/kpi/dashboard',
  KPI_FUNCTIONALITIES: '/kpi/functionalities',
  KPI_TEST_RESULTS: '/kpi/test-results',
  KPI_DELIVERY_HISTORY: '/kpi/delivery-history',
  KPI_QUALITY_METRICS: '/kpi/quality-metrics',
  
  // Alertas
  ALERTS_UPCOMING: '/alerts/upcoming',
  ALERTS_ACTIVITIES: '/alerts/activities',
  ALERT_ACTIVITY_BY_ID: (id: number) => `/alerts/activities/${id}`,
  
  // Chat
  CHAT_SESSIONS: '/chat/sessions',
  CHAT_SESSION_BY_ID: (id: number) => `/chat/sessions/${id}`,
  CHAT_MESSAGES: (sessionId: number) => `/chat/sessions/${sessionId}/messages`,
  
  // IA
  AI_ANALYZE_DEVELOPMENT: (id: string) => `/ai/analyze/development/${id}`,
  AI_ANALYZE_PROVIDER: (name: string) => `/ai/analyze/provider/${name}`,
  AI_DASHBOARD_INTELLIGENT: '/ai/dashboard/intelligent',
  AI_RISKS_DETECT: '/ai/risks/detect',
  AI_RECOMMENDATIONS: (id: string) => `/ai/recommendations/${id}`,
  AI_CHAT_CONTEXTUAL: '/ai/chat/contextual',
  AI_INSIGHTS_TRENDS: '/ai/insights/trends',
  AI_PREDICT_TIMELINE: '/ai/predict/timeline',
  
  // Dashboard
  DASHBOARD_METRICS: '/dashboard/metrics',
  DASHBOARD_PRIORITY_DISTRIBUTION: '/dashboard/priority-distribution',
  DASHBOARD_WEEKLY_PROGRESS: '/dashboard/weekly-progress',
  DASHBOARD_UPCOMING_MILESTONES: '/dashboard/upcoming-milestones',
  
  // Activity Log (Bitácora)
  ACTIVITY_LOG_CREATE: (developmentId: string) => `/activity-log/developments/${developmentId}/activities`,
  ACTIVITY_LOG_LIST: (developmentId: string) => `/activity-log/developments/${developmentId}/activities`,
  ACTIVITY_LOG_UPDATE: (activityId: number) => `/activity-log/activities/${activityId}`,
  ACTIVITY_LOG_DELETE: (activityId: number) => `/activity-log/activities/${activityId}`,
  ACTIVITY_LOG_FIELD_CONFIG: (developmentId: string, stageId: number) => `/activity-log/developments/${developmentId}/stages/${stageId}/field-config`,

  // Development stages actions
  DEVELOPMENT_STAGE_CLOSE: (developmentId: string) => `/development-stages/${developmentId}/close-stage`
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  SERVER_ERROR: 'Error del servidor. Intenta nuevamente más tarde.',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  VALIDATION_ERROR: 'Los datos proporcionados no son válidos.',
  TIMEOUT_ERROR: 'La solicitud tardó demasiado tiempo en responder.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.',
} as const;
