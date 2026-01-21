import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Save
} from 'lucide-react';
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { DevelopmentWithCurrentStatus } from '../../types';
import { Button, Select, Input, Title, Text, MaterialCard } from '../atoms';

interface DevelopmentStageProgressProps {
  development: DevelopmentWithCurrentStatus;
  onUpdate?: (updatedDevelopment: DevelopmentWithCurrentStatus) => void;
}

const DevelopmentStageProgress: React.FC<DevelopmentStageProgressProps> = ({
  development,
  onUpdate
}) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { put } = useApi();

  const [selectedStageId, setSelectedStageId] = useState<number | null>(
    development.current_stage_id || null
  );
  const [progressPercentage, setProgressPercentage] = useState<number>(
    development.stage_progress_percentage || 0
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStageChange = async (newStageId: number) => {
    try {
      setIsUpdating(true);
      setError(null);

      const response = await put(`/developments/${development.id}/stage`, {
        stage_id: newStageId
      });

      if (response) {
        setSelectedStageId(newStageId);
        setProgressPercentage(0); // Reset progress when changing stage

        // Notify parent component
        if (onUpdate) {
          onUpdate({
            ...development,
            current_stage_id: newStageId,
            stage_progress_percentage: 0
          });
        }
      }
    } catch (err) {
      console.error('Error updating stage:', err);
      setError('Error al actualizar la etapa del desarrollo');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProgressUpdate = async () => {
    try {
      setIsUpdating(true);
      setError(null);

      const response = await put(`/developments/${development.id}/progress`, {
        progress_percentage: progressPercentage
      });

      if (response) {
        // Notify parent component
        if (onUpdate) {
          onUpdate({
            ...development,
            stage_progress_percentage: progressPercentage
          });
        }
      }
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Error al actualizar el progreso');
    } finally {
      setIsUpdating(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressIcon = (percentage: number) => {
    if (percentage >= 100) return CheckCircle;
    if (percentage >= 50) return Clock;
    return AlertTriangle;
  };

  const barStyle = { width: `${progressPercentage}%` };

  return (
    <MaterialCard elevation={1}>
      <MaterialCard.Content>
        <div className="flex items-center justify-between mb-6">
          <Title variant="h5">
            Progreso de Etapa
          </Title>
          <div className="flex items-center space-x-2">
            {getProgressIcon(progressPercentage)({
              size: 20,
              className: progressPercentage >= 100 ? 'text-green-500' :
                progressPercentage >= 50 ? 'text-yellow-500' : 'text-red-500'
            })}
            <Text variant="body2" weight="medium" color="text-primary">
              {progressPercentage}%
            </Text>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} />
              <Text variant="body2">{error}</Text>
            </div>
          </div>
        )}

        {/* Información del Desarrollo */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
          <Title variant="h6" className="mb-2">
            {development.name}
          </Title>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <Text variant="body2" color="text-secondary" as="span">Fase Actual:</Text>
              <Text variant="body2" color="text-primary" weight="medium" className="ml-2" as="span">
                {development.current_phase?.phase_name || 'No definida'}
              </Text>
            </div>
            <div>
              <Text variant="body2" color="text-secondary" as="span">Etapa Actual:</Text>
              <Text variant="body2" color="text-primary" weight="medium" className="ml-2" as="span">
                {development.current_stage?.stage_name || 'No definida'}
              </Text>
            </div>
          </div>
        </div>

        {/* Selector de Etapa */}
        <div className="mb-6">
          <Text variant="subtitle2" weight="medium" color="text-primary" className="mb-2" as="label">
            Cambiar Etapa
          </Text>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              onClick={() => selectedStageId && handleStageChange(selectedStageId - 1)}
              disabled={!selectedStageId || selectedStageId <= 1 || isUpdating}
            />

            <Select
              value={selectedStageId?.toString() || ''}
              onChange={(e) => setSelectedStageId(Number(e.target.value))}
              disabled={isUpdating}
              className="flex-1"
              options={[
                { value: '', label: 'Seleccionar etapa...' },
                ...Array.from({ length: 11 }, (_, i) => ({
                  value: i.toString(),
                  label: `Etapa ${i} - ${getStageName(i)}`
                }))
              ]}
            />

            <Button
              variant="ghost"
              size="sm"
              icon={ChevronRight}
              onClick={() => selectedStageId && handleStageChange(selectedStageId + 1)}
              disabled={!selectedStageId || selectedStageId >= 10 || isUpdating}
            />
          </div>
        </div>

        {/* Control de Progreso */}
        <div className="mb-6">
          <Text variant="subtitle2" weight="medium" color="text-primary" className="mb-2" as="label">
            Progreso de la Etapa Actual
          </Text>

          <div className="space-y-4">
            {/* Barra de progreso visual */}
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden">
              <Text
                as="div"
                className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(progressPercentage)}`}
                style={barStyle}
              >
                &nbsp;
              </Text>
            </div>

            {/* Control deslizante */}
            <div className="flex items-center space-x-4">
              <Input
                type="range"
                value={progressPercentage.toString()}
                onChange={(e) => setProgressPercentage(Number(e.target.value))}
                disabled={isUpdating}
                className="flex-1"
              />
              <Text variant="body2" weight="medium" color="text-primary" className="w-12">
                {progressPercentage}%
              </Text>
            </div>

            {/* Botones de progreso rápido */}
            <div className="flex space-x-2">
              {[0, 25, 50, 75, 100].map((value) => (
                <Button
                  key={value}
                  variant={progressPercentage === value ? 'primary' : 'outline'}
                  size="xs"
                  onClick={() => setProgressPercentage(value)}
                  disabled={isUpdating}
                >
                  {value}%
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Botón de Guardar */}
        <div className="flex justify-end space-x-3">
          <Button
            onClick={handleProgressUpdate}
            loading={isUpdating}
            icon={Save}
          >
            Guardar Progreso
          </Button>
        </div>

        {/* Información de la Etapa Actual */}
        {development.current_stage && (
          <div className={`mt-6 p-4 ${darkMode ? 'bg-neutral-700' : 'bg-blue-50'} rounded-lg`}>
            <Title variant="h6" className="mb-2">
              Información de la Etapa Actual
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <Text variant="body2" color="text-secondary" as="span">Código:</Text>
                <Text variant="body2" color="text-primary" weight="medium" className="ml-2" as="span">
                  {development.current_stage.stage_code}
                </Text>
              </div>
              <div>
                <Text variant="body2" color="text-secondary" as="span">Hito:</Text>
                <Text variant="body2" color="text-primary" weight="medium" className="ml-2" as="span">
                  {development.current_stage.is_milestone ? 'Sí' : 'No'}
                </Text>
              </div>
              {development.current_stage.estimated_days && (
                <div>
                  <Text variant="body2" color="text-secondary" as="span">Días Estimados:</Text>
                  <Text variant="body2" color="text-primary" weight="medium" className="ml-2" as="span">
                    {development.current_stage.estimated_days}
                  </Text>
                </div>
              )}
              {development.current_stage.responsible_party && (
                <div>
                  <Text variant="body2" color="text-secondary" as="span">Responsable:</Text>
                  <Text variant="body2" color="text-primary" weight="medium" className="ml-2" as="span">
                    {development.current_stage.responsible_party}
                  </Text>
                </div>
              )}
            </div>
            {development.current_stage.stage_description && (
              <div className="mt-2">
                <Text variant="body2" color="text-secondary">Descripción:</Text>
                <Text variant="body2" color="text-primary" className="mt-1">
                  {development.current_stage.stage_description}
                </Text>
              </div>
            )}
          </div>
        )}
      </MaterialCard.Content>
    </MaterialCard>
  );
};

// Función auxiliar para obtener el nombre de la etapa
const getStageName = (stageCode: number): string => {
  const stageNames: { [key: number]: string } = {
    0: 'Cancelado',
    1: 'Definición',
    2: 'Análisis',
    3: 'Propuesta',
    4: 'Aprobación',
    5: 'Desarrollo',
    6: 'Despliegue (Pruebas)',
    7: 'Plan de Pruebas',
    8: 'Ejecución Pruebas',
    9: 'Aprobación (Pase)',
    10: 'Desplegado'
  };
  return stageNames[stageCode] || `Etapa ${stageCode}`;
};

export default DevelopmentStageProgress;
