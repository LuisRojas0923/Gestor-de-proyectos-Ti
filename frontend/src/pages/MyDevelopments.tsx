import { Calendar, Eye, GitBranch, ListChecks, Search, ShieldCheck, SquarePen, Upload, X, Trash2, ExternalLink, ChevronUp, ChevronDown, CheckCircle, AlertTriangle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ExcelImporter from '../components/common/ExcelImporter';
import { DevelopmentTimeline } from '../components/development';
import { DevelopmentTimelineCompact } from '../components/molecules';
import RequirementsTab from '../components/development/RequirementsTab';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { useDevelopmentUpdates } from '../hooks/useDevelopmentUpdates';
// import { useObservations } from '../hooks/useObservations'; // Legacy - no usado en nuevo sistema
import { API_ENDPOINTS } from '../config/api';
import { DevelopmentWithCurrentStatus } from '../types';
import QualityControlsTab from '../components/development/QualityControlsTab';
import { MaterialCard, MaterialButton, MaterialTextField, MaterialSelect } from '../components/atoms';
import { ActivityForm } from '../components/molecules/ActivityForm';
import { HybridGanttChart } from '../components/development/HybridGanttChart';
import { development, phases } from '../utils/logger';

// Usar el tipo real del backend
type Development = DevelopmentWithCurrentStatus;

// Constantes para las etapas del proceso (usadas en otros componentes)
export const processStages = [
    {
      name: 'Solicitud y Análisis de Requerimientos',
      stagePrefixes: ['1', '2'],
      controls: [
        {
          code: 'C003-GT',
          description: 'El ANALISTA SISTEMAS cada vez que se presente solicitud de desarrollo (portal transaccional, Sifi o finansoft) y/o consulta ORM valida que el requerimiento sea claro, completo y corresponda a la necesidad del Líder Usuario comparando en el formato "FD-FT 284 Formato de requerimiento de necesidades" el objetivo del desarrollo versus la necesidad establecida en el formato. En caso de novedad notifica al Líder Usuario y/o solicita reunión de entendimiento para que se realicen los ajustes necesarios.'
        }
      ]
    },
    {
      name: 'Autorización Requerimiento',
      stagePrefixes: ['3', '4'],
      controls: []
    },
    {
      name: 'Fase de Pruebas',
      stagePrefixes: ['5', '6', '7'],
      controls: [
        {
          code: 'C021-GT',
          description: 'El ANALISTA SISTEMAS cada vez que se presente nuevos desarrollos, mejoras o ajustes a los desarrollos existentes valida que las pruebas realizadas por el Líder Usuario correspondan al requerimiento comparando los escenarios establecidos en el test de funcionamiento entregado por el proveedor versus los escenarios del formato FD-FT-060 FORMATO PRUEBAS APLICATIVO y que cuente con visto bueno del líder usuario y/o procesos y áreas afectadas. En caso de novedad se solicita revisión y ajuste de los escenarios al área correspondiente.'
        }
      ]
    },
    {
      name: 'Certificación de Pruebas',
      stagePrefixes: ['8', '9', '10'],
      controls: [
        {
          code: 'C004-GT',
          description: 'ARQUITECTO DE SOLUCIONES/ ANALISTA SISTEMAS cada vez que el proveedor entrega un desarrollo para pruebas garantiza que las entregas de desarrollo del proveedor cumplan con los requisitos establecidos y no generen impacto negativo en producción: (i) cuando se trate de nuevos desarrollos valida con el líder solicitante que todas las áreas relacionadas con las funcionalidades participen de las pruebas de toda la funcionalidad (ii) cuando se trate de desarrollos específicos valida en la reunión de entendimiento que participen todas las áreas impactadas y solicita al líder solicitante el plan de pruebas para la certificación del paso a producción. En caso de novedad no se realiza el paso a producción.'
        },
        {
          code: 'C027-GT',
          description: 'El ARQUITECTO DE SOLUCIONES trimestralmente mediante muestra aleatoria del (10%) valida que los cambios en ambiente productivo de nuevos desarrollos y funcionalidades cuente con los soportes correspondientes, requerimiento, autorización del solicitante, formato de pruebas, correo de confirmación de instalación para haber efectuado la instalación, comparando los documentos relacionados en remedy versus los soportes relacionados en la carpeta por del desarrollo. En caso de novedad solicitar los faltantes al ANALISTA DE SISTEMA encargado.'
        }
      ]
    }
  ];


// Updated stages in numerical order (1,2,3,4,5,6,7,8,9,10,0)
const allStagesInOrder = [
  '1. Definición',
  '2. Análisis',
  '3. Propuesta',
  '4. Aprobación',
  '5. Desarrollo',
  '6. Despliegue (Pruebas)',
  '7. Plan de Pruebas',
  '8. Ejecución Pruebas',
  '9. Aprobación (Pase)',
  '10. Desplegado',
  '0. Cancelado',
];


const generalStatuses = ['Pendiente', 'En curso', 'Completado', 'Cancelado'];

const MyDevelopments: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { get, put, delete: del } = useApi();
  
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; development: Development | null }>({
    isOpen: false,
    development: null
  });
  const [activityDeleteModal, setActivityDeleteModal] = useState<{ 
    isOpen: boolean; 
    activityId: number | null;
    activity: any | null;
  }>({
    isOpen: false,
    activityId: null,
    activity: null
  });
  const [shouldRollbackStage, setShouldRollbackStage] = useState(false);
  const [activityEditModal, setActivityEditModal] = useState<{ 
    isOpen: boolean; 
    activity: any | null;
    form: { status: string; notes?: string; next_follow_up_at?: string } | null;
  }>({ isOpen: false, activity: null, form: null });
  const [activityEditErrors, setActivityEditErrors] = useState<string[]>([]);

  const validateActivityEditForm = (form: { status: string; notes?: string; next_follow_up_at?: string; start_date?: string; end_date?: string }): string[] => {
    const errors: string[] = [];
    const toDate = (v?: string) => (v ? new Date(v + (v.length === 10 ? 'T00:00:00' : '')) : null);
    const start = toDate(form.start_date);
    const end = toDate(form.end_date);
    const next = toDate(form.next_follow_up_at);

    if (start && end && start > end) {
      errors.push('La fecha de inicio no puede ser mayor que la fecha de fin.');
    }
    const today = new Date(); today.setHours(0,0,0,0);
    if (next) {
      if (start && next < start) {
        errors.push('El próximo seguimiento no puede ser anterior a la fecha de inicio.');
      } else if (!start && next < today) {
        errors.push('El próximo seguimiento no puede ser en el pasado.');
      }
    }
    return errors;
  };

  const updateActivityEditForm = (patch: Partial<{ status: string; notes?: string; next_follow_up_at?: string; start_date?: string; end_date?: string }>) => {
    setActivityEditModal(prev => {
      if (!prev || !prev.form) return prev;
      const newForm = { ...prev.form, ...patch } as any;
      setActivityEditErrors(validateActivityEditForm(newForm));
      return { ...prev, form: newForm };
    });
  };

  // Load developments from API on initial render
  useEffect(() => {
    loadDevelopments();
  }, []);


  // Column mapping for the importer - Updated to match your Excel structure
  const columnMapping = {
    'ID de la incidencia*+': 'id', // El texto será el ID, el hipervínculo será remedy_link
    'Usuario asignado+': 'responsible', // Campo Responsable de la aplicación
    'Resumen*': 'name', // Nombre del desarrollo
    'Estado*': 'general_status', // Mapear Estado* del Excel al general_status
    'Fecha de envío': 'start_date',
    // remedy_link se extraerá automáticamente del hipervínculo de 'ID de la incidencia*+'
    // Todas las demás columnas se ignoran automáticamente
  };

  const handleImport = async (importedData: Partial<Development>[]) => {
    try {
      // Prepare data for API - Solo campos que existen en el backend
      const validData = importedData
        .filter(item => {
          // Filtrar filas que no son desarrollos reales
          if (!item.id) return false;
          
          // Filtrar marcas temporales (formato de fecha)
          const idStr = item.id.toString();
          if (idStr.match(/^\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4}\s+\d{1,2}:\d{2}$/i)) {
            return false;
          }
          
          // Filtrar IDs que no siguen el formato de Remedy (INC + números)
          if (!idStr.match(/^INC\d+$/)) {
            return false;
          }
          
          return true;
        })
        .map(item => ({
          // Campos requeridos
          id: item.id!,
          name: item.name ?? 'N/A', // Ahora viene del campo 'Resumen*'
          
          // Campos opcionales válidos
          description: item.description ?? '',
          module: item.module ?? '',
          type: item.type ?? 'Desarrollo',
          environment: item.environment ?? '',
          remedy_link: item.remedy_link ?? '', // Extraído del hipervínculo
          provider: item.provider ?? 'N/A',
          responsible: (item as any).responsible ?? 'N/A', // Ahora viene del campo 'Usuario asignado+'
          general_status: item.general_status ?? 'Pendiente',
          
          // Fecha en formato correcto (solo fecha, no datetime)
          estimated_end_date: item.estimated_end_date 
            ? new Date(item.estimated_end_date).toISOString().split('T')[0] 
            : null,
          
          // Campos de fase/etapa (opcionales)
          current_phase_id: null, // Se asignará automáticamente
          current_stage_id: null, // Se asignará automáticamente
          stage_progress_percentage: 0,
        }));

      if (validData.length === 0) {
        const filteredCount = importedData.length - validData.length;
        if (filteredCount > 0) {
          toast.error(`No se encontraron datos válidos para importar. Se filtraron ${filteredCount} filas con IDs inválidos o marcas temporales.`);
        } else {
          toast.error('No se encontraron datos válidos para importar.');
        }
        return;
      }

      // Log data being sent
      console.log('Datos a enviar:', validData);
      console.log('Primer elemento:', validData[0]);

      // Send to API using the legacy endpoint
      const response = await fetch('http://localhost:8000/api/legacy/developments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mostrar mensaje detallado basado en la respuesta
        const summary = result.data.summary;
        let message = `Importación completada: `;
        
        if (summary.created > 0) {
          message += `${summary.created} creado(s)`;
        }
        if (summary.updated > 0) {
          if (summary.created > 0) message += ', ';
          message += `${summary.updated} actualizado(s)`;
        }
        if (summary.skipped > 0) {
          if (summary.created > 0 || summary.updated > 0) message += ', ';
          message += `${summary.skipped} sin cambios`;
        }
        
        toast.success(message);
        
        // Refresh the developments list
        loadDevelopments();
      } else {
        const errorData = await response.json();
        console.error('Error de importación completo:', errorData);
        
        // Mostrar detalles específicos del error
        if (errorData.detail && Array.isArray(errorData.detail)) {
          console.error('Errores de validación completos:', errorData.detail);
          
          // Mostrar todos los errores en la consola
          errorData.detail.forEach((error: any, index: number) => {
            console.error(`Error ${index + 1}:`, error);
          });
          
          const firstError = errorData.detail[0];
          if (firstError && firstError.loc && firstError.msg) {
            toast.error(`Error de validación: ${firstError.msg} en ${firstError.loc.join('.')} (${errorData.detail.length} errores total)`);
          } else {
            toast.error(`Error de validación: ${JSON.stringify(errorData.detail[0])} (${errorData.detail.length} errores total)`);
          }
        } else {
          toast.error(`Error al importar: ${errorData.detail || 'Error desconocido'}`);
        }
      }
    } catch (error) {
      console.error('Error importing developments:', error);
      toast.error('Error al conectar con el servidor. Verifica que el backend esté ejecutándose.');
    }
    
    setImportModalOpen(false);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'none' | 'provider' | 'module' | 'responsible'>('none');
  
  // Estados para ordenamiento
  const [sortField, setSortField] = useState<keyof Development | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const loadDevelopments = async () => {
    try {
      const response = await get('/developments/');
      
      // El backend retorna directamente un array de desarrollos
      if (Array.isArray(response)) {
        setDevelopments(response);
      } 
      // Si la respuesta tiene el formato esperado (con developments property)
      else if (response && typeof response === 'object' && 'developments' in response) {
        setDevelopments(response.developments as DevelopmentWithCurrentStatus[]);
      }
      else {
        console.error('Error loading developments from API - unexpected response format');
        // Fallback to localStorage if API fails
        const storedDevelopments = localStorage.getItem('developments');
        if (storedDevelopments) {
          setDevelopments(JSON.parse(storedDevelopments));
        }
      }
    } catch (error) {
      console.error('Error loading developments:', error);
      // Fallback to localStorage if API fails
      const storedDevelopments = localStorage.getItem('developments');
      if (storedDevelopments) {
        setDevelopments(JSON.parse(storedDevelopments));
      }
    }
  };
  
  const [selectedDevelopment, setSelectedDevelopment] = useState<Development | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  // const [newActivity, setNewActivity] = useState(''); // Legacy - no usado en nuevo sistema
  const [activeView, setActiveView] = useState<'list' | 'phases' | 'timeline'>('list');
  const [editingDevelopment, setEditingDevelopment] = useState<Development | null>(null);
  const [activePhaseTab, setActivePhaseTab] = useState<'phases' | 'gantt' | 'controls' | 'activities' | 'requirements'>('phases');
  
  // Estados para el nuevo sistema de bitácora inteligente
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  // Removido: ahora solo usamos la vista de timeline

  // Hooks para observaciones y actualizaciones (mantenido para compatibilidad)
  // const { 
  //   observations, 
  //   loading: observationsLoading, 
  //   error: observationsError, 
  //   createObservation, 
  //   refreshObservations 
  // } = useObservations(selectedDevelopment?.id || null);
  
  const { 
    loading: updateLoading, 
    updateDevelopment 
  } = useDevelopmentUpdates();

  // Función legacy mantenida para compatibilidad
  // const handleAddActivity = async () => {
  //   if (newActivity.trim() && selectedDevelopment) {
  //     try {
  //       const result = await createObservation({
  //         observation_type: 'seguimiento',
  //         content: newActivity.trim(),
  //         author: 'Usuario Actual', // TODO: Obtener del contexto de auth
  //         is_current: true
  //       });
        
  //       if (result) {
  //         setNewActivity('');
  //         // Recargar observaciones
  //         await refreshObservations();
  //       }
  //     } catch (error) {
  //       console.error('Error adding activity:', error);
  //       toast.error('Error al agregar la actividad');
  //     }
  //   }
  // };

  // Funciones para el nuevo sistema de bitácora inteligente
  const loadActivities = async () => {
    if (!selectedDevelopment) return;
    
    setActivitiesLoading(true);
    try {
      const response = await get(API_ENDPOINTS.ACTIVITY_LOG_LIST(selectedDevelopment.id)) as any;
      if (response && response.activities) {
        setActivities(response.activities);
      }
    } catch (error) {
      console.error('Error cargando actividades:', error);
      toast.error('Error cargando actividades');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleActivitySuccess = async (activity: any) => {
    console.log('✅ Actividad creada exitosamente:', activity);
    setActivities(prev => [activity, ...prev]);
    setShowActivityForm(false);
    toast.success('Actividad creada exitosamente');
    
    // Refrescar desarrollo seleccionado para actualizar fases/timeline
    if (selectedDevelopment) {
      try {
        const updatedDev = await get(API_ENDPOINTS.DEVELOPMENT_BY_ID(selectedDevelopment.id)) as DevelopmentWithCurrentStatus;
        if (updatedDev) {
          setSelectedDevelopment(updatedDev);
          console.log('✅ Desarrollo refrescado:', updatedDev.current_stage_id);
        }
      } catch (error) {
        console.error('Error refrescando desarrollo:', error);
      }
    }
  };

  // Función para completar una actividad
  const handleCompleteActivity = async (activityId: number) => {
    try {
      const response = await put(API_ENDPOINTS.ACTIVITY_LOG_UPDATE(activityId), {
        status: 'completada',
        end_date: new Date().toISOString().split('T')[0]
      });

      if (response) {
        // Actualizar la actividad en el estado local
        setActivities(prev => prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, status: 'completada', end_date: new Date().toISOString().split('T')[0] }
            : activity
        ));
        toast.success('Actividad marcada como completada');
        }
      } catch (error) {
      console.error('Error completando actividad:', error);
      toast.error('Error al completar la actividad');
    }
  };

  // Función para eliminar una actividad
  const openDeleteActivityModal = (activityId: number) => {
    const activity = activities.find(a => a.id === activityId);
    setActivityDeleteModal({ isOpen: true, activityId, activity });
  };

  const confirmDeleteActivity = async () => {
    const activityId = activityDeleteModal.activityId;
    const activity = activityDeleteModal.activity;
    if (!activityId) return;

    try {
      // 1. Eliminar la actividad
      const response = await del(API_ENDPOINTS.ACTIVITY_LOG_DELETE(activityId));
      if (response) {
        setActivities(prev => prev.filter(activity => activity.id !== activityId));
        
        // 2. Si se solicita rollback y la actividad movió una etapa, revertir
        if (shouldRollbackStage && activity && selectedDevelopment) {
          try {
            // Buscar la actividad anterior para determinar la etapa anterior
            const remainingActivities = activities.filter(a => a.id !== activityId);
            const previousActivity = remainingActivities
              .filter(a => a.stage_id !== activity.stage_id)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            
            if (previousActivity) {
              // Mover el desarrollo a la etapa anterior
              await put(API_ENDPOINTS.DEVELOPMENT_BY_ID(selectedDevelopment.id), {
                current_stage_id: previousActivity.stage_id
              });
              
              // Refrescar el desarrollo
              const updatedDev = await get(API_ENDPOINTS.DEVELOPMENT_BY_ID(selectedDevelopment.id)) as DevelopmentWithCurrentStatus;
              if (updatedDev) {
                setSelectedDevelopment(updatedDev);
              }
              
              toast.success('Actividad eliminada y etapa revertida exitosamente');
            } else {
              toast.success('Actividad eliminada exitosamente');
            }
          } catch (rollbackError) {
            console.error('Error en rollback:', rollbackError);
            toast.success('Actividad eliminada, pero no se pudo revertir la etapa');
          }
        } else {
          toast.success('Actividad eliminada exitosamente');
        }
      }
    } catch (error) {
      console.error('Error eliminando actividad:', error);
      toast.error('Error al eliminar la actividad');
    } finally {
      setActivityDeleteModal({ isOpen: false, activityId: null, activity: null });
      setShouldRollbackStage(false);
    }
  };

  // Abrir modal de edición de actividad
  const openEditActivityModal = (activity: any) => {
    setActivityEditModal({
      isOpen: true,
      activity,
      form: {
        status: activity.status || 'pendiente',
        notes: activity.notes || '',
        next_follow_up_at: activity.next_follow_up_at || '',
        start_date: activity.start_date || '',
        end_date: activity.end_date || ''
      }
    });
    setActivityEditErrors(validateActivityEditForm({
      status: activity.status || 'pendiente',
      notes: activity.notes || '',
      next_follow_up_at: activity.next_follow_up_at || '',
      start_date: activity.start_date || '',
      end_date: activity.end_date || ''
    }));
  };

  const cancelEditActivity = () => {
    setActivityEditModal({ isOpen: false, activity: null, form: null });
  };

  const confirmEditActivity = async () => {
    if (!activityEditModal.activity || !activityEditModal.form) return;
    if (activityEditErrors.length > 0) {
      toast.error('Corrige las validaciones antes de guardar.');
      return;
    }
    const { activity, form } = activityEditModal;
    try {
      const response = await put(API_ENDPOINTS.ACTIVITY_LOG_UPDATE(activity.id), {
        status: form.status,
        notes: form.notes,
        next_follow_up_at: form.next_follow_up_at || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null
      });
      if (response) {
        setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, ...form } : a));
        toast.success('Actividad actualizada');
        cancelEditActivity();
      }
    } catch (error) {
      console.error('Error actualizando actividad:', error);
      toast.error('Error al actualizar la actividad');
    }
  };

  const cancelDeleteActivity = () => {
    setActivityDeleteModal({ isOpen: false, activityId: null, activity: null });
    setShouldRollbackStage(false);
  };

  // Cargar actividades cuando se selecciona un desarrollo
  useEffect(() => {
    if (selectedDevelopment && activePhaseTab === 'activities') {
      loadActivities();
    }
  }, [selectedDevelopment, activePhaseTab]);

  const handleViewDetails = (dev: Development) => {
    development.debug('Opening details for development', dev);
    setSelectedDevelopment(dev);
    setActiveView('phases'); // Cambiar automáticamente a vista de fases
    development.info('Switching to phases view', dev.id);
  };
  
  const handleEdit = async (dev: Development) => {
    try {
      // Cargar el desarrollo específico con todas sus relaciones
      const fullDevData = await get(`/developments/${dev.id}`) as DevelopmentWithCurrentStatus;
      
      setSelectedDevelopment(fullDevData || dev);
      setEditingDevelopment(fullDevData || dev);
      setEditModalOpen(true);
    } catch (error) {
      console.error('Error cargando desarrollo completo:', error);
      // Fallback al desarrollo original si falla la carga
      setSelectedDevelopment(dev);
      setEditingDevelopment(dev);
      setEditModalOpen(true);
    }
  };

  const handleDelete = (dev: Development) => {
    setDeleteConfirmModal({
      isOpen: true,
      development: dev
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.development) return;
    
    const dev = deleteConfirmModal.development;
    
      try {
        // Eliminar realmente el desarrollo de la base de datos
        const response = await fetch(`http://localhost:8000/api/v1/developments/${dev.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          toast.success(`Desarrollo "${dev.name}" eliminado exitosamente`);
          
          // Remover el desarrollo de la lista local
          setDevelopments(prev => prev.filter(d => d.id !== dev.id));
          
          // Si el desarrollo eliminado estaba seleccionado, limpiar la selección
          if (selectedDevelopment?.id === dev.id) {
            setSelectedDevelopment(null);
            setActiveView('list');
          }
        } else {
          const errorData = await response.json();
          console.error('Error eliminando desarrollo:', errorData);
          toast.error(`Error al eliminar el desarrollo: ${errorData.detail || 'Error desconocido'}`);
        }
        
      } catch (error) {
        console.error('Error eliminando desarrollo:', error);
        toast.error('Error al conectar con el servidor para eliminar el desarrollo');
      }
    
    // Cerrar modal de confirmación
    setDeleteConfirmModal({
      isOpen: false,
      development: null
    });
  };

  const cancelDelete = () => {
    setDeleteConfirmModal({
      isOpen: false,
      development: null
    });
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSelectedDevelopment(null);
    setEditingDevelopment(null);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (editingDevelopment) {
      if (e.target.name === 'current_stage') {
        // Para current_stage, actualizamos manteniendo la estructura original
        // Si current_stage es un objeto, mantenemos la estructura pero actualizamos el stage_name
        if (typeof editingDevelopment.current_stage === 'object' && editingDevelopment.current_stage !== null) {
          setEditingDevelopment({
            ...editingDevelopment,
            current_stage: {
              ...editingDevelopment.current_stage,
              stage_name: e.target.value
            }
          });
        } else {
          // Si current_stage es un string o null, lo convertimos a string
          setEditingDevelopment({
            ...editingDevelopment,
            current_stage: e.target.value as any, // Forzamos el tipo para el formulario
          });
        }
      } else {
        // Para otros campos, actualizamos normalmente
        setEditingDevelopment({
          ...editingDevelopment,
          [e.target.name]: e.target.value,
        });
      }
    }
  };

  const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editingDevelopment) {
      setEditingDevelopment({
        ...editingDevelopment,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleSaveDevelopment = async () => {
    if (!editingDevelopment) return;

    try {
      // Mapear el nombre de la etapa al ID correspondiente (orden correcto)
      const stageNameToId: { [key: string]: number } = {
        '1. Definición': 1,
        '2. Análisis': 2,
        '3. Propuesta': 3,
        '4. Aprobación': 4,
        '5. Desarrollo': 5,
        '6. Despliegue (Pruebas)': 6,
        '7. Plan de Pruebas': 7,
        '8. Ejecución Pruebas': 8,
        '9. Aprobación (Pase)': 9,
        '10. Desplegado': 10,
        '0. Cancelado': 11
      };

      const currentStageName = typeof editingDevelopment.current_stage === 'object' 
        ? editingDevelopment.current_stage?.stage_name || '1. Definición'
        : editingDevelopment.current_stage || '1. Definición';
      
      const currentStageId = stageNameToId[currentStageName] || 1;

      // Debug: Log para verificar los datos que se están enviando
      console.log('=== DEBUG: Actualizando desarrollo ===');
      console.log('ID del desarrollo:', editingDevelopment.id);
      console.log('Nombre de etapa seleccionada:', currentStageName);
      console.log('ID de etapa mapeado:', currentStageId);
      console.log('Datos a enviar:', {
        name: editingDevelopment.name,
        description: editingDevelopment.description,
        general_status: editingDevelopment.general_status,
        provider: editingDevelopment.provider,
        current_stage_id: currentStageId
      });

      const result = await updateDevelopment(editingDevelopment.id, {
        name: editingDevelopment.name,
        description: editingDevelopment.description,
        general_status: editingDevelopment.general_status,
        provider: editingDevelopment.provider,
        current_stage_id: currentStageId
      });

      if (result) {
        console.log('=== DEBUG: Actualización exitosa ===');
        console.log('Resultado de la actualización:', result);
        
        // Recargar la lista de desarrollos para obtener los datos actualizados
        await loadDevelopments();
        
        // Cerrar modal
        setEditModalOpen(false);
        setEditingDevelopment(null);
        
        toast.success('Desarrollo actualizado exitosamente');
      } else {
        console.log('=== DEBUG: Error en la actualización ===');
        console.log('No se recibió resultado de la actualización');
      }
    } catch (error) {
      console.error('Error updating development:', error);
      toast.error('Error al actualizar el desarrollo');
    }
  };

  // Función para manejar el ordenamiento
  const handleSort = (field: keyof Development) => {
    if (sortField === field) {
      // Si ya está ordenando por este campo, cambiar la dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un campo nuevo, empezar con ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para obtener el valor de ordenamiento de un desarrollo
  const getSortValue = (dev: Development, field: keyof Development) => {
    const value = dev[field];
    
    // Manejar casos especiales
    if (field === 'current_stage') {
      if (typeof value === 'object' && value !== null && 'stage_name' in value) {
        return (value as any).stage_name || '';
      }
      return String(value || '');
    }
    
    // Para otros campos, convertir a string para comparación
    return String(value || '').toLowerCase();
  };


  const filteredDevelopments = useMemo(() => {
    let filtered = developments.filter((dev) => {
      const matchesSearch =
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvider = providerFilter === 'all' || dev.provider === providerFilter;
      const matchesStatus = statusFilter === 'all' || dev.general_status === statusFilter;
      const matchesModule = moduleFilter === 'all' || dev.module === moduleFilter;
      const matchesResponsible = responsibleFilter === 'all' || dev.responsible === responsibleFilter;
      return matchesSearch && matchesProvider && matchesStatus && matchesModule && matchesResponsible;
    });

    // Aplicar ordenamiento si hay un campo seleccionado
    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = getSortValue(a, sortField);
        const bValue = getSortValue(b, sortField);
        
        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [searchTerm, providerFilter, statusFilter, moduleFilter, responsibleFilter, developments, sortField, sortDirection]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En curso':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'Pendiente':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'Completado':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getProgressColor = (stageName: string) => {
    // Mapeo de etapas a colores basado en el progreso del desarrollo
    // Mejorado para mejor contraste en modo claro y oscuro
    switch (stageName) {
      // Etapas iniciales - Azul
      case 'Definición':
      case 'Análisis':
        return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30';
      
      // Etapas de propuesta - Púrpura
      case 'Elaboración Propuesta':
      case 'Propuesta':
      case 'Aprobación Propuesta':
      case 'Aprobación':
        return 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30';
      
      // Etapas de desarrollo - Naranja
      case 'Desarrollo del Requerimiento':
      case 'Desarrollo':
        return 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30';
      
      // Etapas de pruebas - Amarillo (mejorado para legibilidad)
      case 'Despliegue (Pruebas)':
      case 'Plan de Pruebas':
      case 'Ejecución de Pruebas':
      case 'Ejecución Pruebas':
        return 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30';
      
      // Etapas finales - Verde
      case 'Aprobación (Pase)':
      case 'Desplegado':
        return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30';
      
      // Cancelado - Rojo
      case 'Cancelado':
        return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
      
      // Por defecto - Gris
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-900/30';
    }
  };
  
  const uniqueProviders = [...new Set(developments.map(dev => dev.provider))];
  const uniqueStatuses = [...new Set(developments.map(dev => dev.general_status))];
  const uniqueModules = [...new Set(developments.map(dev => dev.module).filter(Boolean))];
  const uniqueResponsibles = [...new Set(developments.map(dev => dev.responsible).filter(Boolean))];

  // Función para agrupar desarrollos
  const groupedDevelopments = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Todos': filteredDevelopments };
    }

    const groups: { [key: string]: Development[] } = {};
    filteredDevelopments.forEach(dev => {
      const groupKey = dev[groupBy] || 'Sin especificar';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(dev);
    });

    return groups;
  }, [filteredDevelopments, groupBy]);

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Mis Desarrollos
            </h1>
            <div className="flex items-center space-x-3">
              {/* Botones de vista */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-neutral-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('list')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeView === 'list'
                      ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Lista
                </button>
                <button
                  onClick={() => setActiveView('phases')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeView === 'phases'
                      ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <GitBranch size={16} className="inline mr-1" />
                  Gestión
                </button>
                <button
                  onClick={() => setActiveView('timeline')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeView === 'timeline'
                      ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Timeline
                </button>
              </div>
              
              
              <button 
                onClick={() => setImportModalOpen(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                <Upload size={20} />
                <span>Importar Excel</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div
            className={`${
              darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
            } border rounded-xl p-6`}
          >
            <div className="space-y-4">
              {/* Fila 1: Búsqueda y Agrupación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative sm:col-span-2 lg:col-span-2">
                  <Search
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      darkMode ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Buscar por ID o nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 pr-4 py-2 w-full rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-500'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                  />
                </div>

                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="none">Sin agrupar</option>
                  <option value="provider">Agrupar por Proveedor</option>
                  <option value="module">Agrupar por Módulo</option>
                  <option value="responsible">Agrupar por Responsable</option>
                </select>
              </div>

              {/* Fila 2: Filtros de Organización */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Proveedores</option>
                  {uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Módulos</option>
                  {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <select
                  value={responsibleFilter}
                  onChange={(e) => setResponsibleFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Responsables</option>
                  {uniqueResponsibles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Estados</option>
                   {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Estadísticas por Organización */}
          {groupBy !== 'none' && (
            <div className={`${
              darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
            } border rounded-xl p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Estadísticas por {groupBy === 'provider' ? 'Proveedor' : groupBy === 'module' ? 'Módulo' : 'Responsable'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groupedDevelopments).map(([groupName, groupDevelopments]) => {
                  const statusCounts = groupDevelopments.reduce((acc, dev) => {
                    acc[dev.general_status] = (acc[dev.general_status] || 0) + 1;
                    return acc;
                  }, {} as { [key: string]: number });

                  return (
                    <div key={groupName} className={`${
                      darkMode ? 'bg-neutral-700' : 'bg-neutral-50'
                    } rounded-lg p-4`}>
                      <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                        {groupName}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>Total:</span>
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                            {groupDevelopments.length}
                          </span>
                        </div>
                        {Object.entries(statusCounts).map(([status, count]) => (
                          <div key={status} className="flex justify-between">
                            <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>{status}:</span>
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contenido Principal - Vista Condicional */}
          <div className="overflow-hidden">
            {/* Vista de Lista */}
            {activeView === 'list' && (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block space-y-6">
                  {Object.entries(groupedDevelopments).map(([groupName, groupDevelopments]) => (
                    <div key={groupName} className="space-y-3">
                      {/* Header del grupo */}
                      {groupBy !== 'none' && (
                        <div className={`${darkMode ? 'bg-neutral-700' : 'bg-neutral-100'} rounded-lg p-3`}>
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                            {groupName} ({groupDevelopments.length} desarrollos)
                          </h3>
                        </div>
                      )}
                      
                      <div className={`${
                        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                      } border rounded-xl overflow-hidden`}>
                        <table className="w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                          <thead className={darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}>
                            <tr>
                              {[
                                { key: 'id', label: 'ID Remedy', width: 'w-32' },
                                { key: 'name', label: 'Nombre Desarrollo', width: 'w-80' },
                                { key: 'provider', label: 'Proveedor', width: 'w-24' },
                                { key: 'responsible', label: 'Responsable', width: 'w-40' },
                                { key: 'general_status', label: 'Estado', width: 'w-24' },
                                { key: 'current_stage', label: 'Progreso', width: 'w-32' },
                                { key: 'actions', label: 'Acciones', width: 'w-20' }
                              ].map(({ key, label, width }) => (
                                <th key={key} scope="col" className={`${width} px-2 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider`}>
                                  {key === 'actions' ? (
                                    label
                                  ) : (
                                    <button
                                      onClick={() => handleSort(key as keyof Development)}
                                      className="flex items-center space-x-1 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                                    >
                                      <span>{label}</span>
                                      <div className="flex flex-col">
                                        <ChevronUp 
                                          size={12} 
                                          className={`${
                                            sortField === key && sortDirection === 'asc' 
                                              ? 'text-primary-500' 
                                              : 'text-neutral-400'
                                          }`} 
                                        />
                                        <ChevronDown 
                                          size={12} 
                                          className={`${
                                            sortField === key && sortDirection === 'desc' 
                                              ? 'text-primary-500' 
                                              : 'text-neutral-400'
                                          }`} 
                                        />
                                      </div>
                                    </button>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {groupDevelopments.map((dev) => (
                              <tr key={dev.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                                <td className="w-32 px-2 py-2 whitespace-nowrap text-xs font-medium text-primary-500 dark:text-primary-400">{dev.id}</td>
                                <td className={`w-80 px-2 py-2 text-xs font-medium ${darkMode ? 'text-white' : 'text-neutral-900'} truncate`} title={dev.name}>{dev.name}</td>
                                <td className={`w-24 px-2 py-2 whitespace-nowrap text-xs ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.provider || 'N/A'}</td>
                                <td className={`w-40 px-2 py-2 text-xs ${darkMode ? 'text-neutral-300' : 'text-neutral-600'} truncate`} title={dev.responsible || 'N/A'}>{dev.responsible || 'N/A'}</td>
                                <td className="w-24 px-2 py-2 whitespace-nowrap text-xs">
                                  <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                                    {dev.general_status}
                                  </span>
                                </td>
                                <td className="w-32 px-2 py-2 text-xs">
                                  <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full truncate ${getProgressColor(typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage || 'N/A')}`} title={typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}>
                                    {typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}
                                  </span>
                                </td>
                                <td className="w-20 px-2 py-2 whitespace-nowrap text-xs font-medium">
                                  <div className="flex items-center justify-center">
                                    <button 
                                      onClick={() => {
                                        console.log('Button clicked for:', dev.id);
                                        handleViewDetails(dev);
                                      }} 
                                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 bg-blue-100 dark:bg-blue-900 p-1 rounded"
                                    >
                                      <Eye size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

            {/* Card View for Tablets and Smaller Laptops */}
            <div className="lg:hidden space-y-6">
              {Object.entries(groupedDevelopments).map(([groupName, groupDevelopments]) => (
                <div key={groupName} className="space-y-4">
                  {/* Header del grupo */}
                  {groupBy !== 'none' && (
                    <div className={`${darkMode ? 'bg-neutral-700' : 'bg-neutral-100'} rounded-lg p-3`}>
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                        {groupName} ({groupDevelopments.length} desarrollos)
                      </h3>
                    </div>
                  )}
                  
                  {groupDevelopments.map((dev) => (
                    <div key={dev.id} className={`${
                      darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                    } border rounded-xl p-4 hover:shadow-md transition-shadow`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                            {dev.name}
                          </h3>
                          <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">{dev.id}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button onClick={() => handleViewDetails(dev)} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300">
                            <Eye size={16} />
                          </button>
                          
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className={`font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Responsable:</span>
                          <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mt-1`}>{dev.responsible || 'N/A'}</p>
                        </div>
                        <div>
                          <span className={`font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Proveedor:</span>
                          <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mt-1`}>{dev.provider || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                          {dev.general_status}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                          {typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
              </>
            )}

            {/* Vista de Fases - Centro de Control Expandido */}
            {activeView === 'phases' && (
              <div className="space-y-6">
                {selectedDevelopment ? (
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
                            onClick={() => handleEdit(selectedDevelopment)}
                            variant="contained"
                            size="medium"
                            className={`${darkMode ? '!bg-neutral-700 hover:!bg-neutral-600 text-white' : '!bg-neutral-200 hover:!bg-neutral-300 !text-neutral-900'} flex items-center space-x-2`}
                          >
                            <SquarePen size={18} />
                            <span>Editar</span>
                          </MaterialButton>
                          {selectedDevelopment.remedy_link && (
                            <MaterialButton
                              onClick={() => window.open(selectedDevelopment.remedy_link, '_blank')}
                              variant="contained"
                              size="medium"
                              className={`${darkMode ? '!bg-blue-700 hover:!bg-blue-600 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'} flex items-center space-x-2`}
                            >
                              <ExternalLink size={18} />
                              <span>Remedy</span>
                            </MaterialButton>
                          )}
                          <MaterialButton
                            onClick={() => handleDelete(selectedDevelopment)}
                            variant="contained"
                            size="medium"
                            className={`${darkMode ? '!bg-red-700 hover:!bg-red-600 text-white' : '!bg-red-600 hover:!bg-red-700 text-white'} flex items-center space-x-2`}
                          >
                            <Trash2 size={18} />
                            <span>Eliminar</span>
                          </MaterialButton>
                          <MaterialButton
                            onClick={() => setActiveView('list')}
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
                          className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            activePhaseTab === 'phases'
                              ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <GitBranch size={16} className="inline mr-2" />
                          Fases
                        </button>
                        <button
                          onClick={() => setActivePhaseTab('gantt')}
                          className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            activePhaseTab === 'gantt'
                              ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <Calendar size={16} className="inline mr-2" />
                          Gantt
                        </button>
                        <button
                          onClick={() => setActivePhaseTab('controls')}
                          className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            activePhaseTab === 'controls'
                              ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <ShieldCheck size={16} className="inline mr-2" />
                          Controles
                        </button>
                        <button
                          onClick={() => setActivePhaseTab('activities')}
                          className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            activePhaseTab === 'activities'
                              ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <ListChecks size={16} className="inline mr-2" />
                          Bitácora
                        </button>
                        <button
                          onClick={() => setActivePhaseTab('requirements')}
                          className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            activePhaseTab === 'requirements'
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
                              // Aquí puedes implementar la lógica para cancelar el desarrollo
                              development.info('Cancelando desarrollo', selectedDevelopment.id);
                              toast.success('Desarrollo cancelado exitosamente');
                              // Recargar los desarrollos después de la cancelación
                              loadDevelopments();
                            } catch (error) {
                              development.error('Error al cancelar desarrollo', error);
                              toast.error('Error al cancelar el desarrollo');
                            }
                          }}
                        />
                      )}
                      
                      {activePhaseTab === 'gantt' && (
                        <HybridGanttChart
                          activities={activities}
                          stages={[]}
                          currentStageId={selectedDevelopment?.current_stage_id}
                          darkMode={darkMode}
                        />
                      )}
                      
                      {activePhaseTab === 'controls' && selectedDevelopment && (
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
                  <ListChecks size={18} className="mr-2"/>
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
                                onSuccess={handleActivitySuccess}
                                onCancel={() => setShowActivityForm(false)}
                              />
                            </div>
                          )}

                          {/* Lista de Actividades Inteligentes */}
                          <div className="space-y-4">
                            {activitiesLoading ? (
                              <div className="text-center p-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Cargando actividades...</p>
                    </div>
                            ) : activities.length > 0 ? (
                              activities.map((activity) => (
                                <MaterialCard key={activity.id} elevation={2} className="p-0" darkMode={darkMode}>
                                  <MaterialCard.Content>
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center space-x-2">
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                                          activity.status === 'completada' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                            : activity.status === 'en_curso'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        }`}>
                                          {activity.status}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          darkMode ? 'bg-neutral-600 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                                        }`}>
                                          {activity.stage_name}
                                        </span>
                                      </div>
                                      <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                        {new Date(activity.created_at).toLocaleDateString()}
                                      </span>
                                    </div>

                                    <div className="mb-3">
                                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                                        {activity.activity_type === 'nueva_actividad' ? 'Nueva Actividad' : 
                                         activity.activity_type === 'seguimiento' ? 'Seguimiento' : 
                                         activity.activity_type === 'cierre_etapa' ? 'Cierre de Etapa' : activity.activity_type}
                                      </p>
                                      <p className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                        Actor: {activity.actor_type === 'equipo_interno' ? 'Equipo Interno' :
                                               activity.actor_type === 'proveedor' ? 'Proveedor' : 'Usuario'}
                                      </p>
                                      {activity.notes && (
                                        <p className={`text-sm mt-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                          {activity.notes}
                                        </p>
                                      )}
                                    </div>

                                    {activity.dynamic_payload && Object.keys(activity.dynamic_payload).length > 0 && (
                                      <div className={`p-3 rounded-md ${
                                        darkMode ? 'bg-neutral-600' : 'bg-neutral-50'
                                      }`}>
                                        <h5 className={`text-sm font-medium mb-2 ${
                                          darkMode ? 'text-neutral-300' : 'text-neutral-700'
                                        }`}>
                                          Detalles específicos:
                                        </h5>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          {Object.entries(activity.dynamic_payload).map(([key, value]) => (
                                            <div key={key}>
                                              <span className={`font-medium ${
                                                darkMode ? 'text-neutral-400' : 'text-neutral-500'
                                              }`}>
                                                {key.replace(/_/g, ' ')}:
                                              </span>
                                              <span className={`ml-1 ${
                                                darkMode ? 'text-neutral-300' : 'text-neutral-600'
                                              }`}>
                                                {String(value)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>Inicio: {new Date(activity.start_date).toLocaleDateString()}</span>
                                        {activity.end_date && (
                                          <span className="ml-3">Fin: {new Date(activity.end_date).toLocaleDateString()}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {activity.next_follow_up_at && (
                                          <span className={`text-xs px-2 py-1 rounded ${
                                            darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800'
                                          }`}>
                                            Seguimiento: {new Date(activity.next_follow_up_at).toLocaleDateString()}
                                          </span>
                                        )}

                                        {activity.status !== 'completada' && (
                                          <MaterialButton
                                            size="small"
                                            variant="contained"
                                            onClick={() => handleCompleteActivity(activity.id)}
                                            className={`${darkMode ? '!bg-green-600 hover:!bg-green-700 text-white' : '!bg-green-600 hover:!bg-green-700 text-white'}`}
                                            aria-label="Marcar como completada"
                                          >
                                            <CheckCircle size={12} />
                                            <span className="ml-1">Completar</span>
                                          </MaterialButton>
                                        )}

                                        <MaterialButton
                                          size="small"
                                          variant="contained"
                                          onClick={() => openEditActivityModal(activity)}
                                          className={`${darkMode ? '!bg-neutral-600 hover:!bg-neutral-700 text-white' : '!bg-neutral-600 hover:!bg-neutral-700 text-white'}`}
                                          aria-label="Editar actividad"
                                        >
                                          <SquarePen size={12} />
                                          <span className="ml-1">Editar</span>
                                        </MaterialButton>

                                        <MaterialButton
                                          size="small"
                                          variant="contained"
                                          onClick={() => openDeleteActivityModal(activity.id)}
                                          className={`${darkMode ? '!bg-red-600 hover:!bg-red-700 text-white' : '!bg-red-600 hover:!bg-red-700 text-white'}`}
                                          aria-label="Eliminar actividad"
                                        >
                                          <Trash2 size={12} />
                                          <span className="ml-1">Eliminar</span>
                                        </MaterialButton>
                                      </div>
                                    </div>
                                  </MaterialCard.Content>
                                </MaterialCard>
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

      {/* Modal de confirmación de eliminación de actividad */}
      {activityDeleteModal.isOpen && (
        <div className={`${darkMode ? 'bg-black/60' : 'bg-black/40'} fixed inset-0 z-50 flex items-center justify-center`}>
          <MaterialCard elevation={8} className="w-full max-w-md" darkMode={darkMode}>
            <MaterialCard.Header>
              <h3 className={`text-lg font-semibold flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                <AlertTriangle size={18} className="mr-2 text-red-500" />
                Confirmar eliminación
              </h3>
            </MaterialCard.Header>
            <MaterialCard.Content>
              <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mb-4`}>
                ¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.
              </p>
              {activityDeleteModal.activity && (
                <div className={`p-3 rounded-md mb-4 ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className="flex items-start">
                    <AlertTriangle size={16} className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'} mr-2 mt-0.5`} />
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                        Esta actividad está en la etapa: <strong>{activityDeleteModal.activity.stage_name}</strong>
                      </p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                        Si eliminas esta actividad, el desarrollo permanecerá en esta etapa.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rollbackCheckbox"
                  checked={shouldRollbackStage}
                  onChange={(e) => setShouldRollbackStage(e.target.checked)}
                  className={`h-4 w-4 rounded ${darkMode ? 'bg-neutral-700 border-neutral-600 text-blue-500' : 'border-neutral-300 text-blue-600'} focus:ring-blue-500`}
                />
                <label htmlFor="rollbackCheckbox" className={`ml-2 text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  También revertir el desarrollo a la etapa anterior
                </label>
              </div>
            </MaterialCard.Content>
            <MaterialCard.Actions>
              <MaterialButton
                variant="outlined"
                color="inherit"
                onClick={cancelDeleteActivity}
              >
                Cancelar
              </MaterialButton>
              <MaterialButton
                variant="contained"
                onClick={confirmDeleteActivity}
                className={`${darkMode ? '!bg-red-600 hover:!bg-red-700 text-white' : '!bg-red-600 hover:!bg-red-700 text-white'}`}
              >
                Eliminar
              </MaterialButton>
            </MaterialCard.Actions>
          </MaterialCard>
        </div>
      )}

      {/* Modal de edición de actividad */}
      {activityEditModal.isOpen && activityEditModal.activity && activityEditModal.form && (
        <div className={`${darkMode ? 'bg-black/60' : 'bg-black/40'} fixed inset-0 z-50 flex items-center justify-center`}>
          <MaterialCard elevation={8} className="w-full max-w-md" darkMode={darkMode}>
            <MaterialCard.Header>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Editar Actividad
              </h3>
            </MaterialCard.Header>
            <MaterialCard.Content>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Estado</label>
                  <select
                    value={activityEditModal.form.status}
                    onChange={(e) => updateActivityEditForm({ status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En Curso</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Fecha de inicio</label>
                    <input
                      type="date"
                      value={activityEditModal.form.start_date || ''}
                      onChange={(e) => updateActivityEditForm({ start_date: e.target.value })}
                      className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Fecha de fin</label>
                    <input
                      type="date"
                      value={activityEditModal.form.end_date || ''}
                      onChange={(e) => updateActivityEditForm({ end_date: e.target.value })}
                      className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Notas</label>
                  <textarea
                    value={activityEditModal.form.notes || ''}
                    onChange={(e) => updateActivityEditForm({ notes: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Próximo seguimiento</label>
                  <input
                    type="date"
                    value={activityEditModal.form.next_follow_up_at || ''}
                    onChange={(e) => updateActivityEditForm({ next_follow_up_at: e.target.value })}
                    className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                  />
                </div>
                {activityEditErrors.length > 0 && (
                  <div className={`p-3 rounded-md ${darkMode ? 'bg-red-900/20 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    <ul className="list-disc pl-5 text-sm">
                      {activityEditErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </MaterialCard.Content>
            <MaterialCard.Actions>
              <MaterialButton variant="outlined" color="inherit" onClick={cancelEditActivity}>Cancelar</MaterialButton>
              <MaterialButton variant="contained" onClick={confirmEditActivity} className={`${darkMode ? '!bg-blue-600 hover:!bg-blue-700 text-white' : '!bg-blue-600 hover:!bg-blue-700 text-white'}`}>Guardar</MaterialButton>
            </MaterialCard.Actions>
          </MaterialCard>
        </div>
      )}
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
                ) : (
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
                )}
              </div>
            )}

            {/* Vista de Timeline */}
            {activeView === 'timeline' && (
              <div className="space-y-6">
                {selectedDevelopment ? (
                  <DevelopmentTimeline 
                    cycleFlow={[]} // Se cargará desde el componente
                    currentDevelopment={selectedDevelopment}
                  />
                ) : (
                  <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
                    <div className="text-center">
                      <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                        Selecciona un Desarrollo
                      </h3>
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Haz clic en un desarrollo de la lista para ver su timeline
                      </p>
            </div>
          </div>
                )}

        </div>
      )}
          </div>
        </div>
      </div>
    
    {/* Panel lateral removido - funcionalidad movida a vista de fases */}
      
      {/* Edit Modal - Material Design */}
      {isEditModalOpen && editingDevelopment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <MaterialCard elevation={8} className="w-full max-w-2xl" darkMode={darkMode}>
            <MaterialCard.Header>
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  Editar Desarrollo
                </h3>
                <MaterialButton
                  variant="text"
                  size="small"
                  onClick={handleCloseModal}
                  className="!p-2"
                >
                  <X size={20} />
                </MaterialButton>
              </div>
            </MaterialCard.Header>
            
            <MaterialCard.Content>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ID Remedy - Read Only */}
                  <MaterialTextField
                    label="ID Remedy"
                    value={editingDevelopment.id}
                    disabled
                    darkMode={darkMode}
                  />
                  
                  {/* Nombre Desarrollo */}
                  <MaterialTextField
                    label="Nombre Desarrollo"
                    name="name"
                    value={editingDevelopment.name}
                    onChange={handleTextFieldChange}
                    darkMode={darkMode}
                    required
                  />
                  
                  {/* Proveedor */}
                  <MaterialTextField
                    label="Proveedor"
                    name="provider"
                    value={editingDevelopment.provider || ''}
                    onChange={handleTextFieldChange}
                    placeholder="Ingrese el proveedor"
                    darkMode={darkMode}
                  />
                  
                  {/* Responsable */}
                  <MaterialTextField
                    label="Responsable"
                    name="responsible"
                    value={editingDevelopment.responsible || ''}
                    onChange={handleTextFieldChange}
                    placeholder="Ingrese el responsable"
                    darkMode={darkMode}
                  />
                  
                  {/* Estado General */}
                  <MaterialSelect
                    label="Estado General"
                    name="general_status"
                    value={editingDevelopment.general_status}
                    onChange={handleSelectChange}
                    darkMode={darkMode}
                    options={generalStatuses.map(status => ({
                      value: status,
                      label: status
                    }))}
                    required
                  />
                  
                  {/* Etapa del Progreso */}
                  <MaterialSelect
                    label="Etapa del Progreso"
                    name="current_stage"
                    value={typeof editingDevelopment.current_stage === 'object' 
                      ? editingDevelopment.current_stage?.stage_name || '1. Definición'
                      : editingDevelopment.current_stage || '1. Definición'
                    }
                    onChange={handleSelectChange}
                    darkMode={darkMode}
                    options={allStagesInOrder.map(stage => ({
                      value: stage,
                      label: stage
                    }))}
                    required
                  />
                </div>
              </form>
            </MaterialCard.Content>
            
            <MaterialCard.Actions>
              <MaterialButton
                variant="outlined"
                color="inherit"
                onClick={handleCloseModal}
                className="mr-3"
              >
                Cancelar
              </MaterialButton>
              <MaterialButton
                variant="contained"
                color="primary"
                onClick={handleSaveDevelopment}
                disabled={updateLoading}
                loading={updateLoading}
              >
                {updateLoading ? 'Guardando...' : 'Guardar Cambios'}
              </MaterialButton>
            </MaterialCard.Actions>
          </MaterialCard>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className={`rounded-lg shadow-xl w-full max-w-4xl ${darkMode ? 'bg-neutral-900' : 'bg-white'}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Importar Desarrollos desde Excel</h3>
                <button onClick={() => setImportModalOpen(false)} className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}>
                  <X size={20} />
                </button>
              </div>
              <ExcelImporter<Partial<Development>>
                onImport={handleImport}
                columnMapping={columnMapping}
                identifierKey="id"
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.development && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className={`rounded-lg shadow-xl w-full max-w-md ${darkMode ? 'bg-neutral-800' : 'bg-white'}`}>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
                <div className="text-center">
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    ¿Eliminar Desarrollo?
                  </h3>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    ¿Estás seguro de que deseas eliminar el desarrollo <strong>"{deleteConfirmModal.development.name}"</strong> ({deleteConfirmModal.development.id})?
                  </p>
                 <p className={`text-xs mb-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                   ⚠️ Esta acción no se puede deshacer. El desarrollo será eliminado permanentemente.
                  </p>
                </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-neutral-600 hover:bg-neutral-500 text-white' 
                      : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDevelopments;
