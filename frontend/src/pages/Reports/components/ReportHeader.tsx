import React from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { 
  MaterialButton, 
  MaterialTextField, 
  MaterialSelect,
  MaterialTypography 
} from '../../../components/atoms';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  status?: string;
  provider?: string;
  module?: string;
}

export interface ReportHeaderProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onExport: (format: 'pdf' | 'csv' | 'excel') => void;
  onRefresh: () => void;
  loading: boolean;
  darkMode: boolean;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({
  filters,
  onFiltersChange,
  onExport,
  onRefresh,
  loading,
  darkMode,
}) => {

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      startDate: '',
      endDate: '',
      status: '',
      provider: '',
      module: '',
    });
  };

  return (
    <div className={`${
      darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
    } border rounded-xl p-6 mb-6`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Título */}
        <div>
          <MaterialTypography variant="h4" darkMode={darkMode} className="mb-2">
            📊 Centro de Reportes
          </MaterialTypography>
          <MaterialTypography variant="body2" darkMode={darkMode} className="text-neutral-600 dark:text-neutral-400">
            Análisis completo de desarrollos, calidad y rendimiento
          </MaterialTypography>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1 lg:max-w-2xl">
          <MaterialTextField
            label="Fecha Inicio"
            type="text"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            darkMode={darkMode}
            className="min-w-[140px]"
          />
          
          <MaterialTextField
            label="Fecha Fin"
            type="text"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            darkMode={darkMode}
            className="min-w-[140px]"
          />
          
          <MaterialSelect
            label="Estado"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'en_progreso', label: 'En Progreso' },
              { value: 'completado', label: 'Completado' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'cancelado', label: 'Cancelado' },
            ]}
            darkMode={darkMode}
            className="min-w-[140px]"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-2">
          <MaterialButton
            variant="outlined"
            color="secondary"
            icon={RefreshCw}
            onClick={onRefresh}
            disabled={loading}
            darkMode={darkMode}
          >
            Actualizar
          </MaterialButton>
          
          <MaterialButton
            variant="outlined"
            color="secondary"
            icon={FileText}
            onClick={() => onExport('pdf')}
            darkMode={darkMode}
          >
            PDF
          </MaterialButton>
          
          <MaterialButton
            variant="outlined"
            color="secondary"
            icon={Download}
            onClick={() => onExport('csv')}
            darkMode={darkMode}
          >
            CSV
          </MaterialButton>
          
          <MaterialButton
            variant="outlined"
            color="secondary"
            icon={Download}
            onClick={() => onExport('excel')}
            darkMode={darkMode}
          >
            Excel
          </MaterialButton>
        </div>
      </div>

      {/* Filtros adicionales */}
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-wrap gap-4 items-center">
          <MaterialTypography variant="body2" darkMode={darkMode} className="text-neutral-600 dark:text-neutral-400">
            Filtros adicionales:
          </MaterialTypography>
          
          <MaterialSelect
            label="Proveedor"
            value={filters.provider || ''}
            onChange={(e) => handleFilterChange('provider', e.target.value)}
            options={[
              { value: '', label: 'Todos los proveedores' },
              { value: 'interno', label: 'Interno' },
              { value: 'externo', label: 'Externo' },
            ]}
            darkMode={darkMode}
            className="min-w-[140px]"
          />
          
          <MaterialSelect
            label="Módulo"
            value={filters.module || ''}
            onChange={(e) => handleFilterChange('module', e.target.value)}
            options={[
              { value: '', label: 'Todos los módulos' },
              { value: 'core', label: 'Core' },
              { value: 'integration', label: 'Integración' },
              { value: 'ui', label: 'Interfaz' },
            ]}
            darkMode={darkMode}
            className="min-w-[140px]"
          />
          
          <MaterialButton
            variant="text"
            color="secondary"
            onClick={clearFilters}
            darkMode={darkMode}
            className="text-sm"
          >
            Limpiar filtros
          </MaterialButton>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;
