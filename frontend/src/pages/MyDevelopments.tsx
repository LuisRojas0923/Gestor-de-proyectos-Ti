import { Calendar, Eye, GitBranch, ListChecks, Search, ShieldCheck, SquarePen, Upload, X, Trash2, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ExcelImporter from '../components/common/ExcelImporter';
import { DevelopmentTimeline } from '../components/development';
import { DevelopmentTimelineCompact } from '../components/molecules';
import RequirementsTab from '../components/development/RequirementsTab';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { useDevelopmentUpdates } from '../hooks/useDevelopmentUpdates';
import { useObservations } from '../hooks/useObservations';
import { DevelopmentWithCurrentStatus } from '../types';
import QualityControlsTab from '../components/development/QualityControlsTab';

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


// Updated stages with grouping
const executionStages = [
  '1. Definición',
  '2. Análisis',
  '5. Desarrollo',
  '6. Despliegue (Pruebas)',
  '7. Plan de Pruebas',
  '8. Ejecución Pruebas',
];

const waitingStages = [
  '3. Propuesta',
  '4. Aprobación',
  '9. Aprobación (Pase)',
];

const finalStages = [
  '10. Desplegado',
  '0. Cancelado',
];

const generalStatuses = ['Pendiente', 'En curso', 'Completado', 'Cancelado'];

const MyDevelopments: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { get } = useApi();
  
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; development: Development | null }>({
    isOpen: false,
    development: null
  });

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
  const [newActivity, setNewActivity] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'phases' | 'timeline'>('list');
  const [editingDevelopment, setEditingDevelopment] = useState<Development | null>(null);
  const [activePhaseTab, setActivePhaseTab] = useState<'phases' | 'gantt' | 'controls' | 'activities' | 'requirements'>('phases');
  // Removido: ahora solo usamos la vista de timeline

  // Hooks para observaciones y actualizaciones
  const { 
    observations, 
    loading: observationsLoading, 
    error: observationsError, 
    createObservation, 
    refreshObservations 
  } = useObservations(selectedDevelopment?.id || null);
  
  const { 
    loading: updateLoading, 
    updateDevelopment 
  } = useDevelopmentUpdates();

  const handleAddActivity = async () => {
    if (newActivity.trim() && selectedDevelopment) {
      try {
        const result = await createObservation({
          observation_type: 'seguimiento',
          content: newActivity.trim(),
          author: 'Usuario Actual', // TODO: Obtener del contexto de auth
          is_current: true
        });
        
        if (result) {
          setNewActivity('');
          // Recargar observaciones
          await refreshObservations();
        }
      } catch (error) {
        console.error('Error adding activity:', error);
        toast.error('Error al agregar la actividad');
      }
    }
  };

  const handleViewDetails = (dev: Development) => {
    console.log('Opening details for:', dev);
    setSelectedDevelopment(dev);
    setActiveView('phases'); // Cambiar automáticamente a vista de fases
    console.log('Switching to phases view for:', dev.id);
  };
  
  const handleEdit = (dev: Development) => {
    setSelectedDevelopment(dev);
    setEditingDevelopment(dev); // Keep a copy for the form
    setEditModalOpen(true);
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      // Mapear el nombre de la etapa al ID correspondiente
      const stageNameToId: { [key: string]: number } = {
        '1. Definición': 1,
        '2. Análisis': 2,
        '3. Propuesta': 7,
        '4. Aprobación': 8,
        '5. Desarrollo': 3,
        '6. Despliegue (Pruebas)': 4,
        '7. Plan de Pruebas': 5,
        '8. Ejecución Pruebas': 6,
        '9. Aprobación (Pase)': 9,
        '10. Desplegado': 10,
        '0. Cancelado': 11
      };

      const currentStageName = typeof editingDevelopment.current_stage === 'object' 
        ? editingDevelopment.current_stage?.stage_name || '1. Definición'
        : editingDevelopment.current_stage || '1. Definición';
      
      const currentStageId = stageNameToId[currentStageName] || 1;

      const result = await updateDevelopment(editingDevelopment.id, {
        name: editingDevelopment.name,
        description: editingDevelopment.description,
        general_status: editingDevelopment.general_status,
        provider: editingDevelopment.provider,
        current_stage_id: currentStageId
      });

      if (result) {
        // Recargar la lista de desarrollos para obtener los datos actualizados
        await loadDevelopments();
        
        // Cerrar modal
        setEditModalOpen(false);
        setEditingDevelopment(null);
        
        toast.success('Desarrollo actualizado exitosamente');
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
                        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                          <thead className={darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}>
                            <tr>
                              {[
                                { key: 'id', label: 'ID Remedy' },
                                { key: 'name', label: 'Nombre Desarrollo' },
                                { key: 'provider', label: 'Proveedor' },
                                { key: 'responsible', label: 'Responsable' },
                                { key: 'general_status', label: 'Estado' },
                                { key: 'current_stage', label: 'Progreso' },
                                { key: 'actions', label: 'Acciones' }
                              ].map(({ key, label }) => (
                                <th key={key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
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
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-500 dark:text-primary-400">{dev.id}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{dev.name}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.provider || 'N/A'}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.responsible || 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                                    {dev.general_status}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                  {typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    <button 
                                      onClick={() => {
                                        console.log('Button clicked for:', dev.id);
                                        handleViewDetails(dev);
                                      }} 
                                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 bg-blue-100 dark:bg-blue-900 p-1 rounded"
                                    >
                                      <Eye size={18} />
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
                          <button 
                            onClick={() => handleEdit(selectedDevelopment)}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                              darkMode 
                                ? 'bg-neutral-700 hover:bg-neutral-600 text-white' 
                                : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'
                            }`}
                          >
                            <SquarePen size={18} />
                            <span>Editar</span>
                          </button>
                          {selectedDevelopment.remedy_link && (
                            <button 
                              onClick={() => window.open(selectedDevelopment.remedy_link, '_blank')}
                              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                                darkMode 
                                  ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                                  : 'bg-blue-200 hover:bg-blue-300 text-blue-900'
                              }`}
                            >
                              <ExternalLink size={18} />
                              <span>Remedy</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(selectedDevelopment)}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                              darkMode 
                                ? 'bg-red-700 hover:bg-red-600 text-white' 
                                : 'bg-red-200 hover:bg-red-300 text-red-900'
                            }`}
                          >
                            <Trash2 size={18} />
                            <span>Eliminar</span>
                          </button>
                          <button 
                            onClick={() => setActiveView('list')}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              darkMode 
                                ? 'bg-neutral-700 hover:bg-neutral-600 text-white' 
                                : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'
                            }`}
                          >
                            ← Volver a Lista
              </button>
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
                          Gestión
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
                          currentStage={typeof selectedDevelopment.current_stage === 'object' 
                            ? parseInt(selectedDevelopment.current_stage?.stage_name?.split('.')[0] || '1')
                            : parseInt(String(selectedDevelopment.current_stage || '1').split('.')[0])
                          }
                          darkMode={darkMode}
                          isCancelled={selectedDevelopment.general_status === 'Cancelado'}
                          onCancel={async () => {
                            try {
                              // Aquí puedes implementar la lógica para cancelar el desarrollo
                              console.log('Cancelando desarrollo:', selectedDevelopment.id);
                              toast.success('Desarrollo cancelado exitosamente');
                              // Recargar los desarrollos después de la cancelación
                              loadDevelopments();
                            } catch (error) {
                              console.error('Error al cancelar desarrollo:', error);
                              toast.error('Error al cancelar el desarrollo');
                            }
                          }}
                        />
                      )}
                      
                      {activePhaseTab === 'gantt' && (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
                          <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                            Diagrama de Gantt
                          </h3>
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            El cronograma interactivo se mostrará aquí cuando se implementen los endpoints correspondientes.
                          </p>
              </div>
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
                          <h4 className={`text-lg font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  <ListChecks size={18} className="mr-2"/>
                  Bitácora de Actividades
                </h4>
                          
                {/* Activity Input */}
                          <div className="mb-6">
                  <textarea
                    rows={3}
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="Registrar nueva actividad o seguimiento..."
                              className={`w-full p-3 rounded-lg text-sm border ${
                                darkMode 
                                  ? 'bg-neutral-700 text-white border-neutral-600' 
                                  : 'bg-white border-neutral-300'
                              }`}
                            />
                            <button 
                              onClick={handleAddActivity} 
                              className="w-full mt-3 px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                            >
                    Registrar Actividad
                  </button>
                </div>

                 {/* Activity List */}
                <div className="space-y-3">
                  {observationsLoading ? (
                    <div className="text-center p-4">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Cargando actividades...</p>
                    </div>
                  ) : observationsError ? (
                    <div className="text-center p-4 border-2 border-dashed rounded-lg border-red-300 dark:border-red-700">
                      <p className="text-sm text-red-500 dark:text-red-400">Error: {observationsError}</p>
                    </div>
                  ) : observations && observations.length > 0 ? (
                    observations.filter(observation => observation != null).map((observation) => (
                                <div key={observation.id} className={`p-4 rounded-lg text-sm ${darkMode ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
                                  <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                            {observation?.observation_type || 'Sin tipo'}
                          </span>
                          {observation.author && (
                            <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              {observation.author}
                            </span>
                          )}
                        </div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{observation?.content || 'Sin contenido'}</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {observation?.observation_date ? new Date(observation.observation_date).toLocaleDateString() : 'Sin fecha'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
                       <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay actividades registradas.</p>
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
      
      {/* Edit Modal */}
      {isEditModalOpen && editingDevelopment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-2xl`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Editar Desarrollo</h3>
                <button onClick={handleCloseModal} className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>ID Remedy</label>
                    <input type="text" value={editingDevelopment.id} disabled className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-neutral-400' : 'bg-neutral-200 text-neutral-500'}`} />
                  </div>
                   <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Nombre Desarrollo</label>
                    <input type="text" name="name" value={editingDevelopment.name} onChange={handleFormChange} className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white border'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Proveedor</label>
                    <input type="text" name="provider" value={editingDevelopment.provider || ''} onChange={handleFormChange} className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white border'}`} placeholder="Ingrese el proveedor" />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Responsable</label>
                    <input type="text" name="responsible" value={editingDevelopment.responsible || ''} onChange={handleFormChange} className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white border'}`} placeholder="Ingrese el responsable" />
                  </div>
                   <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Estado General</label>
                     <select name="general_status" value={editingDevelopment.general_status} onChange={handleFormChange} className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white border'}`}>
                       {generalStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Etapa del Progreso</label>
                    <select name="current_stage" value={typeof editingDevelopment.current_stage === 'object' ? editingDevelopment.current_stage?.stage_name || '1. Definición' : editingDevelopment.current_stage || '1. Definición'} onChange={handleFormChange} className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white border'}`}>
                       <optgroup label="--- EN EJECUCIÓN ---">
                         {executionStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                       </optgroup>
                       <optgroup label="--- EN ESPERA ---">
                         {waitingStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                       </optgroup>
                       <optgroup label="--- FINALES / OTROS ---">
                         {finalStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                       </optgroup>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleCloseModal} className={`px-4 py-2 rounded ${darkMode ? 'bg-neutral-600 hover:bg-neutral-500' : 'bg-neutral-200 hover:bg-neutral-300'}`}>
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveDevelopment}
                    disabled={updateLoading}
                    className="px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
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
