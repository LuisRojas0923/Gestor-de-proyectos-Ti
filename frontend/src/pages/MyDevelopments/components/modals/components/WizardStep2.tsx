import React from 'react';
import { FollowUpConfig } from '../hooks/useActivityValidation';

interface WizardStep2Props {
  startDate: string;
  endDate: string;
  followUpConfig: FollowUpConfig;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFollowUpConfigChange: (config: FollowUpConfig) => void;
  darkMode: boolean;
}

export const WizardStep2: React.FC<WizardStep2Props> = ({
  startDate,
  endDate,
  followUpConfig,
  onStartDateChange,
  onEndDateChange,
  onFollowUpConfigChange,
  darkMode,
}) => {
  const handleFollowUpEnabledChange = (enabled: boolean) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      enabled,
      ...(enabled ? {} : { type: 'before_start', days: undefined, interval: undefined, endDate: undefined })
    });
  };

  const handleFollowUpTypeChange = (type: FollowUpConfig['type']) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      type,
      ...(type.includes('before') ? { interval: undefined } : { days: undefined })
    });
  };

  const handleDaysChange = (days: number) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      days
    });
  };

  const handleIntervalChange = (interval: number) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      interval
    });
  };

  const handleEndDateChange = (endDate: string) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      endDate: endDate || undefined
    });
  };

  const getFollowUpDescription = () => {
    if (!followUpConfig.enabled) return '';
    
    const { type, days, interval, endDate } = followUpConfig;
    
    switch (type) {
      case 'before_start':
        return `Recordatorio ${days} día${days > 1 ? 's' : ''} antes del inicio`;
      case 'before_end':
        return `Recordatorio ${days} día${days > 1 ? 's' : ''} antes del fin`;
      case 'after_start':
        return `Seguimiento cada ${interval} día${interval > 1 ? 's' : ''} desde el inicio${endDate ? ` hasta ${new Date(endDate).toLocaleDateString()}` : ''}`;
      case 'after_end':
        return `Seguimiento cada ${interval} día${interval > 1 ? 's' : ''} desde el fin${endDate ? ` hasta ${new Date(endDate).toLocaleDateString()}` : ''}`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Fechas básicas */}
      <div>
        <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Fechas de la Actividad
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Fecha de Inicio
            </label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => onStartDateChange(e.target.value)} 
              className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} 
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Fecha de Fin
            </label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => onEndDateChange(e.target.value)} 
              className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} 
            />
          </div>
        </div>
      </div>

      {/* Configuración de seguimiento */}
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-blue-50 border-blue-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          📅 Configuración de Seguimiento
        </h4>
        
        <div className="space-y-4">
          {/* Habilitar seguimiento */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              ¿Configurar seguimiento automático?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="followup-enabled"
                  checked={!followUpConfig.enabled}
                  onChange={() => handleFollowUpEnabledChange(false)}
                  className="w-4 h-4"
                />
                <span className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>No</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="followup-enabled"
                  checked={followUpConfig.enabled}
                  onChange={() => handleFollowUpEnabledChange(true)}
                  className="w-4 h-4"
                />
                <span className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Sí</span>
              </label>
            </div>
          </div>

          {/* Configuración de seguimiento */}
          {followUpConfig.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-300">
              {/* Tipo de seguimiento */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Tipo de Seguimiento
                </label>
                <select 
                  value={followUpConfig.type || ''} 
                  onChange={(e) => handleFollowUpTypeChange(e.target.value as FollowUpConfig['type'])} 
                  className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                >
                  <option value="">Selecciona el tipo...</option>
                  <option value="before_start">Antes del inicio</option>
                  <option value="after_start">Después del inicio (recurrente)</option>
                  <option value="before_end">Antes del fin</option>
                  <option value="after_end">Después del fin (recurrente)</option>
                </select>
              </div>

              {/* Configuración específica según el tipo */}
              {followUpConfig.type && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Para seguimiento "antes de" */}
                  {followUpConfig.type.includes('before') && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                        Cuántos días antes
                      </label>
                      <select 
                        value={followUpConfig.days || ''} 
                        onChange={(e) => handleDaysChange(Number(e.target.value))} 
                        className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                      >
                        <option value="">Selecciona...</option>
                        <option value="1">1 día antes</option>
                        <option value="2">2 días antes</option>
                        <option value="3">3 días antes</option>
                        <option value="7">1 semana antes</option>
                        <option value="14">2 semanas antes</option>
                      </select>
                    </div>
                  )}

                  {/* Para seguimiento "después de" */}
                  {followUpConfig.type.includes('after') && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                        Frecuencia
                      </label>
                      <select 
                        value={followUpConfig.interval || ''} 
                        onChange={(e) => handleIntervalChange(Number(e.target.value))} 
                        className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                      >
                        <option value="">Selecciona...</option>
                        <option value="1">Diariamente</option>
                        <option value="2">Cada 2 días</option>
                        <option value="3">Cada 3 días</option>
                        <option value="7">Semanalmente</option>
                        <option value="14">Cada 2 semanas</option>
                      </select>
                    </div>
                  )}

                  {/* Fecha límite para seguimiento recurrente */}
                  {followUpConfig.type.includes('after') && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                        Fecha límite (opcional)
                      </label>
                      <input 
                        type="date" 
                        value={followUpConfig.endDate || ''} 
                        onChange={(e) => handleEndDateChange(e.target.value)} 
                        className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`} 
                      />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        Dejar vacío para seguimiento indefinido
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Descripción del seguimiento */}
              {followUpConfig.enabled && followUpConfig.type && (
                <div className={`p-3 rounded-md ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                  <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    <strong>📋 Resumen:</strong> {getFollowUpDescription()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Consejo */}
      <div className={`p-3 rounded-md ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
          💡 <strong>Consejo:</strong> El sistema calculará automáticamente las fechas de seguimiento basándose en la configuración que elijas.
        </p>
      </div>
    </div>
  );
};