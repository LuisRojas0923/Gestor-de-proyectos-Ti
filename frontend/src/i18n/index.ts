import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      // Navigation
      dashboard: 'Tablero',
      requirements: 'Requerimientos',
      testing: 'Pruebas',
      chat: 'Chat IA',
      reports: 'Reportes',
      settings: 'Configuración',
      
      // Dashboard
      pending: 'Pendientes',
      inProgress: 'En Progreso',
      completed_plural: 'Completadas',
      avgSLA: 'SLA Promedio',
      weeklyProgress: 'Progreso Semanal',
      upcomingMilestones: 'Hitos Próximos',
      
      // Requirements
      requirementId: 'ID Requerimiento',
      title: 'Título',
      status: 'Estado',
      priority: 'Prioridad',
      dueDate: 'Vencimiento',
      assignedTo: 'Asignado a',
      filterBy: 'Filtrar por',
      allStatuses: 'Todos los estados',
      allPriorities: 'Todas las prioridades',
      
      // Testing
      backlog: 'Backlog',
      testing_status: 'En Prueba',
      blocked: 'Bloqueado',
      approved: 'Aprobado',
      generateAIScenarios: 'Generar Escenarios IA',
      
      // Common
      search: 'Buscar',
      save: 'Guardar',
      cancel: 'Cancelar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      export: 'Exportar',
      
      // Priorities
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
      
      // Statuses
      new: 'Nuevo',
      validated: 'Validado',
      in_test: 'En Prueba',
      completed: 'Completado',
      rejected: 'Rechazado',
    }
  },
  en: {
    translation: {
      // Navigation
      dashboard: 'Dashboard',
      requirements: 'Requirements',
      testing: 'Testing',
      chat: 'AI Chat',
      reports: 'Reports',
      settings: 'Settings',
      
      // Dashboard
      pending: 'Pending',
      inProgress: 'In Progress',
      completed_plural: 'Completed',
      avgSLA: 'Avg SLA',
      weeklyProgress: 'Weekly Progress',
      upcomingMilestones: 'Upcoming Milestones',
      
      // Requirements
      requirementId: 'Requirement ID',
      title: 'Title',
      status: 'Status',
      priority: 'Priority',
      dueDate: 'Due Date',
      assignedTo: 'Assigned To',
      filterBy: 'Filter by',
      allStatuses: 'All statuses',
      allPriorities: 'All priorities',
      
      // Testing
      backlog: 'Backlog',
      testing_status: 'Testing',
      blocked: 'Blocked',
      approved: 'Approved',
      generateAIScenarios: 'Generate AI Scenarios',
      
      // Common
      search: 'Search',
      save: 'Save',
      cancel: 'Cancel',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      export: 'Export',
      
      // Priorities
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      
      // Statuses
      new: 'New',
      validated: 'Validated',
      in_test: 'In Test',
      completed: 'Completed',
      rejected: 'Rejected',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;