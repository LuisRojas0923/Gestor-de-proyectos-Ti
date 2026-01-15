import React, { useEffect } from 'react';
import { GitBranch, Calendar, ShieldCheck, ListChecks, Search, SquarePen, ExternalLink, Trash2 } from 'lucide-react';
import { DevelopmentTimelineCompact } from '../../../../../components/molecules';
import { HybridGanttChart } from '../../../../../components/development/HybridGanttChart';
import QualityControlsTab from '../../../../../components/development/QualityControlsTab';
import RequirementsTab from '../../../../../components/development/RequirementsTab';
import { ActivityForm } from '../../../../../components/molecules/ActivityForm';
import { MaterialCard, MaterialButton } from '../../../../../components/atoms';
import { DevelopmentWithCurrentStatus } from '../../../../../types';
import { UseActivitiesReturn, UseViewsReturn } from '../../../hooks';
import { development, phases } from '../../../../../utils/logger';
import { useNotifications } from '../../../../../components/notifications/NotificationsContext';

interface PhasesViewProps {
  selectedDevelopment: DevelopmentWithCurrentStatus | null;
  activities: UseActivitiesReturn;
  views: UseViewsReturn;
  darkMode: boolean;
  onEdit: (dev: DevelopmentWithCurrentStatus) => void;
  onDelete: (dev: DevelopmentWithCurrentStatus) => void;
  onBack: () => void;
  onDevelopmentRefresh: () => void;
}

export const PhasesView: React.FC<PhasesViewProps> = ({
  selectedDevelopment,
  activities,
  views,
  darkMode,
  onEdit,
  onDelete,
  onBack,
  onDevelopmentRefresh,
}) => {
  const { activePhaseTab, setActivePhaseTab } = views;
  const { addNotification } = useNotifications();
  const {
    showActivityForm,
    setShowActivityForm,
    activities: activityList,
    activitiesLoading,
    loadActivities,
    handleActivitySuccess,
  } = activities;

  // Cargar actividades cuando se selecciona un desarrollo
  useEffect(() => {
    if (selectedDevelopment && activePhaseTab === 'activities') {
      loadActivities(selectedDevelopment);
    }
  }, [selectedDevelopment, activePhaseTab, loadActivities]);

  if (!selectedDevelopment) {
    return (
      <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
        <div className="text-center">
          <GitBranch size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Selecciona un Desarrollo
          </h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Haz clic en el botón de ver detalles (👁️) de cualquier desarrollo para acceder al Centro de Control completo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Centro de Control */}
      <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={`font-semibold ${darkMode ? 'text-primary-400' : 'text-primary-600'}`}>{selectedDevelopment.id}</span>
            <h2 className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{selectedDevelopment.name}</h2>
          </div>
          <div className="flex items-center space-x-3">
            <MaterialButton
              onClick={() => onEdit(selectedDevelopment)}
              variant="contained"
              size="medium"
              className={`${darkMode ? '!bg-neutral-700 hover:!bg-neutral-600 text-white' : '!bg-neutral-200 hover:!bg-neutral-300 !text-neutral-900'} flex items-center space-x-2`}
            >
              <SquarePen size={18} />
              <span>Editar</span>
            </MaterialButton>
            {selectedDevelopment.portal_link && (
              <MaterialButton
                onClick={() => window.open(selectedDevelopment.portal_link, '_blank')}
                variant="contained"
                size="medium"
                className={`${darkMode ? '!bg-blue-700 hover:!bg-blue-600 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'} flex items-center space-x-2`}
              >
                <ExternalLink size={18} />
                <span>Portal</span>
              </MaterialButton>
            )}
            <MaterialButton
              onClick={() => onDelete(selectedDevelopment)}
              variant="contained"
              size="medium"
              className={`${darkMode ? '!bg-red-700 hover:!bg-red-600 text-white' : '!bg-red-600 hover:!bg-red-700 text-white'} flex items-center space-x-2`}
            >
              <Trash2 size={18} />
              <span>Eliminar</span>
            </MaterialButton>
            <MaterialButton
              onClick={onBack}
              variant="contained"
              size="medium"
              className={`${darkMode ? '!bg-neutral-700 hover:!bg-neutral-600 text-white' : '!bg-neutral-200 hover:!bg-neutral-300 !text-neutral-900'}`}
            >
              ← Volver a Lista
            </MaterialButton>
          </div>
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-b py-4 border-neutral-200 dark:border-neutral-700">
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400">Estado</label>
            <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{selectedDevelopment.general_status}</p>
          </div>
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400">Progreso</label>
            <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
              {typeof selectedDevelopment.current_stage === 'object' ? selectedDevelopment.current_stage?.stage_name || 'N/A' : selectedDevelopment.current_stage}
            </p>
          </div>
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400">Proveedor</label>
            <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{selectedDevelopment.provider || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400">Responsable</label>
            <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{selectedDevelopment.responsible || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
        <div className="flex flex-wrap items-center justify-between mb-6">
          <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-neutral-700 rounded-lg p-1">
            <button
              onClick={() => setActivePhaseTab('phases')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activePhaseTab === 'phases'
                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
            >
              <GitBranch size={16} className="inline mr-2" />
              Fases
            </button>
            <button
              onClick={() => setActivePhaseTab('gantt')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activePhaseTab === 'gantt'
                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
            >
              <Calendar size={16} className="inline mr-2" />
              Gantt
            </button>
            <button
              onClick={() => setActivePhaseTab('controls')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activePhaseTab === 'controls'
                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
            >
              <ShieldCheck size={16} className="inline mr-2" />
              Controles
            </button>
            <button
              onClick={() => setActivePhaseTab('activities')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activePhaseTab === 'activities'
                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
            >
              <ListChecks size={16} className="inline mr-2" />
              Bitácora
            </button>
            <button
              onClick={() => setActivePhaseTab('requirements')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activePhaseTab === 'requirements'
                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
            >
              <Search size={16} className="inline mr-2" />
              Requerimientos
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activePhaseTab === 'phases' && (
          <DevelopmentTimelineCompact
            developmentId={selectedDevelopment.id}
            currentStage={(() => {
              try {
                // Usar current_stage_id directamente si está disponible
                if (selectedDevelopment.current_stage_id && typeof selectedDevelopment.current_stage_id === 'number') {
                  phases.debug('Usando current_stage_id directamente', selectedDevelopment.current_stage_id);
                  return Math.max(1, Math.min(11, selectedDevelopment.current_stage_id));
                }

                // Fallback: intentar parsear desde el nombre de la etapa
                let stageValue = 1; // Valor por defecto

                if (typeof selectedDevelopment.current_stage === 'object' && selectedDevelopment.current_stage?.stage_name) {
                  const stageName = selectedDevelopment.current_stage.stage_name;
                  const parsed = parseInt(stageName.split('.')[0]);
                  stageValue = isNaN(parsed) ? 1 : parsed;
                  phases.debug('Parseando desde stage_name', { stageName, parsed: stageValue });
                } else if (selectedDevelopment.current_stage) {
                  const stageStr = String(selectedDevelopment.current_stage);
                  const parsed = parseInt(stageStr.split('.')[0]);
                  stageValue = isNaN(parsed) ? 1 : parsed;
                  phases.debug('Parseando desde current_stage string', { stageStr, parsed: stageValue });
                }

                // Asegurar que el valor esté en un rango válido (1-11)
                return Math.max(1, Math.min(11, stageValue));
              } catch (error) {
                phases.error('Error parsing current_stage', { error, currentStage: selectedDevelopment.current_stage });
                return 1; // Valor por defecto en caso de error
              }
            })()}
            darkMode={darkMode}
            isCancelled={selectedDevelopment.general_status === 'Cancelado'}
            onCancel={async () => {
              try {
                development.info('Cancelando desarrollo', selectedDevelopment.id);
                addNotification('success', 'Desarrollo cancelado exitosamente');
                onDevelopmentRefresh();
              } catch (error) {
                development.error('Error al cancelar desarrollo', error);
                addNotification('error', 'Error al cancelar el desarrollo');
              }
            }}
          />
        )}

        {activePhaseTab === 'gantt' && (
          <HybridGanttChart
            activities={activityList}
            stages={[]}
            currentStageId={selectedDevelopment?.current_stage_id}
            darkMode={darkMode}
          />
        )}

        {activePhaseTab === 'controls' && (
          <QualityControlsTab
            developmentId={selectedDevelopment.id}
            developmentName={selectedDevelopment.name}
            currentStageName={typeof selectedDevelopment.current_stage === 'object'
              ? selectedDevelopment.current_stage?.stage_name || 'Sin etapa'
              : selectedDevelopment.current_stage || 'Sin etapa'}
            darkMode={darkMode}
          />
        )}

        {activePhaseTab === 'activities' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className={`text-lg font-semibold flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                <ListChecks size={18} className="mr-2" />
                Bitácora Inteligente
              </h4>
              <MaterialButton
                onClick={() => setShowActivityForm(true)}
                variant="contained"
                size="small"
                className={`${darkMode ? '!bg-blue-600 hover:!bg-blue-700 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'}`}
              >
                <ListChecks size={16} className="inline mr-2" />
                Nueva Actividad
              </MaterialButton>
            </div>

            {/* Formulario de Nueva Actividad */}
            {showActivityForm && (
              <div className="mb-6">
                <ActivityForm
                  developmentId={selectedDevelopment.id}
                  initialStageId={(() => {
                    if (selectedDevelopment.current_stage_id && typeof selectedDevelopment.current_stage_id === 'number') {
                      return selectedDevelopment.current_stage_id;
                    }
                    if (typeof selectedDevelopment.current_stage === 'object' && selectedDevelopment.current_stage?.stage_name) {
                      const parsed = parseInt(String(selectedDevelopment.current_stage.stage_name).split('.')[0]);
                      return isNaN(parsed) ? 0 : parsed;
                    }
                    if (selectedDevelopment.current_stage) {
                      const parsed = parseInt(String(selectedDevelopment.current_stage).split('.')[0]);
                      return isNaN(parsed) ? 0 : parsed;
                    }
                    return 0;
                  })()}
                  onSuccess={(activity) => handleActivitySuccess(activity, selectedDevelopment, () => { })}
                  onCancel={() => setShowActivityForm(false)}
                />
              </div>
            )}

            {/* Lista de Actividades - El resto del contenido será renderizado por el componente padre */}
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="text-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Cargando actividades...</p>
                </div>
              ) : activityList.length > 0 ? (
                activityList.map(activity => (
                  <div key={activity.id}>{/* Render individual activity */}</div>
                ))
              ) : (
                <div className="text-center p-8 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
                  <ListChecks size={48} className={`mx-auto mb-4 ${darkMode ? 'text-neutral-500' : 'text-neutral-400'}`} />
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    No hay actividades registradas
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Crea tu primera actividad usando el botón "Nueva Actividad"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activePhaseTab === 'requirements' && (
          <RequirementsTab
            developmentId={selectedDevelopment.id}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
};
