import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { Filter, Plus, Search, Eye, Edit } from 'lucide-react';

// Sample data based on the provided Excel sheet
const sampleDevelopments = [
  {
    id: 'INC000004924201',
    name: 'Macro De Saldos',
    provider: 'TI',
    requesting_area: 'Tesoreria',
    main_responsible: 'Bricit S.',
    start_date: '2025-07-31',
    estimated_days: 35,
    general_status: 'En curso',
    current_stage: '1. Ajuste de Requerimiento',
  },
  {
    id: 'INC000004775199',
    name: 'Vinculación Inmobiliaria',
    provider: 'Ingesoft',
    requesting_area: 'Negocios 2',
    main_responsible: 'Manuel O.',
    start_date: '2025-02-12',
    estimated_days: 204,
    general_status: 'En curso',
    current_stage: '5. Entrega Desarrollo',
  },
  {
    id: 'INC000004884160',
    name: 'Generación Certificado Patrimonial desde SIFI',
    provider: 'TI',
    requesting_area: 'Negocios 1',
    main_responsible: 'Evelyn M.',
    start_date: '2025-06-20',
    estimated_days: 76,
    general_status: 'En curso',
    current_stage: '5. Entrega Desarrollo',
  },
  {
    id: 'INC000004931942',
    name: 'error ORM',
    provider: 'ORACLE',
    requesting_area: 'Comercial',
    main_responsible: 'Adriana C.',
    start_date: '2025-08-08',
    estimated_days: 27,
    general_status: 'Pendiente',
    current_stage: '2. Reunión de entendimiento',
  },
  {
    id: 'INC000004893354',
    name: 'Calculo de la perdida esperada',
    provider: 'Ingesoft',
    requesting_area: 'Contabilidad',
    main_responsible: 'Maritza F.',
    start_date: '2025-07-02',
    estimated_days: 64,
    general_status: 'Completado',
    current_stage: '8. Certificación Escenarios Prueba',
  },
  {
    id: 'INC000004919670',
    name: 'Modelo Retiro Express FVP',
    provider: 'ITC',
    requesting_area: 'Fondos FVP',
    main_responsible: 'Jhon H.',
    start_date: '2025-07-28',
    estimated_days: 38,
    general_status: 'En curso',
    current_stage: '3. Propuesta Comercial',
  },
];

const MyDevelopments: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredDevelopments = useMemo(() => {
    return sampleDevelopments.filter((dev) => {
      const matchesSearch =
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvider = providerFilter === 'all' || dev.provider === providerFilter;
      const matchesStatus = statusFilter === 'all' || dev.general_status === statusFilter;
      return matchesSearch && matchesProvider && matchesStatus;
    });
  }, [searchTerm, providerFilter, statusFilter]);

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
  
  const uniqueProviders = [...new Set(sampleDevelopments.map(dev => dev.provider))];
  const uniqueStatuses = [...new Set(sampleDevelopments.map(dev => dev.general_status))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Mis Desarrollos
        </h1>
        <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Plus size={20} />
          <span>Nuevo Desarrollo</span>
        </button>
      </div>

      {/* Filters */}
      <div
        className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
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

      {/* Developments Table */}
      <div className="overflow-x-auto">
        <div className="min-w-full inline-block align-middle">
          <div className={`${
              darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
            } border rounded-xl overflow-hidden`}>
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className={darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}>
                <tr>
                  {['ID Remedy', 'Nombre Desarrollo', 'Proveedor', 'Responsable', 'Estado', 'Progreso', 'Acciones'].map(header => (
                     <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                       {header}
                     </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredDevelopments.map((dev) => (
                  <tr key={dev.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-500 dark:text-primary-400">{dev.id}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{dev.name}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.provider}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.main_responsible}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                        {dev.general_status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.current_stage}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"><Eye size={18} /></button>
                        <button className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"><Edit size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyDevelopments;
