import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, Switch, Title, Text } from '../../atoms';
import { FollowUpConfig } from './hooks/useActivityValidation';
import { Modal } from '../../molecules';

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

  if (!activity || !form) return null;

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
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Editar Actividad"
      size="lg"
      showCloseButton={true}
    >
      <div className="max-h-[70vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Estado */}
            <div>
              <Select
                label="Estado"
                value={form.status}
                onChange={(e) => onFormChange({ status: e.target.value })}
                options={[
                  { value: 'pendiente', label: 'Pendiente' },
                  { value: 'en_curso', label: 'En Curso' },
                  { value: 'completada', label: 'Completada' },
                  { value: 'cancelada', label: 'Cancelada' }
                ]}
              />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Fecha de inicio"
                  type="date"
                  value={form.start_date || ''}
                  onChange={(e) => onFormChange({ start_date: e.target.value })}
                />
              </div>
              <div>
                <Input
                  label="Fecha de fin"
                  type="date"
                  value={form.end_date || ''}
                  onChange={(e) => onFormChange({ end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <Textarea
                label="Notas"
                value={form.notes || ''}
                onChange={(e) => onFormChange({ notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Configuración de seguimiento */}
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 dark:bg-neutral-800 dark:border-neutral-700">
              <Title variant="h6" weight="semibold" className="mb-3">
                📅 Configuración de Seguimiento
              </Title>

              <div className="space-y-4">
                {/* Habilitar seguimiento */}
                <div>
                  <div className="flex items-center justify-between">
                    <Text variant="body2" weight="medium" color="secondary">
                      ¿Configurar seguimiento automático?
                    </Text>
                    <Switch
                      checked={followUpConfig.enabled}
                      onChange={handleFollowUpEnabledChange}
                    />
                  </div>
                </div>

                {/* Configuración de seguimiento */}
                {followUpConfig.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-blue-300">
                    {/* Tipo de seguimiento */}
                    <div>
                      <Select
                        label="Tipo de Seguimiento"
                        value={followUpConfig.type || ''}
                        onChange={(e) => handleFollowUpTypeChange(e.target.value as FollowUpConfig['type'])}
                        options={[
                          { value: '', label: 'Selecciona el tipo...' },
                          { value: 'before_start', label: 'Antes del inicio' },
                          { value: 'after_start', label: 'Después del inicio (recurrente)' },
                          { value: 'before_end', label: 'Antes del fin' },
                          { value: 'after_end', label: 'Después del fin (recurrente)' }
                        ]}
                      />
                    </div>

                    {/* Configuración específica según el tipo */}
                    {followUpConfig.type && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Para seguimiento "antes de" */}
                        {followUpConfig.type.includes('before') && (
                          <div>
                            <Select
                              label="Cuántos días antes"
                              value={followUpConfig.days?.toString() || ''}
                              onChange={(e) => handleDaysChange(Number(e.target.value))}
                              options={[
                                { value: '', label: 'Selecciona...' },
                                { value: '1', label: '1 día antes' },
                                { value: '2', label: '2 días antes' },
                                { value: '3', label: '3 días antes' },
                                { value: '7', label: '1 semana antes' },
                                { value: '14', label: '2 semanas antes' }
                              ]}
                            />
                          </div>
                        )}

                        {/* Para seguimiento "después de" */}
                        {followUpConfig.type.includes('after') && (
                          <div>
                            <Select
                              label="Frecuencia"
                              value={followUpConfig.interval?.toString() || ''}
                              onChange={(e) => handleIntervalChange(Number(e.target.value))}
                              options={[
                                { value: '', label: 'Selecciona...' },
                                { value: '1', label: 'Diariamente' },
                                { value: '2', label: 'Cada 2 días' },
                                { value: '3', label: 'Cada 3 días' },
                                { value: '7', label: 'Semanalmente' },
                                { value: '14', label: 'Cada 2 semanas' }
                              ]}
                            />
                          </div>
                        )}

                        {/* Fecha límite para seguimiento recurrente */}
                        {followUpConfig.type.includes('after') && (
                          <div>
                            <Input
                              label="Fecha límite (opcional)"
                              type="date"
                              value={followUpConfig.endDate || ''}
                              onChange={(e) => handleEndDateChange(e.target.value)}
                              helperText="Dejar vacío para seguimiento indefinido"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Descripción del seguimiento */}
                    {followUpConfig.enabled && followUpConfig.type && (
                      <div className="p-3 rounded-md bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                        <Text variant="body2" color="success">
                          <Text as="span" weight="bold">📋 Resumen:</Text> {getFollowUpDescription()}
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                {/* Fecha actual de seguimiento (solo lectura) */}
                {form.next_follow_up_at && (
                  <div className="p-3 rounded-md bg-neutral-100 dark:bg-neutral-700">
                    <Text variant="body2" color="secondary">
                      <Text as="span" weight="bold">📅 Próximo seguimiento actual:</Text> {new Date(form.next_follow_up_at).toLocaleDateString()}
                    </Text>
                    <Text variant="caption" color="secondary" className="mt-1">
                      Esta fecha se recalculará automáticamente al guardar
                    </Text>
                  </div>
                )}
              </div>
            </div>

            {/* Errores */}
            {errors.length > 0 && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                <div className="space-y-1">
                  {errors.map((err, idx) => (
                    <Text key={idx} variant="caption" color="error" className="block">• {err}</Text>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-4">
          <div className="flex justify-between w-full">
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
            >
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};