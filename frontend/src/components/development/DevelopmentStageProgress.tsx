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

  return (
    <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Progreso de Etapa
        </h3>
        <div className="flex items-center space-x-2">
          {getProgressIcon(progressPercentage)({ 
            size: 20, 
            className: progressPercentage >= 100 ? 'text-green-500' : 
                      progressPercentage >= 50 ? 'text-yellow-500' : 'text-red-500' 
          })}
          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            {progressPercentage}%
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Información del Desarrollo */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
        <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          {development.name}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Fase Actual:</span>
            <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {development.current_phase?.phase_name || 'No definida'}
            </span>
          </div>
          <div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Etapa Actual:</span>
            <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {development.current_stage?.stage_name || 'No definida'}
            </span>
          </div>
        </div>
      </div>

      {/* Selector de Etapa */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Cambiar Etapa
        </label>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => selectedStageId && handleStageChange(selectedStageId - 1)}
            disabled={!selectedStageId || selectedStageId <= 1 || isUpdating}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          
          <select
            value={selectedStageId || ''}
            onChange={(e) => setSelectedStageId(Number(e.target.value))}
            disabled={isUpdating}
            className={`flex-1 p-2 rounded-lg border ${
              darkMode 
                ? 'bg-neutral-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-neutral-900'
            } disabled:opacity-50`}
          >
            <option value="">Seleccionar etapa...</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i}>
                Etapa {i} - {getStageName(i)}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => selectedStageId && handleStageChange(selectedStageId + 1)}
            disabled={!selectedStageId || selectedStageId >= 10 || isUpdating}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Control de Progreso */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Progreso de la Etapa Actual
        </label>
        
        <div className="space-y-4">
          {/* Barra de progreso visual */}
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(progressPercentage)}`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          {/* Control deslizante */}
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercentage}
              onChange={(e) => setProgressPercentage(Number(e.target.value))}
              disabled={isUpdating}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className={`text-sm font-medium w-12 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {progressPercentage}%
            </span>
          </div>
          
          {/* Botones de progreso rápido */}
          <div className="flex space-x-2">
            {[0, 25, 50, 75, 100].map((value) => (
              <button
                key={value}
                onClick={() => setProgressPercentage(value)}
                disabled={isUpdating}
                className={`px-3 py-1 text-xs rounded-lg border ${
                  progressPercentage === value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-neutral-700'
                } disabled:opacity-50`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Botón de Guardar */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleProgressUpdate}
          disabled={isUpdating}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          <span>{isUpdating ? 'Guardando...' : 'Guardar Progreso'}</span>
        </button>
      </div>

      {/* Información de la Etapa Actual */}
      {development.current_stage && (
        <div className={`mt-6 p-4 ${darkMode ? 'bg-neutral-700' : 'bg-blue-50'} rounded-lg`}>
          <h5 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Información de la Etapa Actual
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Código:</span>
              <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {development.current_stage.stage_code}
              </span>
            </div>
            <div>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Hito:</span>
              <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {development.current_stage.is_milestone ? 'Sí' : 'No'}
              </span>
            </div>
            {development.current_stage.estimated_days && (
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Días Estimados:</span>
                <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {development.current_stage.estimated_days}
                </span>
              </div>
            )}
            {development.current_stage.responsible_party && (
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Responsable:</span>
                <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {development.current_stage.responsible_party}
                </span>
              </div>
            )}
          </div>
          {development.current_stage.stage_description && (
            <div className="mt-2">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Descripción:</span>
              <p className={`mt-1 text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {development.current_stage.stage_description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
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
