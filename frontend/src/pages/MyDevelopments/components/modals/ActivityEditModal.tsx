import React, { useState, useEffect } from 'react';
import { MaterialCard, MaterialButton } from '../../../../components/atoms';
import { FollowUpConfig } from './hooks/useActivityValidation';

interface ActivityEditModalProps {
  isOpen: boolean;
  activity: any | null;
  form: { 
    status: string; 
    notes?: string; 
    next_follow_up_at?: string; 
    start_date?: string; 
    end_date?: string;
  } | null;
  errors: string[];
  darkMode: boolean;
  onFormChange: (patch: Partial<{ 
    status: string; 
    notes?: string; 
    next_follow_up_at?: string; 
    start_date?: string; 
    end_date?: string;
    follow_up_config?: FollowUpConfig;
  }>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ActivityEditModal: React.FC<ActivityEditModalProps> = ({
  isOpen,
  activity,
  form,
  errors,
  darkMode,
  onFormChange,
  onConfirm,
  onCancel,
}) => {
  // Estado local para la configuración de seguimiento
  const [followUpConfig, setFollowUpConfig] = useState<FollowUpConfig>({
    enabled: false,
    type: 'before_start',
    days: undefined,
    interval: undefined,
    endDate: undefined,
  });

  // Inicializar configuración de seguimiento basada en la actividad existente
  useEffect(() => {
    if (activity?.follow_up_config) {
      setFollowUpConfig(activity.follow_up_config);
    } else if (form?.next_follow_up_at) {
      // Si hay una fecha de seguimiento pero no configuración, crear una configuración básica
      setFollowUpConfig({
        enabled: true,
        type: 'before_start',
        days: 1,
        interval: undefined,
        endDate: undefined,
      });
    }
  }, [activity, form]);

  if (!isOpen || !activity || !form) return null;

  // Función para calcular la próxima fecha de seguimiento
  const calculateNextFollowUp = (config: FollowUpConfig) => {
    if (!config.enabled || !config.type) return undefined;
    
    const { type, days, interval } = config;
    const startDateObj = form?.start_date ? new Date(form.start_date) : null;
    const endDateObj = form?.end_date ? new Date(form.end_date) : null;
    
    if (type === 'before_start' && startDateObj && days) {
      const followUpDate = new Date(startDateObj);
      followUpDate.setDate(followUpDate.getDate() - days);
      return followUpDate.toISOString().split('T')[0];
    }
    
    if (type === 'before_end' && endDateObj && days) {
      const followUpDate = new Date(endDateObj);
      followUpDate.setDate(followUpDate.getDate() - days);
      return followUpDate.toISOString().split('T')[0];
    }
    
    if (type === 'after_start' && startDateObj && interval) {
      const followUpDate = new Date(startDateObj);
      followUpDate.setDate(followUpDate.getDate() + interval);
      return followUpDate.toISOString().split('T')[0];
    }
    
    if (type === 'after_end' && endDateObj && interval) {
      const followUpDate = new Date(endDateObj);
      followUpDate.setDate(followUpDate.getDate() + interval);
      return followUpDate.toISOString().split('T')[0];
    }
    
    return undefined;
  };

  const handleFollowUpEnabledChange = (enabled: boolean) => {
    const newConfig: FollowUpConfig = {
      ...followUpConfig,
      enabled,
      ...(enabled ? {} : { type: 'before_start', days: undefined, interval: undefined, endDate: undefined })
    };
    setFollowUpConfig(newConfig);
    
    // Calcular next_follow_up_at basado en la configuración
    const calculatedFollowUp = calculateNextFollowUp(newConfig);
    onFormChange({ 
      follow_up_config: newConfig,
      next_follow_up_at: calculatedFollowUp
    });
  };

  const handleFollowUpTypeChange = (type: string) => {
    const validType = type as FollowUpConfig['type'];
    const newConfig: FollowUpConfig = {
      ...followUpConfig,
      type: validType,
      ...(validType.includes('before') ? { interval: undefined } : { days: undefined })
    };
    setFollowUpConfig(newConfig);
    
    // Calcular next_follow_up_at basado en la configuración
    const calculatedFollowUp = calculateNextFollowUp(newConfig);
    onFormChange({ 
      follow_up_config: newConfig,
      next_follow_up_at: calculatedFollowUp
    });
  };


  const handleEndDateChange = (endDate: string) => {
    const newConfig = { ...followUpConfig, endDate: endDate || undefined };
    setFollowUpConfig(newConfig);
    
    // Calcular next_follow_up_at basado en la configuración
    const calculatedFollowUp = calculateNextFollowUp(newConfig);
    onFormChange({ 
      follow_up_config: newConfig,
      next_follow_up_at: calculatedFollowUp
    });
  };

  const handleDaysChange = (days: number) => {
    const newConfig = { ...followUpConfig, days };
    setFollowUpConfig(newConfig);
    
    // Calcular next_follow_up_at basado en la configuración
    const calculatedFollowUp = calculateNextFollowUp(newConfig);
    onFormChange({ 
      follow_up_config: newConfig,
      next_follow_up_at: calculatedFollowUp
    });
  };

  const handleIntervalChange = (interval: number) => {
    const newConfig = { ...followUpConfig, interval };
    setFollowUpConfig(newConfig);
    
    // Calcular next_follow_up_at basado en la configuración
    const calculatedFollowUp = calculateNextFollowUp(newConfig);
    onFormChange({ 
      follow_up_config: newConfig,
      next_follow_up_at: calculatedFollowUp
    });
  };

  const getFollowUpDescription = () => {
    if (!followUpConfig.enabled) return '';
    
    const { type, days, interval, endDate } = followUpConfig;
    
    switch (type) {
      case 'before_start':
        return `Recordatorio ${days || 0} día${(days || 0) > 1 ? 's' : ''} antes del inicio`;
      case 'before_end':
        return `Recordatorio ${days || 0} día${(days || 0) > 1 ? 's' : ''} antes del fin`;
      case 'after_start':
        return `Seguimiento cada ${interval || 0} día${(interval || 0) > 1 ? 's' : ''} desde el inicio${endDate ? ` hasta ${new Date(endDate).toLocaleDateString()}` : ''}`;
      case 'after_end':
        return `Seguimiento cada ${interval || 0} día${(interval || 0) > 1 ? 's' : ''} desde el fin${endDate ? ` hasta ${new Date(endDate).toLocaleDateString()}` : ''}`;
      default:
        return '';
    }
  };

  return (
    <div className={`${darkMode ? 'bg-black/60' : 'bg-black/40'} fixed inset-0 z-50 flex items-center justify-center p-4`}>
      <MaterialCard elevation={8} className="w-full max-w-lg max-h-[90vh] flex flex-col" darkMode={darkMode}>
        <MaterialCard.Header>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Editar Actividad
            </h3>
            <button
              onClick={onCancel}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </MaterialCard.Header>
        
        <MaterialCard.Content className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Estado */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) => onFormChange({ status: e.target.value })}
                className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En Curso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            
            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={form.start_date || ''}
                  onChange={(e) => onFormChange({ start_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={form.end_date || ''}
                  onChange={(e) => onFormChange({ end_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>
            </div>
            
            {/* Notas */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Notas
              </label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => onFormChange({ notes: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              />
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

                {/* Fecha actual de seguimiento (solo lectura) */}
                {form.next_follow_up_at && (
                  <div className={`p-3 rounded-md ${darkMode ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                      <strong>📅 Próximo seguimiento actual:</strong> {new Date(form.next_follow_up_at).toLocaleDateString()}
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Esta fecha se recalculará automáticamente al guardar
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Errores */}
            {errors.length > 0 && (
              <div className={`p-3 rounded-md ${darkMode ? 'bg-red-900/20 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <ul className="list-disc pl-5 text-sm">
                  {errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </MaterialCard.Content>
        
        <MaterialCard.Actions className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-4">
          <div className="flex justify-between w-full">
            <MaterialButton variant="outlined" color="inherit" onClick={onCancel}>
              Cancelar
            </MaterialButton>
            <MaterialButton 
              variant="contained" 
              onClick={onConfirm} 
              className={`${darkMode ? '!bg-blue-600 hover:!bg-blue-700 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'}`}
            >
              Guardar
            </MaterialButton>
          </div>
        </MaterialCard.Actions>
      </MaterialCard>
    </div>
  );
};