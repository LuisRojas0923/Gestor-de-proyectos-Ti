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
import { useApi } from '../../hooks/useApi';
import { Button, Input, Select } from '../atoms';

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

interface RequirementsTabProps {
  developmentId: string;
  darkMode: boolean;
}

const RequirementsTab: React.FC<RequirementsTabProps> = ({ developmentId, darkMode }) => {
  const { t } = useTranslation();
  const api = useApi();

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // TODO: Implementar endpoint específico para requerimientos de un desarrollo
        // const response = await api.get(`/developments/${developmentId}/requirements`);
        // Por ahora usamos datos mock
        const mockRequirements: Requirement[] = [
          {
            id: 1,
            external_id: 'FD-FT-284',
            title: 'Implementación de validación de datos',
            description: 'Desarrollar validación de datos de entrada para el módulo de usuarios',
            status: 'validated',
            priority: 'high',
            due_date: '2025-02-15',
            assigned_user_id: 1,
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-20T14:30:00Z',
          },
          {
            id: 2,
            external_id: 'FD-FT-285',
            title: 'Optimización de consultas SQL',
            description: 'Mejorar rendimiento de consultas en el módulo de reportes',
            status: 'testing',
            priority: 'medium',
            due_date: '2025-02-20',
            assigned_user_id: 2,
            created_at: '2025-01-16T09:00:00Z',
            updated_at: '2025-01-21T16:45:00Z',
          },
        ];
        setRequirements(mockRequirements);
        setError(null);
      } catch (err) {
        setError('Failed to fetch requirements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [api, developmentId]);

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
        <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750' : 'bg-white border-neutral-200 hover:bg-neutral-50'
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
              <Button
                variant="ghost"
                size="sm"
                icon={Eye}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRequirement(requirement);
                  setSidebarOpen(true);
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={Edit}
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar edición
                }}
              />
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
            <h4 className={`text-lg font-semibold flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              <Search size={18} className="mr-2" />
              Requerimientos del Desarrollo
            </h4>
            <div className="flex items-center space-x-4">
              <Button
                icon={Plus}
                onClick={() => { }} // TODO
              >
                Nuevo Requerimiento
              </Button>
              <Button
                variant="outline"
                icon={Download}
                onClick={() => { }} // TODO
              />
            </div>
          </div>

          {/* Filters */}
          <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
            } border rounded-xl p-6`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <Input
                placeholder={t('search')}
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('allStatuses') },
                  { value: 'new', label: t('new') },
                  { value: 'validated', label: t('validated') },
                  { value: 'testing', label: t('testing') },
                  { value: 'completed', label: t('completed') },
                  { value: 'rejected', label: t('rejected') }
                ]}
              />

              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('allPriorities') },
                  { value: 'high', label: t('high') },
                  { value: 'medium', label: t('medium') },
                  { value: 'low', label: t('low') }
                ]}
              />

              <div className={`text-sm flex items-center h-10 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
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
            <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
              } border rounded-xl overflow-hidden`}>
              <List
                height={400}
                itemCount={filteredRequirements.length}
                itemSize={120}
                width="100%"
              >
                {Row}
              </List>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Detail Panel */}
      {sidebarOpen && selectedRequirement && (
        <div className={`fixed right-0 top-0 h-full w-96 ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
          } border-l shadow-xl z-50 overflow-y-auto transition-transform`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                Detalle del Requerimiento
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                ×
              </Button>
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
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
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
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                    Prioridad
                  </label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedRequirement.priority)}`}>
                    {t(selectedRequirement.priority)}
                  </span>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                  Descripción
                </label>
                <p className={`${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {selectedRequirement.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                    Asignado a
                  </label>
                  <span className={darkMode ? 'text-white' : 'text-neutral-900'}>
                    {selectedRequirement.assigned_user_id || 'N/A'}
                  </span>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                    Fecha límite
                  </label>
                  <span className={darkMode ? 'text-white' : 'text-neutral-900'}>
                    {selectedRequirement.due_date ? new Date(selectedRequirement.due_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                  Controles Aplicables
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* Placeholder for controls */}
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                    N/A
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Button
                  fullWidth
                  onClick={() => { }}
                >
                  Validar {selectedRequirement.external_id}
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => { }}
                >
                  Generar Correo
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => { }}
                >
                  Ejecutar Controles IA
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsTab;
