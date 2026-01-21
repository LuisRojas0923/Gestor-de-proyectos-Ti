import React from 'react';
import { FollowUpConfig } from '../hooks/useActivityValidation';
import { Input, Select, Switch, Text } from '../../../atoms';

interface WizardStep2Props {
  startDate: string;
  endDate: string;
  followUpConfig: FollowUpConfig;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFollowUpConfigChange: (config: FollowUpConfig) => void;
}

export const WizardStep2: React.FC<WizardStep2Props> = ({
  startDate,
  endDate,
  followUpConfig,
  onStartDateChange,
  onEndDateChange,
  onFollowUpConfigChange,
}) => {
  const handleFollowUpEnabledChange = (enabled: boolean) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      enabled
    });
  };

  const handleFollowUpTypeChange = (type: FollowUpConfig['type']) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      type
    });
  };

  const handleDaysChange = (days: number) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      days: days || undefined
    });
  };

  const handleIntervalChange = (interval: number) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      interval: interval || undefined
    });
  };

  const handleFollowUpEndDateChange = (endDate: string) => {
    onFollowUpConfigChange({
      ...followUpConfig,
      endDate: endDate || undefined
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Input
            label="Fecha de Inicio"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Fecha de Fin"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      </div>

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
          <div className="space-y-4 pl-4 border-l-2 border-primary-300">
            {/* Tipo de seguimiento */}
            <div>
              <Select
                label="Tipo de Seguimiento"
                value={followUpConfig.type || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFollowUpTypeChange(e.target.value as FollowUpConfig['type'])}
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDaysChange(Number(e.target.value))}
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleIntervalChange(Number(e.target.value))}
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
                      onChange={(e) => handleFollowUpEndDateChange(e.target.value)}
                      helperText="Dejar vacío para seguimiento indefinido"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Resumen informativo */}
            <div className="p-3 rounded-md border bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700">
              <Text variant="body2" weight="semibold" className="mb-1">
                Recordatorio:
              </Text>
              <Text variant="body2" color="secondary">
                {followUpConfig.type?.includes('before')
                  ? `Se enviará una notificación ${followUpConfig.days || 1} día(s) antes del ${followUpConfig.type.includes('start') ? 'inicio' : 'fin'} de la actividad.`
                  : followUpConfig.type?.includes('after')
                    ? `Se enviará un seguimiento cada ${followUpConfig.interval || 1} día(s) desde el ${followUpConfig.type.includes('start') ? 'inicio' : 'fin'} hasta la fecha límite o el cierre.`
                    : 'Selecciona un tipo de seguimiento para ver más detalles.'
                }
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};