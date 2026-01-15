/**
 * Sistema de Logging Centralizado
 * Permite activar/desactivar logs de manera global
 * y mantener el código principal limpio
 */

// Configuración global de logging
const LOG_CONFIG = {
  // Activar/desactivar todos los logs
  enabled: true,

  // Configuraciones específicas por módulo
  modules: {
    development: true,    // Logs de desarrollos
    phases: true,        // Logs de fases y etapas
    api: true,           // Logs de API
    modal: true,         // Logs de modales
    validation: true,    // Logs de validación
    debug: true          // Logs de debug general
  },

  // Niveles de log
  levels: {
    info: true,
    debug: true,
    warn: true,
    error: true
  }
};

// Función principal de logging
function log(module: keyof typeof LOG_CONFIG.modules, level: keyof typeof LOG_CONFIG.levels, message: string, data?: unknown) {
  // Verificar si los logs están habilitados globalmente
  if (!LOG_CONFIG.enabled) return;

  // Verificar si el módulo específico está habilitado
  if (!LOG_CONFIG.modules[module]) return;

  // Verificar si el nivel específico está habilitado
  if (!LOG_CONFIG.levels[level]) return;

  // Crear el prefijo del log
  const prefix = `🔍 ${module.toUpperCase()}:`;
  const timestamp = new Date().toLocaleTimeString();

  // Formatear el mensaje
  const formattedMessage = `[${timestamp}] ${prefix} ${message}`;

  // Ejecutar el log según el nivel
  switch (level) {
    case 'info':
      console.log(formattedMessage, data || '');
      break;
    case 'debug':
      console.log(formattedMessage, data || '');
      break;
    case 'warn':
      console.warn(formattedMessage, data || '');
      break;
    case 'error':
      console.error(formattedMessage, data || '');
      break;
  }
}

// Funciones específicas por módulo
export const logger = {
  // Logs de desarrollo
  development: {
    info: (message: string, data?: unknown) => log('development', 'info', message, data),
    debug: (message: string, data?: unknown) => log('development', 'debug', message, data),
    warn: (message: string, data?: unknown) => log('development', 'warn', message, data),
    error: (message: string, data?: unknown) => log('development', 'error', message, data)
  },

  // Logs de fases y etapas
  phases: {
    info: (message: string, data?: unknown) => log('phases', 'info', message, data),
    debug: (message: string, data?: unknown) => log('phases', 'debug', message, data),
    warn: (message: string, data?: unknown) => log('phases', 'warn', message, data),
    error: (message: string, data?: unknown) => log('phases', 'error', message, data)
  },

  // Logs de API
  api: {
    info: (message: string, data?: unknown) => log('api', 'info', message, data),
    debug: (message: string, data?: unknown) => log('api', 'debug', message, data),
    warn: (message: string, data?: unknown) => log('api', 'warn', message, data),
    error: (message: string, data?: unknown) => log('api', 'error', message, data)
  },

  // Logs de modales
  modal: {
    info: (message: string, data?: unknown) => log('modal', 'info', message, data),
    debug: (message: string, data?: unknown) => log('modal', 'debug', message, data),
    warn: (message: string, data?: unknown) => log('modal', 'warn', message, data),
    error: (message: string, data?: unknown) => log('modal', 'error', message, data)
  },

  // Logs de validación
  validation: {
    info: (message: string, data?: unknown) => log('validation', 'info', message, data),
    debug: (message: string, data?: unknown) => log('validation', 'debug', message, data),
    warn: (message: string, data?: unknown) => log('validation', 'warn', message, data),
    error: (message: string, data?: unknown) => log('validation', 'error', message, data)
  },

  // Logs de debug general
  debug: {
    info: (message: string, data?: unknown) => log('debug', 'info', message, data),
    debug: (message: string, data?: unknown) => log('debug', 'debug', message, data),
    warn: (message: string, data?: unknown) => log('debug', 'warn', message, data),
    error: (message: string, data?: unknown) => log('debug', 'error', message, data)
  },

  // Función para activar/desactivar logs globalmente
  setEnabled: (enabled: boolean) => {
    LOG_CONFIG.enabled = enabled;
    console.log(`🔧 Logger ${enabled ? 'activado' : 'desactivado'} globalmente`);
  },

  // Función para activar/desactivar módulos específicos
  setModuleEnabled: (module: keyof typeof LOG_CONFIG.modules, enabled: boolean) => {
    LOG_CONFIG.modules[module] = enabled;
    console.log(`🔧 Logger del módulo '${module}' ${enabled ? 'activado' : 'desactivado'}`);
  },

  // Función para activar/desactivar niveles específicos
  setLevelEnabled: (level: keyof typeof LOG_CONFIG.levels, enabled: boolean) => {
    LOG_CONFIG.levels[level] = enabled;
    console.log(`🔧 Logger del nivel '${level}' ${enabled ? 'activado' : 'desactivado'}`);
  },

  // Función para obtener la configuración actual
  getConfig: () => ({ ...LOG_CONFIG }),

  // Función para resetear la configuración a valores por defecto
  resetConfig: () => {
    LOG_CONFIG.enabled = true;
    Object.keys(LOG_CONFIG.modules).forEach(module => {
      LOG_CONFIG.modules[module as keyof typeof LOG_CONFIG.modules] = true;
    });
    Object.keys(LOG_CONFIG.levels).forEach(level => {
      LOG_CONFIG.levels[level as keyof typeof LOG_CONFIG.levels] = true;
    });
    console.log('🔧 Configuración del logger reseteada a valores por defecto');
  }
};

// Exportar también funciones de conveniencia para uso rápido
export const { development, phases, api, modal, validation, debug } = logger;

// Exportar configuración para acceso directo si es necesario
export { LOG_CONFIG };
