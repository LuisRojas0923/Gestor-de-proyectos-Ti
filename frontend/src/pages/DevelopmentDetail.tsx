import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';
import { DevelopmentWithCurrentStatus } from '../types';
import { useActivities } from './MyDevelopments/hooks/useActivities';
import { ActivityEditModal } from './MyDevelopments/components/modals/ActivityEditModal';
import { ActivityDeleteModal } from './MyDevelopments/components/modals/ActivityDeleteModal';
import { ActivityCreateModal } from './MyDevelopments/components/modals/ActivityCreateModal';
import { FollowUpConfig } from './MyDevelopments/components/modals/hooks/useActivityValidation';
import { ActivityCard, DevelopmentEditModal } from '../components/molecules';
import { MaterialButton } from '../components/atoms';

const tabs = [
  { key: 'bitacora', label: 'Bitácora' },
  { key: 'fases', label: 'Fases' },
  { key: 'requerimientos', label: 'Requerimientos' },
];

const DevelopmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext().state;
  const { get, put } = useApi<DevelopmentWithCurrentStatus>();
  const { developmentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bitacora';

  const [development, setDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Modales de actividad
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [developmentEditOpen, setDevelopmentEditOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ status: string; notes?: string; next_follow_up_at?: string; start_date?: string; end_date?: string; follow_up_config?: FollowUpConfig } | null>(null);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [shouldRollback, setShouldRollback] = useState(false);

  // Cargar desarrollo
  useEffect(() => {
    const load = async () => {
      if (!developmentId) return;
      setLoading(true);
      const dev = await get(API_ENDPOINTS.DEVELOPMENT_BY_ID(developmentId));
      setDevelopment(dev as unknown as DevelopmentWithCurrentStatus);
      setLoading(false);
    };
    load();
  }, [developmentId, get]);

  // Actividades
  const { activities, activitiesLoading, loadActivities, confirmDeleteActivity, confirmEditActivity } = useActivities(development);
  useEffect(() => {
    if (development && activeTab === 'bitacora') loadActivities();
  }, [development, activeTab, loadActivities]);

  // Validación del formulario de edición con nuevo sistema de seguimiento
  const validate = useMemo(() => (form: Required<typeof editForm>) => {
    if (!form) return [];
    const errs: string[] = [];
    
    // Validar fechas básicas
    if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
      errs.push('La fecha de inicio no puede ser mayor que la fecha de fin.');
    }
    
    // Validar configuración de seguimiento si está habilitada
    if (form.follow_up_config?.enabled) {
      const config = form.follow_up_config;
      
      if (!config.type) {
        errs.push('Debe seleccionar el tipo de seguimiento');
      }
      
      if (config.type?.includes('before') && !config.days) {
        errs.push('Debe especificar cuántos días antes del evento');
      }
      
      if (config.type?.includes('after') && !config.interval) {
        errs.push('Debe especificar el intervalo de seguimiento');
      }
      
      // Validar que las fechas base existen según el tipo
      if (config.type?.includes('start') && !form.start_date) {
        errs.push('Necesita una fecha de inicio para este tipo de seguimiento');
      }
      
      if (config.type?.includes('end') && !form.end_date) {
        errs.push('Necesita una fecha de fin para este tipo de seguimiento');
      }
    }
    
    return errs;
  }, []);

  const openEdit = (activity: any) => {
    setSelectedActivity(activity);
    const form = {
      status: activity.status || 'pendiente',
      notes: activity.notes || '',
      next_follow_up_at: activity.next_follow_up_at || '',
      start_date: activity.start_date || '',
      end_date: activity.end_date || '',
      follow_up_config: activity.follow_up_config || undefined
    };
    setEditForm(form);
    setEditErrors(validate(form as any));
    setEditOpen(true);
  };

  const onEditChange = (patch: Partial<NonNullable<typeof editForm>>) => {
    if (!editForm) return;
    const newForm = { ...editForm, ...patch } as any;
    setEditForm(newForm);
    setEditErrors(validate(newForm));
  };

  const onEditConfirm = async () => {
    if (!selectedActivity || !editForm) return;
    if (editErrors.length > 0) return;
    
    // Filtrar solo los campos que espera el backend para actualización
    const updateData = {
      status: editForm.status,
      notes: editForm.notes || undefined,
      next_follow_up_at: editForm.next_follow_up_at || undefined,
      start_date: editForm.start_date || undefined,
      end_date: editForm.end_date || undefined,
      // Nota: follow_up_config no se envía al backend en la actualización
      // El backend solo maneja next_follow_up_at calculado
    };
    
    const ok = await confirmEditActivity(selectedActivity.id, updateData);
    if (ok) setEditOpen(false);
  };

  const openDelete = (activity: any) => {
    setSelectedActivity(activity);
    setShouldRollback(false);
    setDeleteOpen(true);
  };

  const onDeleteConfirm = async () => {
    if (!selectedActivity) return;
    await confirmDeleteActivity(selectedActivity.id);
    // Nota: rollback real de etapa puede añadirse aquí si es necesario
    setDeleteOpen(false);
  };

  const completeActivity = async (activity: any) => {
    if (!activity) return;
    
    // Actualizar solo el estado a completada
    const updateData = {
      status: 'completada',
      notes: activity.notes || undefined,
      next_follow_up_at: activity.next_follow_up_at || undefined,
      start_date: activity.start_date || undefined,
      end_date: activity.end_date || undefined,
    };
    
    const ok = await confirmEditActivity(activity.id, updateData);
    if (ok) {
      // La actividad se actualizará automáticamente en la lista
    }
  };

  // Función para actualizar el desarrollo
  const updateDevelopment = async (updatedData: Partial<DevelopmentWithCurrentStatus>): Promise<boolean> => {
    if (!development) return false;

    try {
      // Limpiar datos: convertir strings vacíos a undefined/null
      const cleanedData = Object.entries(updatedData).reduce((acc, [key, value]) => {
        // Convertir strings vacíos a undefined para campos opcionales
        if (value === '' || value === null) {
          acc[key] = undefined;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Debug: Log de los datos que se están enviando
      console.log('🚀 Enviando datos de actualización:', cleanedData);
      console.log('🔍 URL del endpoint:', API_ENDPOINTS.DEVELOPMENT_BY_ID(development.id));
      
      const result = await put(API_ENDPOINTS.DEVELOPMENT_BY_ID(development.id), cleanedData);

      if (result) {
        // Actualizar el estado local del desarrollo
        setDevelopment(prev => prev ? { ...prev, ...cleanedData } : null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al actualizar el desarrollo:', error);
      return false;
    }
  };

  const setTab = (tabKey: string) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tabKey);
      return p;
    }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/developments')} className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} hover:underline`}>
            ← Volver a desarrollos
          </button>
          <h1 className={`text-2xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{development?.name || (loading ? 'Cargando…' : 'Desarrollo')}</h1>
          <p className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'} text-sm`}>{development?.id}</p>
        </div>
        
        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Botón de Remedy */}
          {development?.remedy_link && (
            <MaterialButton
              variant="contained"
              color="primary"
              onClick={() => window.open(development.remedy_link, '_blank', 'noopener,noreferrer')}
              className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700"
              darkMode={darkMode}
            >
              🔗 Ir a Remedy
            </MaterialButton>
          )}
          
          {/* Botón de editar desarrollo */}
          <MaterialButton
            variant="contained"
            color="primary"
            onClick={() => setDevelopmentEditOpen(true)}
            disabled={loading || !development}
            className="w-full sm:w-auto min-h-[44px]"
            darkMode={darkMode}
          >
            ✏️ Editar Desarrollo
          </MaterialButton>
        </div>
      </div>

      {/* Tabs */}
      <div className={`rounded-lg p-1 ${darkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm ${activeTab === t.key ? (darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900') : (darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'} border rounded-xl p-6`}>
        {activeTab === 'bitacora' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => setSearchParams(prev => {
                    const p = new URLSearchParams(prev);
                    p.delete('hideCompleted');
                    return p;
                  }, { replace: true })}
                  className={`px-3 py-1 rounded text-sm ${!searchParams.get('hideCompleted') ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') : (darkMode ? 'bg-neutral-600 text-neutral-300' : 'bg-neutral-200 text-neutral-600')}`}
                >
                  Todas
                </button>
                <button 
                  onClick={() => setSearchParams(prev => {
                    const p = new URLSearchParams(prev);
                    p.set('hideCompleted', 'true');
                    return p;
                  }, { replace: true })}
                  className={`px-3 py-1 rounded text-sm ${searchParams.get('hideCompleted') ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') : (darkMode ? 'bg-neutral-600 text-neutral-300' : 'bg-neutral-200 text-neutral-600')}`}
                >
                  Pendientes
                </button>
              </div>
              <button onClick={() => setCreateOpen(true)} className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-3 py-2 rounded`}>Nueva actividad</button>
            </div>
            {activitiesLoading ? (
              <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Cargando actividades…</p>
            ) : activities.length === 0 ? (
              <p className={`${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>No hay actividades.</p>
            ) : (
              <div className="space-y-6">
                {activities
                  .filter(a => searchParams.get('hideCompleted') !== 'true' || a.status !== 'completada')
                  .map((a) => (
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      darkMode={darkMode}
                      onComplete={completeActivity}
                      onEdit={openEdit}
                      onDelete={openDelete}
                      showCompleteButton={a.status !== 'completada'}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'fases' && (
          <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Contenido de Fases (pendiente de integrar).</p>
        )}

        {activeTab === 'requerimientos' && (
          <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Contenido de Requerimientos (pendiente de integrar).</p>
        )}
      </div>

      {/* Modales */}
      <ActivityEditModal
        isOpen={editOpen}
        activity={selectedActivity}
        form={editForm}
        errors={editErrors}
        darkMode={darkMode}
        onFormChange={onEditChange}
        onConfirm={onEditConfirm}
        onCancel={() => setEditOpen(false)}
      />
      <ActivityDeleteModal
        isOpen={deleteOpen}
        activity={selectedActivity}
        shouldRollbackStage={shouldRollback}
        darkMode={darkMode}
        onRollbackChange={setShouldRollback}
        onConfirm={onDeleteConfirm}
        onCancel={() => setDeleteOpen(false)}
      />
      <ActivityCreateModal
        isOpen={createOpen}
        developmentId={developmentId as string}
        defaultStageId={development?.current_stage_id ?? null}
        darkMode={darkMode}
        onClose={() => setCreateOpen(false)}
        onCreated={loadActivities}
      />

      {/* Modal de edición de desarrollo */}
      {development && (
        <DevelopmentEditModal
          isOpen={developmentEditOpen}
          development={development}
          darkMode={darkMode}
          onClose={() => setDevelopmentEditOpen(false)}
          onSave={updateDevelopment}
        />
      )}
    </div>
  );
};

export default DevelopmentDetail;