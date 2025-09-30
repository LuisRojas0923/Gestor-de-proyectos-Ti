# Sistema de Logging Centralizado - Ejemplos de Uso

## 🚀 Uso Básico

```typescript
import { development, phases, api, modal, validation, debug } from '../utils/logger';

// Logs de desarrollo
development.info('Desarrollo cargado exitosamente', developmentData);
development.debug('Procesando desarrollo', { id: dev.id, stage: dev.current_stage_id });
development.warn('Desarrollo sin responsable asignado', dev.id);
development.error('Error al cargar desarrollo', error);

// Logs de fases
phases.info('Fases cargadas correctamente', phasesData);
phases.debug('Validación de fases completada', { totalStages: 11, currentStage: 7 });
phases.warn('Etapa actual no encontrada', stageId);
phases.error('Error en cálculo de progreso', error);

// Logs de API
api.info('API response received', response);
api.debug('Making API request', { url, method, body });
api.warn('API response with warnings', { status, warnings });
api.error('API request failed', { error, url, method });

// Logs de modales
modal.info('Modal abierto', modalType);
modal.debug('Validando formulario', formData);
modal.warn('Formulario con errores', validationErrors);
modal.error('Error al guardar', error);

// Logs de validación
validation.info('Validación exitosa', field);
validation.debug('Validando campo', { field, value, rules });
validation.warn('Campo con advertencias', { field, warnings });
validation.error('Error de validación', { field, error });

// Logs de debug general
debug.info('Debug info', data);
debug.debug('Debug details', detailedData);
debug.warn('Debug warning', warningData);
debug.error('Debug error', errorData);
```

## 🔧 Control de Configuración

```typescript
import { logger } from '../utils/logger';

// Desactivar todos los logs
logger.setEnabled(false);

// Activar logs nuevamente
logger.setEnabled(true);

// Desactivar logs de un módulo específico
logger.setModuleEnabled('phases', false);
logger.setModuleEnabled('api', false);

// Activar logs de un módulo específico
logger.setModuleEnabled('phases', true);

// Desactivar logs de un nivel específico
logger.setLevelEnabled('debug', false);
logger.setLevelEnabled('info', false);

// Ver configuración actual
const config = logger.getConfig();
console.log('Configuración actual:', config);

// Resetear configuración a valores por defecto
logger.resetConfig();
```

## 📊 Configuración por Módulo

```typescript
// En logger.ts puedes configurar qué módulos están activos por defecto
const LOG_CONFIG = {
  enabled: true,
  modules: {
    development: true,    // Logs de desarrollos
    phases: true,        // Logs de fases y etapas
    api: true,           // Logs de API
    modal: true,         // Logs de modales
    validation: true,    // Logs de validación
    debug: true          // Logs de debug general
  },
  levels: {
    info: true,
    debug: true,
    warn: true,
    error: true
  }
};
```

## 🎯 Ventajas del Sistema

1. **Código Limpio**: Los logs no ensucian el código principal
2. **Control Centralizado**: Activar/desactivar logs desde un solo lugar
3. **Organización**: Logs organizados por módulos (development, phases, api, etc.)
4. **Niveles**: Diferentes niveles de log (info, debug, warn, error)
5. **Formato Consistente**: Todos los logs tienen el mismo formato
6. **Timestamp**: Cada log incluye timestamp automáticamente
7. **Fácil Debugging**: Identificar rápidamente de qué módulo viene cada log

## 🔍 Formato de Salida

```
[18:30:45] 🔍 PHASES: Usando current_stage_id directamente 7
[18:30:45] 🔍 DEVELOPMENT: Opening details for development {id: "INC000004900455", name: "CER-DRP Oficina Virtual"}
[18:30:45] 🔍 API: Making API request {url: "/developments/INC000004900455", method: "GET"}
[18:30:45] 🔍 PHASES: Validación de Fases {developmentId: "INC000004900455", currentStage: 7, totalProgress: "60%"}
```

## 🚨 Para Producción

```typescript
// Al inicio de la aplicación, desactivar logs para producción
if (process.env.NODE_ENV === 'production') {
  logger.setEnabled(false);
}

// O desactivar solo logs de debug
if (process.env.NODE_ENV === 'production') {
  logger.setLevelEnabled('debug', false);
}
```
