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
import { MaterialButton, MaterialCard, MaterialTypography } from '../components/atoms';

const tabs = [
  { key: 'detalle', label: 'Detalle' },
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
  const activeTab = searchParams.get('tab') || 'detalle';

  const [development, setDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState<any | null>(null);

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
    if (development && activeTab === 'detalle') {
      loadActivities();
    }
  }, [development, activeTab, loadActivities]);

  // Obtener última actividad cuando se cargan las actividades
  useEffect(() => {
    if (activities && activities.length > 0) {
      // Ordenar por fecha de creación descendente y tomar la primera
      const sortedActivities = [...activities].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLastActivity(sortedActivities[0]);
    }
  }, [activities]);

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
        {activeTab === 'detalle' && (
          <div className="space-y-6">
            {/* Información General del Desarrollo */}
            <MaterialCard elevation={2} darkMode={darkMode}>
              <MaterialCard.Header darkMode={darkMode}>
                <MaterialTypography variant="h5" darkMode={darkMode} gutterBottom>
                  📋 Información General
                </MaterialTypography>
              </MaterialCard.Header>
              <MaterialCard.Content darkMode={darkMode}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Nombre del Desarrollo
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.name || 'No especificado'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      ID del Desarrollo
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.id || 'No especificado'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Descripción
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.description || 'No especificada'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Módulo
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.module || 'No especificado'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Tipo
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.type || 'No especificado'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Ambiente
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.environment || 'No especificado'}
                    </MaterialTypography>
                  </div>
                </div>
              </MaterialCard.Content>
            </MaterialCard>

            {/* Estado y Progreso */}
            <MaterialCard elevation={2} darkMode={darkMode}>
              <MaterialCard.Header darkMode={darkMode}>
                <MaterialTypography variant="h5" darkMode={darkMode} gutterBottom>
                  📊 Estado y Progreso
                </MaterialTypography>
              </MaterialCard.Header>
              <MaterialCard.Content darkMode={darkMode}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Estado General
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.general_status || 'No especificado'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Fase Actual
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.current_phase?.phase_name || 'No especificada'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Etapa Actual
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.current_stage?.stage_name || 'No especificada'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Progreso de Etapa
                    </MaterialTypography>
                    <div className="flex items-center gap-2">
                      <div className={`w-full bg-neutral-200 rounded-full h-2 ${darkMode ? 'bg-neutral-600' : 'bg-neutral-200'}`}>
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${development?.stage_progress_percentage || 0}%` }}
                        ></div>
                      </div>
                      <MaterialTypography variant="body2" darkMode={darkMode}>
                        {development?.stage_progress_percentage || 0}%
                      </MaterialTypography>
                    </div>
                  </div>
                </div>
              </MaterialCard.Content>
            </MaterialCard>

            {/* Responsables y Proveedores */}
            <MaterialCard elevation={2} darkMode={darkMode}>
              <MaterialCard.Header darkMode={darkMode}>
                <MaterialTypography variant="h5" darkMode={darkMode} gutterBottom>
                  👥 Responsables y Proveedores
                </MaterialTypography>
              </MaterialCard.Header>
              <MaterialCard.Content darkMode={darkMode}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Proveedor
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.provider || 'No especificado'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Responsable
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.responsible || 'No especificado'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Área Solicitante
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.requesting_area || 'No especificada'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Usuario Responsable Principal
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.main_responsible || 'No especificado'}
                    </MaterialTypography>
                  </div>
                </div>
              </MaterialCard.Content>
            </MaterialCard>

            {/* Información de Proveedores y SIDE */}
            {development?.providers && development.providers.length > 0 && (
              <MaterialCard elevation={2} darkMode={darkMode}>
                <MaterialCard.Header darkMode={darkMode}>
                  <MaterialTypography variant="h5" darkMode={darkMode} gutterBottom>
                    🏢 Información de Proveedores y SIDE
                  </MaterialTypography>
                </MaterialCard.Header>
                <MaterialCard.Content darkMode={darkMode}>
                  <div className="space-y-4">
                    {development.providers.map((provider, index) => (
                      <div key={provider.id} className={`${darkMode ? 'bg-neutral-600 border-neutral-500' : 'bg-neutral-50 border-neutral-200'} border rounded-lg p-4`}>
                        <MaterialTypography variant="h6" darkMode={darkMode} gutterBottom>
                          Proveedor {index + 1}
                        </MaterialTypography>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Nombre del Proveedor
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {provider.provider_name || 'No especificado'}
                            </MaterialTypography>
                          </div>
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              SIDE/ServicePoint
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {provider.side_service_point || 'No especificado'}
                            </MaterialTypography>
                          </div>
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Sistema del Proveedor
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {provider.provider_system || 'No especificado'}
                            </MaterialTypography>
                          </div>
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Estado
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {provider.status || 'No especificado'}
                            </MaterialTypography>
                          </div>
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Fecha de Creación
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {provider.created_at ? new Date(provider.created_at).toLocaleDateString('es-ES') : 'No especificada'}
                            </MaterialTypography>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </MaterialCard.Content>
              </MaterialCard>
            )}

            {/* Información de Responsables Detallada */}
            {development?.responsibles && development.responsibles.length > 0 && (
              <MaterialCard elevation={2} darkMode={darkMode}>
                <MaterialCard.Header darkMode={darkMode}>
                  <MaterialTypography variant="h5" darkMode={darkMode} gutterBottom>
                    👤 Responsables Detallados
                  </MaterialTypography>
                </MaterialCard.Header>
                <MaterialCard.Content darkMode={darkMode}>
                  <div className="space-y-4">
                    {development.responsibles.map((responsible, index) => (
                      <div key={responsible.id} className={`${darkMode ? 'bg-neutral-600 border-neutral-500' : 'bg-neutral-50 border-neutral-200'} border rounded-lg p-4`}>
                        <div className="flex justify-between items-start mb-3">
                          <MaterialTypography variant="h6" darkMode={darkMode}>
                            {responsible.user_name}
                          </MaterialTypography>
                          {responsible.is_primary && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Principal
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Tipo de Rol
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {responsible.role_type?.replace('_', ' ').toUpperCase() || 'No especificado'}
                            </MaterialTypography>
                          </div>
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Área
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {responsible.area || 'No especificada'}
                            </MaterialTypography>
                          </div>
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Fecha de Asignación
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {responsible.assigned_date ? new Date(responsible.assigned_date).toLocaleDateString('es-ES') : 'No especificada'}
                            </MaterialTypography>
                          </div>
                          <div>
                            <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                              Fecha de Creación
                            </MaterialTypography>
                            <MaterialTypography variant="body1" darkMode={darkMode}>
                              {responsible.created_at ? new Date(responsible.created_at).toLocaleDateString('es-ES') : 'No especificada'}
                            </MaterialTypography>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </MaterialCard.Content>
              </MaterialCard>
            )}

            {/* Fechas */}
            <MaterialCard elevation={2} darkMode={darkMode}>
              <MaterialCard.Header darkMode={darkMode}>
                <MaterialTypography variant="h5" darkMode={darkMode} gutterBottom>
                  📅 Fechas Importantes
                </MaterialTypography>
              </MaterialCard.Header>
              <MaterialCard.Content darkMode={darkMode}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Fecha de Inicio
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.start_date ? new Date(development.start_date).toLocaleDateString('es-ES') : 'No especificada'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Fecha Estimada de Fin
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.estimated_end_date ? new Date(development.estimated_end_date).toLocaleDateString('es-ES') : 'No especificada'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Días Estimados
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.estimated_days || 'No especificados'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Fecha de Creación
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.created_at ? new Date(development.created_at).toLocaleDateString('es-ES') : 'No especificada'}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                      Última Actualización
                    </MaterialTypography>
                    <MaterialTypography variant="body1" darkMode={darkMode}>
                      {development?.updated_at ? new Date(development.updated_at).toLocaleDateString('es-ES') : 'No especificada'}
                    </MaterialTypography>
                  </div>
                </div>
              </MaterialCard.Content>
            </MaterialCard>

            {/* Última Actividad */}
            <MaterialCard elevation={2} darkMode={darkMode}>
              <MaterialCard.Header darkMode={darkMode}>
                <MaterialTypography variant="h5" darkMode={darkMode} gutterBottom>
                  🔄 Última Actividad de Bitácora
                </MaterialTypography>
              </MaterialCard.Header>
              <MaterialCard.Content darkMode={darkMode}>
                {activitiesLoading ? (
                  <MaterialTypography variant="body1" color="textSecondary" darkMode={darkMode}>
                    Cargando última actividad...
                  </MaterialTypography>
                ) : lastActivity ? (
                  <MaterialCard elevation={1} darkMode={darkMode} className="bg-opacity-50">
                    <MaterialCard.Content darkMode={darkMode}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <MaterialTypography variant="h6" darkMode={darkMode} gutterBottom>
                            {lastActivity.stage_name}
                          </MaterialTypography>
                          <MaterialTypography variant="body2" color="textSecondary" darkMode={darkMode}>
                            {new Date(lastActivity.created_at).toLocaleString('es-ES')}
                          </MaterialTypography>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lastActivity.status === 'completada' 
                            ? 'bg-green-100 text-green-800' 
                            : lastActivity.status === 'en_curso'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {lastActivity.status === 'completada' ? '✅ Completada' :
                           lastActivity.status === 'en_curso' ? '🔄 En curso' : '⏳ Pendiente'}
                        </span>
                      </div>
                      {lastActivity.notes && (
                        <div className="mb-3">
                          <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                            Notas:
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode}>
                            {lastActivity.notes}
                          </MaterialTypography>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                            Tipo de Actividad:
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode}>
                            {lastActivity.activity_type?.replace('_', ' ').toUpperCase() || 'No especificado'}
                          </MaterialTypography>
                        </div>
                        <div>
                          <MaterialTypography variant="subtitle2" color="textSecondary" darkMode={darkMode} gutterBottom>
                            Actor:
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode}>
                            {lastActivity.actor_type?.replace('_', ' ').toUpperCase() || 'No especificado'}
                          </MaterialTypography>
                        </div>
                      </div>
                    </MaterialCard.Content>
                  </MaterialCard>
                ) : (
                  <MaterialTypography variant="body1" color="textSecondary" darkMode={darkMode}>
                    No hay actividades registradas en la bitácora.
                  </MaterialTypography>
                )}
              </MaterialCard.Content>
            </MaterialCard>
          </div>
        )}

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