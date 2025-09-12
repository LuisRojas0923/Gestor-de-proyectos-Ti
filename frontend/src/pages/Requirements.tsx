import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList as List } from 'react-window';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';

// Type definition for a requirement
interface Requirement {
  id: number;
  external_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_user_id: number | null;
  created_at: string;
  updated_at: string;
}

const Requirements: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;
  const api = useApi();

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        const response = await api.get('/requirements');
        setRequirements(response);
        setError(null);
      } catch (err) {
        setError('Failed to fetch requirements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [api]);

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           req.external_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchTerm, statusFilter, priorityFilter, requirements]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="text-blue-500" size={16} />;
      case 'validated': return <CheckCircle className="text-green-500" size={16} />;
      case 'testing': return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'completed': return <CheckCircle className="text-green-600" size={16} />;
      case 'rejected': return <AlertTriangle className="text-red-500" size={16} />;
      default: return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const requirement = filteredRequirements[index];
    
    return (
      <div style={style} className="px-4">
        <div className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750' : 'bg-white border-neutral-200 hover:bg-neutral-50'
        } border rounded-lg p-4 mb-2 transition-all cursor-pointer`}
        onClick={() => {
          setSelectedRequirement(requirement);
          setSidebarOpen(true);
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {getStatusIcon(requirement.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {requirement.external_id}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(requirement.priority)}`}>
                    {t(requirement.priority)}
                  </span>
                </div>
                <h3 className={`font-medium mt-1 truncate ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {requirement.title}
                </h3>
                <div className={`flex items-center space-x-4 text-sm mt-2 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  <span>Asignado a: {requirement.assigned_user_id || 'N/A'}</span>
                  <span>Vence: {requirement.due_date ? new Date(requirement.due_date).toLocaleDateString() : 'N/A'}</span>
                  <span>Controles: N/A</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
              }`}>
                <Eye size={16} />
              </button>
              <button className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
              }`}>
                <Edit size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'mr-96' : ''} transition-all duration-300`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {t('requirements')}
            </h1>
            <div className="flex items-center space-x-4">
              <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                <Plus size={20} />
                <span>Nuevo Requerimiento</span>
              </button>
              <button className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
              }`}>
                <Download size={20} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={`${
            darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
          } border rounded-xl p-6`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  darkMode ? 'text-neutral-400' : 'text-neutral-500'
                }`} size={20} />
                <input
                  type="text"
                  placeholder={t('search')}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="new">{t('new')}</option>
                <option value="validated">{t('validated')}</option>
                <option value="testing">{t('testing')}</option>
                <option value="completed">{t('completed')}</option>
                <option value="rejected">{t('rejected')}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
              >
                <option value="all">{t('allPriorities')}</option>
                <option value="high">{t('high')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="low">{t('low')}</option>
              </select>

              <div className={`text-sm flex items-center ${
                darkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}>
                <Filter size={16} className="mr-2" />
                {filteredRequirements.length} de {requirements.length} requerimientos
              </div>
            </div>
          </div>

          {/* Virtualized List */}
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && (
            <div className={`${
              darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
            } border rounded-xl overflow-hidden`}>
              <List
                height={600}
                itemCount={filteredRequirements.length}
                itemSize={120}
              >
                {Row}
              </List>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Detail Panel */}
      {sidebarOpen && selectedRequirement && (
        <div className={`fixed right-0 top-0 h-full w-96 ${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border-l shadow-xl z-50 overflow-y-auto transition-transform`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Detalle del Requerimiento
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
                }`}
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <span className={`text-lg font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {selectedRequirement.external_id}
                </span>
                <h3 className={`text-xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {selectedRequirement.title}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                    Estado
                  </label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedRequirement.status)}
                    <span className={darkMode ? 'text-white' : 'text-neutral-900'}>
                      {t(selectedRequirement.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                    Prioridad
                  </label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedRequirement.priority)}`}>
                    {t(selectedRequirement.priority)}
                  </span>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  Descripción
                </label>
                <p className={`${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {selectedRequirement.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                    Asignado a
                  </label>
                  <span className={darkMode ? 'text-white' : 'text-neutral-900'}>
                    {selectedRequirement.assigned_user_id || 'N/A'}
                  </span>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                    Fecha límite
                  </label>
                  <span className={darkMode ? 'text-white' : 'text-neutral-900'}>
                    {selectedRequirement.due_date ? new Date(selectedRequirement.due_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  Controles Aplicables
                </label>
                <div className="flex flex-wrap gap-2">
                    {/* Placeholder for controls */}
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      N/A
                    </span>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors">
                  Validar FD-FT-284
                </button>
                <button className="w-full bg-secondary-500 hover:bg-secondary-600 text-white px-4 py-2 rounded-lg transition-colors">
                  Generar Correo
                </button>
                <button className={`w-full border px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'border-neutral-600 text-neutral-300 hover:bg-neutral-700'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}>
                  Ejecutar Controles IA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requirements;