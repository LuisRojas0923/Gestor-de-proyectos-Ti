import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';
import QualityControlsTab from '../components/development/QualityControlsTab';
import { DevelopmentWithCurrentStatus, Activity } from '../types';
import { useActivities } from './MyDevelopments/hooks/useActivities';
import { ActivityCreateModal, ActivityEditModal, ActivityDeleteModal } from '../components/organisms/activities';
import { FollowUpConfig } from '../components/organisms/activities/hooks/useActivityValidation';
import { DevelopmentEditModal } from '../components/molecules';
import { Button } from '../components/atoms';

// Sub-componentes
import GeneralInfoTab from './DevelopmentDetail/GeneralInfoTab';
import ActivityLogTab from './DevelopmentDetail/ActivityLogTab';

const tabs = [
  { key: 'detalle', label: 'Detalle' },
  { key: 'bitacora', label: 'Bitácora' },
  { key: 'fases', label: 'Fases' },
  { key: 'calidad', label: 'Calidad' },
  { key: 'requerimientos', label: 'Requerimientos' },
];

const DevelopmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext().state;
  const { get, put } = useApi<DevelopmentWithCurrentStatus>();
  const { developmentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'detalle';

  const [development, setDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState<Activity | null>(null);

  // Modales de actividad
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [developmentEditOpen, setDevelopmentEditOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
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
    if (development && (activeTab === 'bitacora' || activeTab === 'detalle')) {
      loadActivities();
    }
  }, [development, activeTab, loadActivities]);

  useEffect(() => {
    if (activities && activities.length > 0) {
      const sortedActivities = [...activities].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLastActivity(sortedActivities[0]);
    }
  }, [activities]);

  // Validación
  const validate = useMemo(() => (form: Required<typeof editForm>) => {
    if (!form) return [];
    const errs: string[] = [];
    if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
      errs.push('La fecha de inicio no puede ser mayor que la fecha de fin.');
    }
    return errs;
  }, []);

  const openEdit = (activity: Activity) => {
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
    setEditErrors(validate(form as Required<typeof editForm>));
    setEditOpen(true);
  };

  const onEditChange = (patch: Partial<NonNullable<typeof editForm>>) => {
    if (!editForm) return;
    const newForm = { ...editForm, ...patch };
    setEditForm(newForm);
    setEditErrors(validate(newForm as Required<typeof editForm>));
  };

  const onEditConfirm = async () => {
    if (!selectedActivity || !editForm) return;
    if (editErrors.length > 0) return;
    const ok = await confirmEditActivity(selectedActivity.id, {
      status: editForm.status,
      notes: editForm.notes || undefined,
      next_follow_up_at: editForm.next_follow_up_at || undefined,
      start_date: editForm.start_date || undefined,
      end_date: editForm.end_date || undefined
    });
    if (ok) setEditOpen(false);
  };

  const openDelete = (activity: Activity) => {
    setSelectedActivity(activity);
    setShouldRollback(false);
    setDeleteOpen(true);
  };

  const onDeleteConfirm = async () => {
    if (!selectedActivity) return;
    await confirmDeleteActivity(selectedActivity.id);
    setDeleteOpen(false);
  };

  const completeActivity = async (activity: Activity) => {
    if (!activity) return;
    const ok = await confirmEditActivity(activity.id, { status: 'completada' });
    if (ok) { /* Auto update via hook */ }
  };

  const updateDevelopment = async (updatedData: Partial<DevelopmentWithCurrentStatus>): Promise<boolean> => {
    if (!development) return false;
    try {
      const result = await put(API_ENDPOINTS.DEVELOPMENT_BY_ID(development.id), updatedData);
      if (result) {
        setDevelopment(prev => prev ? { ...prev, ...updatedData } : null);
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/developments')}
            className="p-0 h-auto font-medium"
          >
            ← Volver a desarrollos
          </Button>
          <h1 className={`text-2xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{development?.name || (loading ? 'Cargando...' : 'Desarrollo')}</h1>
          <p className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'} text-sm`}>{development?.id}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {development?.portal_link && (
            <Button
              variant="primary"
              onClick={() => window.open(development.portal_link, '_blank', 'noopener,noreferrer')}
              className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 border-none"
            >
              🔗 Ir al Portal
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => setDevelopmentEditOpen(true)}
            disabled={loading || !development}
            className="w-full sm:w-auto min-h-[44px]"
          >
            ✏️ Editar Desarrollo
          </Button>
        </div>
      </div>

      <div className={`rounded-lg p-1 ${darkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map(t => (
            <Button
              key={t.key}
              variant={activeTab === t.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm whitespace-nowrap ${activeTab === t.key ? (darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900 border-none shadow-sm') : (darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'} border rounded-xl p-6`}>
        {activeTab === 'detalle' && (
          <GeneralInfoTab
            development={development}
            darkMode={darkMode}
            activitiesLoading={activitiesLoading}
            lastActivity={lastActivity}
          />
        )}

        {activeTab === 'bitacora' && (
          <ActivityLogTab
            activities={activities}
            loading={activitiesLoading}
            darkMode={darkMode}
            hideCompleted={searchParams.get('hideCompleted') === 'true'}
            onHideCompletedChange={(hide) => {
              setSearchParams(prev => {
                const p = new URLSearchParams(prev);
                if (hide) p.set('hideCompleted', 'true');
                else p.delete('hideCompleted');
                return p;
              }, { replace: true });
            }}
            onCreateOpen={() => setCreateOpen(true)}
            onComplete={completeActivity}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        )}

        {activeTab === 'calidad' && (
          <QualityControlsTab
            developmentId={developmentId as string}
            currentStageName={development?.current_stage?.stage_name || 'Sin etapa'}
            darkMode={darkMode}
          />
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