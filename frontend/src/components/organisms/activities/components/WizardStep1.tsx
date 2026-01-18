import React from 'react';
import { FollowUpConfig } from '../hooks/useActivityValidation';
import { Input, Select, Switch } from '../../../atoms';

interface WizardStep1Props {
  stageId: number;
  activityType: string;
  actorType: string;
  status: string;
  startDate: string;
  stages: Array<{ id: number; stage_name: string; stage_code: string }>;
  onStageChange: (stageId: number) => void;
  onActivityTypeChange: (type: string) => void;
  onActorTypeChange: (actor: string) => void;
  onStatusChange: (status: string) => void;
  onStartDateChange: (date: string) => void;
  darkMode: boolean;
}

export const WizardStep1: React.FC<WizardStep1Props> = ({
  stageId,
  activityType,
  actorType,
  status,
  startDate,
  stages,
  onStageChange,
  onActivityTypeChange,
  onActorTypeChange,
  onStatusChange,
  onStartDateChange,
  darkMode,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Select
          label="Etapa *"
          value={stageId.toString()}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStageChange(Number(e.target.value))}
          options={stages.length === 0
            ? [{ value: stageId.toString(), label: stageId.toString() }]
            : stages.map(s => ({ value: s.id.toString(), label: `${s.stage_code} - ${s.stage_name}` }))
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Select
            label="Tipo de Actividad *"
            value={activityType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onActivityTypeChange(e.target.value)}
            options={[
              { value: 'nueva_actividad', label: 'Nueva actividad' },
              { value: 'seguimiento', label: 'Seguimiento' },
              { value: 'revision', label: 'Revisión' },
              { value: 'ajuste', label: 'Ajuste' }
            ]}
          />
        </div>

        <div>
          <Select
            label="Actor *"
            value={actorType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onActorTypeChange(e.target.value)}
            options={[
              { value: 'equipo_interno', label: 'Equipo Interno' },
              { value: 'proveedor', label: 'Proveedor' },
              { value: 'usuario', label: 'Usuario' },
              { value: 'sistema', label: 'Sistema' }
            ]}
          />
        </div>

        <div>
          <Select
            label="Estado *"
            value={status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStatusChange(e.target.value)}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'en_curso', label: 'En curso' },
              { value: 'completada', label: 'Completada' },
              { value: 'cancelada', label: 'Cancelada' }
            ]}
          />
        </div>
      </div>

      <div>
        <Input
          label="Fecha de Inicio *"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
};
