// Configuración de la API
// Sistema de Gestión de Proyectos TI

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://192.168.40.36:8000/api/v2',
  TIMEOUT: 30000, // 30 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
};

export const API_ENDPOINTS = {
  // Desarrollos
  DEVELOPMENTS: '/desarrollos/',
  DEVELOPMENT_BY_ID: (id: string) => `/desarrollos/${id}`,
  DEVELOPMENT_STAGE: (id: string) => `/desarrollos/${id}/etapa`,
  DEVELOPMENT_OBSERVATIONS: (id: string) => `/desarrollos/${id}/observaciones`,
  DEVELOPMENT_CURRENT_STATUS: (id: string) => `/desarrollos/${id}/estado-actual`,

  // Fases y etapas
  PHASES: '/fases/',
  PHASE_BY_ID: (id: number) => `/fases/${id}`,
  STAGES: '/etapas/',
  STAGE_BY_ID: (id: number) => `/etapas/${id}`,
  CYCLE_FLOW: '/etapas/flujo-ciclo',

  // Controles de calidad
  QUALITY_CONTROLS: '/calidad/controles',
  QUALITY_CONTROL_BY_ID: (id: number) => `/calidad/controles/${id}`,
  QUALITY_CONTROL_VALIDATE: (id: number) => `/calidad/controles/${id}/validar`,
  QUALITY_CONTROL_EVIDENCE: (id: number) => `/calidad/controles/${id}/evidencia`,
  QUALITY_CATALOG: '/calidad/catalogo',
  QUALITY_GENERATE_CONTROLS: (id: string) => `/calidad/desarrollos/${id}/generar-controles`,

  // KPIs y métricas
  KPI_METRICS: '/indicadores/metricas',
  KPI_DASHBOARD: '/indicadores/panel',
  KPI_DEVELOPMENT_COMPLIANCE_DETAILS: '/indicadores/cumplimiento-desarrollo/detalles',
  KPI_ANALYSIS_COMPLIANCE_DETAILS: '/indicadores/cumplimiento-analisis/detalles',
  KPI_PROPOSAL_COMPLIANCE_DETAILS: '/indicadores/cumplimiento-propuesta/detalles',
  KPI_GLOBAL_COMPLETE_COMPLIANCE_DETAILS: '/indicadores/cumplimiento-global-completo/detalles',
  KPI_FUNCTIONALITIES: '/indicadores/funcionalidades',
  KPI_TEST_RESULTS: '/indicadores/test-results', // No encontrado en kpi.py, dejar así o buscar
  KPI_DELIVERY_HISTORY: '/indicadores/delivery-history', // No encontrado en kpi.py, dejar así o buscar
  KPI_QUALITY_METRICS: '/indicadores/metricas-calidad',

  // Alertas
  ALERTS_UPCOMING: '/alertas/proximas',
  ALERTS_ACTIVITIES: '/alertas/actividades',
  ALERT_ACTIVITY_BY_ID: (id: number) => `/alertas/actividades/${id}`,

  // Chat
  CHAT_SESSIONS: '/chat/sesiones',
  CHAT_SESSION_BY_ID: (id: number) => `/chat/sesiones/${id}`,
  CHAT_MESSAGES: (sessionId: number) => `/chat/sesiones/${sessionId}/mensajes`,

  // IA
  AI_ANALYZE_DEVELOPMENT: (id: string) => `/ia/analizar/desarrollo/${id}`,
  AI_ANALYZE_PROVIDER: (name: string) => `/ia/analizar/proveedor/${name}`,
  AI_DASHBOARD_INTELLIGENT: '/ia/panel/inteligente',
  AI_RISKS_DETECT: '/ia/riesgos/detectar',
  AI_RECOMMENDATIONS: (id: string) => `/ia/recomendaciones/${id}`,
  AI_CHAT_CONTEXTUAL: '/ia/chat/contextual',
  AI_INSIGHTS_TRENDS: '/ia/insights/tendencias',
  AI_PREDICT_TIMELINE: '/ia/predecir/cronograma',

  // Dashboard
  DASHBOARD_METRICS: '/panel-control/metricas',
  DASHBOARD_PRIORITY_DISTRIBUTION: '/panel-control/distribucion-prioridad',
  DASHBOARD_WEEKLY_PROGRESS: '/panel-control/progreso-semanal',
  DASHBOARD_UPCOMING_MILESTONES: '/panel-control/proximos-hitos',
  DASHBOARD_PENDING_ACTIVITIES: '/panel-control/actividades-pendientes',

  // Activity Log (Bitácora)
  ACTIVITY_LOG_CREATE: (developmentId: string) => `/log-actividades/desarrollos/${developmentId}/actividades`,
  ACTIVITY_LOG_LIST: (developmentId: string) => `/log-actividades/desarrollos/${developmentId}/actividades`,
  ACTIVITY_LOG_UPDATE: (activityId: number) => `/log-actividades/actividades/${activityId}`,
  ACTIVITY_LOG_DELETE: (activityId: number) => `/log-actividades/actividades/${activityId}`,
  ACTIVITY_LOG_FIELD_CONFIG: (developmentId: string, stageId: number) => `/log-actividades/desarrollos/${developmentId}/etapas/${stageId}/configuracion-campos`,

  // Development stages actions
  DEVELOPMENT_STAGE_CLOSE: (developmentId: string) => `/etapas-desarrollo/${developmentId}/cerrar-etapa`,

  DEVELOPMENTS_BULK: '/desarrollos/masivo',

  // Soporte / Tickets
  TICKET_CATEGORIES: '/soporte/categorias',
  TICKET_CREATE: '/soporte/',
  TICKET_MY_TICKETS: (id: string) => `/soporte/mis-tickets/${id}`,
  TICKET_BY_ID: (id: string) => `/soporte/${id}`,
  TICKET_UPDATE: (id: string) => `/soporte/${id}`,
  TICKET_CREATE_COMMENT: (id: string) => `/soporte/${id}/comentarios`,
  TICKET_GET_COMMENTS: (id: string) => `/soporte/${id}/comentarios`,
  TICKET_STATS_SUMMARY: '/soporte/estadisticas/resumen',
  TICKET_STATS_PERFORMANCE: '/soporte/estadisticas/rendimiento',

  // Instaladores
  INSTALLERS_FAILED: '/instaladores/fallidos',
  INSTALLERS_SEARCH: (num: string) => `/instaladores/buscar/${num}`,
  INSTALLERS_PROBLEMS_REPORT: '/instaladores/informe-problemas',

  // Autenticación
  AUTH_LOGIN: '/auth/login',
  AUTH_ME: '/auth/yo',
  // Reportes
  REPORTS_PORTAL_DETAILED: '/desarrollos/informe-detallado-casos-portal',

  // ERP
  ERP_SOLICITUDES: '/erp/solicitudes',
  ERP_EMPLEADO: (id: string) => `/erp/empleado/${id}`,
  ERP_SINCRONIZAR: '/erp/sincronizar',
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
