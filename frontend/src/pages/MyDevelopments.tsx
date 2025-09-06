import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Search, Eye, Edit, X, Calendar, ListChecks, ShieldCheck, Upload } from 'lucide-react';
import ExcelImporter from '../components/common/ExcelImporter';

type Incident = {
  id: number;
  description: string;
  report_date: string;
  resolution_date?: string;
  status: 'Abierta' | 'Cerrada';
};

// Sample data based on the provided Excel sheet
type Development = {
  id: string;
  name: string;
  provider: string;
  requesting_area: string;
  main_responsible: string;
  start_date: string;
  estimated_end_date: string;
  actual_end_date?: string;
  estimated_days: number;
  general_status: string;
  current_stage: string;
  activities: { date: string; description: string }[];
  incidents: Incident[];
};

const processStages = [
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

const sampleDevelopments: Development[] = [
  {
    id: 'INC000004924201',
    name: 'Macro De Saldos',
    provider: 'TI',
    requesting_area: 'Tesoreria',
    main_responsible: 'Bricit S.',
    start_date: '2025-07-31',
    estimated_end_date: '2025-09-04',
    estimated_days: 35,
    general_status: 'En curso',
    current_stage: '1. Ajuste de Requerimiento',
    activities: [
        { date: '2025-08-01', description: 'Reunión inicial con el equipo de Tesorería.' },
        { date: '2025-08-02', description: 'Se envía borrador de requerimiento para validación.' },
    ],
    incidents: [],
  },
  {
    id: 'INC000004775199',
    name: 'Vinculación Inmobiliaria',
    provider: 'Ingesoft',
    requesting_area: 'Negocios 2',
    main_responsible: 'Manuel O.',
    start_date: '2025-02-12',
    estimated_end_date: '2025-09-12',
    estimated_days: 204,
    general_status: 'En curso',
    current_stage: '5. Entrega Desarrollo',
    activities: [
        { date: '2025-07-15', description: 'Proveedor entrega el ejecutable para pruebas.' },
    ],
    incidents: [
      { id: 1, description: 'Error en el cálculo de intereses moratorios.', report_date: '2025-07-20', status: 'Abierta' },
      { id: 2, description: 'El campo de dirección no acepta caracteres especiales.', report_date: '2025-07-22', resolution_date: '2025-07-25', status: 'Cerrada' },
    ],
  },
  // Add empty activities array to the rest of the sample data
  {
    id: 'INC000004884160',
    name: 'Generación Certificado Patrimonial desde SIFI',
    provider: 'TI',
    requesting_area: 'Negocios 1',
    main_responsible: 'Evelyn M.',
    start_date: '2025-06-20',
    estimated_end_date: '2025-09-04',
    estimated_days: 76,
    general_status: 'En curso',
    current_stage: '5. Entrega Desarrollo',
    activities: [],
    incidents: [],
  },
  {
    id: 'INC000004931942',
    name: 'error ORM',
    provider: 'ORACLE',
    requesting_area: 'Comercial',
    main_responsible: 'Adriana C.',
    start_date: '2025-08-08',
    estimated_end_date: '2025-09-04',
    estimated_days: 27,
    general_status: 'Pendiente',
    current_stage: '2. Reunión de entendimiento',
    activities: [],
    incidents: [],
  },
  {
    id: 'INC000004893354',
    name: 'Calculo de la perdida esperada',
    provider: 'Ingesoft',
    requesting_area: 'Contabilidad',
    main_responsible: 'Maritza F.',
    start_date: '2025-07-02',
    estimated_end_date: '2025-09-03',
    actual_end_date: '2025-09-10',
    estimated_days: 64,
    general_status: 'Completado',
    current_stage: '8. Certificación Escenarios Prueba',
    activities: [],
    incidents: [
        { id: 3, description: 'Descuadre en centavos en la amortización.', report_date: '2025-08-15', resolution_date: '2025-08-20', status: 'Cerrada' }
    ],
  },
  {
    id: 'INC000004919670',
    name: 'Modelo Retiro Express FVP',
    provider: 'ITC',
    requesting_area: 'Fondos FVP',
    main_responsible: 'Jhon H.',
    start_date: '2025-07-28',
    estimated_end_date: '2025-09-04',
    estimated_days: 38,
    general_status: 'En curso',
    current_stage: '3. Propuesta Comercial',
    activities: [],
    incidents: [],
  },
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

// Export for use in other components like Reports
export { sampleDevelopments as initialSampleDevelopments };
export type { Development };

const MyDevelopments: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;
  
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [isImportModalOpen, setImportModalOpen] = useState(false);

  // Load developments from localStorage on initial render
  useEffect(() => {
    try {
      const storedDevelopments = localStorage.getItem('developments');
      if (storedDevelopments) {
        setDevelopments(JSON.parse(storedDevelopments));
      } else {
        // If nothing is in localStorage, initialize with sample data
        setDevelopments(sampleDevelopments);
        localStorage.setItem('developments', JSON.stringify(sampleDevelopments));
      }
    } catch (error) {
      console.error("Failed to parse developments from localStorage", error);
      setDevelopments(sampleDevelopments);
    }
  }, []);

  // Column mapping for the importer - Updated to match your Excel structure
  const columnMapping = {
    'No. de la solicitud': 'id',
    'Cliente Interno': 'name',
    'Asignado a': 'main_responsible',
    'Solicitud Interna requerida': 'requesting_area',
    'Estado': 'general_status',
    'Fecha de envío': 'start_date',
    'Fecha de finalización planificada': 'estimated_end_date',
    // Add more mappings as needed based on your Excel columns
  };

  const handleImport = (importedData: Partial<Development>[]) => {
    const newDevelopments = [...developments];
    let addedCount = 0;

    importedData.forEach(item => {
      // Basic validation
      if (!item.id) return;

      const exists = developments.some(dev => dev.id === item.id);
      if (!exists) {
        // Add default empty values for fields that might be missing from excel
        const fullItem: Development = {
          id: item.id,
          name: item.name ?? 'N/A',
          provider: item.provider ?? 'N/A',
          requesting_area: item.requesting_area ?? 'N/A',
          main_responsible: item.main_responsible ?? 'N/A',
          start_date: item.start_date ? new Date(item.start_date).toISOString() : new Date().toISOString(),
          estimated_end_date: item.estimated_end_date ? new Date(item.estimated_end_date).toISOString() : new Date().toISOString(),
          estimated_days: item.estimated_days ?? 0,
          general_status: item.general_status ?? 'Pendiente',
          current_stage: item.current_stage ?? '1. Definición',
          activities: [],
          incidents: [],
          ...item,
        };
        newDevelopments.push(fullItem);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setDevelopments(newDevelopments);
      localStorage.setItem('developments', JSON.stringify(newDevelopments));
      alert(`${addedCount} nuevo(s) desarrollo(s) importado(s) exitosamente.`);
    } else {
      alert('No se encontraron nuevos desarrollos para importar. Los IDs ya existen.');
    }
    
    setImportModalOpen(false);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedDevelopment, setSelectedDevelopment] = useState<Development | null>(null);
  const [isViewPanelOpen, setViewPanelOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState('');
  const [editingDevelopment, setEditingDevelopment] = useState<Development | null>(null);

  const handleAddActivity = () => {
    if (newActivity.trim() && selectedDevelopment) {
      const updatedDevelopment = {
        ...selectedDevelopment,
        activities: [
          ...selectedDevelopment.activities,
          { date: new Date().toISOString().split('T')[0], description: newActivity.trim() },
        ],
      };
      setSelectedDevelopment(updatedDevelopment);
      // Here we would also update the main list
      // For now, it only updates in the panel view
      setNewActivity('');
    }
  };

  const handleViewDetails = (dev: Development) => {
    setSelectedDevelopment(dev);
    setViewPanelOpen(true);
  };
  
  const handleEdit = (dev: Development) => {
    setSelectedDevelopment(dev);
    setEditingDevelopment(dev); // Keep a copy for the form
    setEditModalOpen(true);
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


  const filteredDevelopments = useMemo(() => {
    return developments.filter((dev) => {
      const matchesSearch =
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvider = providerFilter === 'all' || dev.provider === providerFilter;
      const matchesStatus = statusFilter === 'all' || dev.general_status === statusFilter;
      return matchesSearch && matchesProvider && matchesStatus;
    });
  }, [searchTerm, providerFilter, statusFilter, developments]);

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

  return (
    <div className="flex h-full">
      <div className={`flex-1 transition-all duration-300 ${isViewPanelOpen ? 'lg:mr-80 xl:mr-96' : ''}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Mis Desarrollos
            </h1>
            <button 
              onClick={() => setImportModalOpen(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
              <Upload size={20} />
              <span>Importar Excel</span>
            </button>
          </div>

          {/* Filters */}
          <div
            className={`${
              darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
            } border rounded-xl p-6`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Developments Table - Responsive Design */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className={`${
                  darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                } border rounded-xl overflow-hidden`}>
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className={darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}>
                    <tr>
                      {['ID Remedy', 'Nombre Desarrollo', 'Proveedor', 'Responsable', 'Estado', 'Progreso', 'Acciones'].map(header => (
                         <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                           {header}
                         </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {filteredDevelopments.map((dev) => (
                      <tr key={dev.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-500 dark:text-primary-400">{dev.id}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{dev.name}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.provider}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.main_responsible}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                            {dev.general_status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.current_stage}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button onClick={() => handleViewDetails(dev)} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"><Eye size={18} /></button>
                            <button onClick={() => handleEdit(dev)} className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"><Edit size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card View for Tablets and Smaller Laptops */}
            <div className="lg:hidden space-y-4">
              {filteredDevelopments.map((dev) => (
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
                      <button onClick={() => handleEdit(dev)} className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300">
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className={`font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Responsable:</span>
                      <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mt-1`}>{dev.main_responsible}</p>
                    </div>
                    <div>
                      <span className={`font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Proveedor:</span>
                      <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mt-1`}>{dev.provider}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                      {dev.general_status}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {dev.current_stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    
    {/* Side Panel for Viewing Details - Responsive */}
      {isViewPanelOpen && selectedDevelopment && (
        <div className={`fixed top-0 right-0 h-full shadow-xl z-50 transition-transform transform ${isViewPanelOpen ? 'translate-x-0' : 'translate-x-full'} ${darkMode ? 'bg-neutral-900 border-l border-neutral-700' : 'bg-white border-l'} w-full md:w-96 lg:w-80 xl:w-96`}>
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Centro de Control
              </h2>
              <button onClick={() => setViewPanelOpen(false)} className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}>
                <X size={20} className={darkMode ? 'text-neutral-400' : 'text-neutral-600'}/>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Main Info */}
              <div>
                <span className={`font-semibold ${darkMode ? 'text-primary-400' : 'text-primary-600'}`}>{selectedDevelopment.id}</span>
                <h3 className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{selectedDevelopment.name}</h3>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-b py-4 border-neutral-200 dark:border-neutral-700">
                <div>
                  <label className="text-xs text-neutral-500 dark:text-neutral-400">Estado</label>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{selectedDevelopment.general_status}</p>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 dark:text-neutral-400">Progreso</label>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{selectedDevelopment.current_stage}</p>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 dark:text-neutral-400">Proveedor</label>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{selectedDevelopment.provider}</p>
                </div>
                 <div>
                  <label className="text-xs text-neutral-500 dark:text-neutral-400">Responsable</label>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{selectedDevelopment.main_responsible}</p>
                </div>
              </div>

              {/* Cronograma de Hitos */}
              <div>
                <h4 className={`text-lg font-semibold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  <Calendar size={18} className="mr-2"/>
                  Cronograma de Hitos
                </h4>
                <div className="text-center p-4 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
                   <p className="text-sm text-neutral-500 dark:text-neutral-400">El cronograma interactivo (Gantt) se mostrará aquí.</p>
                </div>
              </div>

              {/* Quality Controls */}
              {(() => {
                const stagePrefix = selectedDevelopment.current_stage.split('.')[0];
                const currentProcessStage = processStages.find(s => s.stagePrefixes.includes(stagePrefix));

                return (
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      <ShieldCheck size={18} className="mr-2"/>
                      Controles de Calidad ({currentProcessStage ? currentProcessStage.name : 'Etapa sin controles'})
                    </h4>
                    {currentProcessStage && currentProcessStage.controls.length > 0 ? (
                      <div className="space-y-4">
                        {currentProcessStage.controls.map((control, index) => (
                          <div key={index} className={`p-4 rounded-lg ${darkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                            <div className="flex items-start">
                              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                              <div className="ml-3">
                                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{control.code}</p>
                                <p className={`text-sm mt-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                  {control.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          No hay controles de calidad definidos para esta etapa.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Bitácora de Actividades */}
              <div>
                <h4 className={`text-lg font-semibold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  <ListChecks size={18} className="mr-2"/>
                  Bitácora de Actividades
                </h4>
                {/* Activity Input */}
                <div className="mb-4">
                  <textarea
                    rows={3}
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="Registrar nueva actividad o seguimiento..."
                    className={`w-full p-2 rounded text-sm ${darkMode ? 'bg-neutral-800 text-white border-neutral-600' : 'bg-white border-neutral-300'}`}
                  />
                  <button onClick={handleAddActivity} className="w-full mt-2 px-4 py-2 text-sm rounded bg-primary-500 text-white hover:bg-primary-600">
                    Registrar Actividad
                  </button>
                </div>

                 {/* Activity List */}
                <div className="space-y-3">
                  {selectedDevelopment.activities.length > 0 ? (
                    selectedDevelopment.activities.slice().reverse().map((activity, index) => (
                      <div key={index} className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{activity.description}</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>{new Date(activity.date).toLocaleDateString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-4 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
                       <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay actividades registradas.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
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
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Estado General</label>
                     <select name="general_status" value={editingDevelopment.general_status} onChange={handleFormChange} className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white border'}`}>
                       {generalStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>Etapa del Progreso</label>
                    <select name="current_stage" value={editingDevelopment.current_stage} onChange={handleFormChange} className={`w-full p-2 rounded ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white border'}`}>
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
                  <button type="submit" className="px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600">
                    Guardar Cambios
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
    </div>
  );
};

export default MyDevelopments;
