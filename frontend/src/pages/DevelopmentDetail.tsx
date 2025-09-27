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

const tabs = [
  { key: 'bitacora', label: 'Bitácora' },
  { key: 'fases', label: 'Fases' },
  { key: 'requerimientos', label: 'Requerimientos' },
];

const DevelopmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext().state;
  const { get } = useApi<DevelopmentWithCurrentStatus>();
  const { developmentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bitacora';

  const [development, setDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Modales de actividad
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ status: string; notes?: string; next_follow_up_at?: string; start_date?: string; end_date?: string } | null>(null);
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

  // Validación simple del formulario de edición
  const validate = useMemo(() => (form: Required<typeof editForm>) => {
    if (!form) return [];
    const errs: string[] = [];
    if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
      errs.push('La fecha de inicio no puede ser mayor que la fecha de fin.');
    }
    if (form.next_follow_up_at && form.start_date && new Date(form.next_follow_up_at) < new Date(form.start_date)) {
      errs.push('El próximo seguimiento no puede ser anterior a la fecha de inicio.');
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
      end_date: activity.end_date || ''
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
    const ok = await confirmEditActivity(selectedActivity.id, editForm);
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
            <div className="flex justify-end">
              <button onClick={() => setCreateOpen(true)} className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-3 py-2 rounded`}>Nueva actividad</button>
            </div>
            {activitiesLoading ? (
              <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Cargando actividades…</p>
            ) : activities.length === 0 ? (
              <p className={`${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>No hay actividades.</p>
            ) : (
              activities.map((a) => (
                <div key={a.id} className={`${darkMode ? 'bg-neutral-700' : 'bg-neutral-50'} rounded-lg p-4 flex items-start justify-between`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${a.status === 'completada' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : a.status === 'en_curso' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{a.status}</span>
                      <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-neutral-600 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>{a.stage_name}</span>
                    </div>
                    <p className={`mt-2 text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{a.activity_type}</p>
                    {a.notes && <p className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{a.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(a)} className={`${darkMode ? 'bg-neutral-600 hover:bg-neutral-700 text-white' : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'} px-3 py-1 rounded`}>Editar</button>
                    <button onClick={() => openDelete(a)} className={`${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} px-3 py-1 rounded`}>Eliminar</button>
                  </div>
                </div>
              ))
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
        defaultStageId={development?.current_stage_id as any}
        darkMode={darkMode}
        onClose={() => setCreateOpen(false)}
        onCreated={loadActivities}
      />
    </div>
  );
};

export default DevelopmentDetail;


