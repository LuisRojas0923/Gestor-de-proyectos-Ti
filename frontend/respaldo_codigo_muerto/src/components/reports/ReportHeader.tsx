import React from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  MaterialCard,
  Text
} from '../atoms';

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
    <MaterialCard className="p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Título */}
        <div>
          <Text as="h2" variant="h4" color="text-primary" className="mb-2">
            📊 Centro de Reportes
          </Text>
          <Text as="p" variant="body2" color="gray">
            Análisis completo de desarrollos, calidad y rendimiento
          </Text>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1 lg:max-w-2xl">
          <Input
            label="Fecha Inicio"
            type="text"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="min-w-[140px]"
          />

          <Input
            label="Fecha Fin"
            type="text"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="min-w-[140px]"
          />

          <Select
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
            className="min-w-[140px]"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={onRefresh}
            disabled={loading}
          >
            Actualizar
          </Button>

          <Button
            variant="outline"
            icon={FileText}
            onClick={() => onExport('pdf')}
          >
            PDF
          </Button>

          <Button
            variant="outline"
            icon={Download}
            onClick={() => onExport('csv')}
          >
            CSV
          </Button>

          <Button
            variant="outline"
            icon={Download}
            onClick={() => onExport('excel')}
          >
            Excel
          </Button>
        </div>
      </div>

      {/* Filtros adicionales */}
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-wrap gap-4 items-center">
          <Text as="p" variant="body2" color="gray">
            Filtros adicionales:
          </Text>

          <Select
            label="Proveedor"
            value={filters.provider || ''}
            onChange={(e) => handleFilterChange('provider', e.target.value)}
            options={[
              { value: '', label: 'Todos los proveedores' },
              { value: 'interno', label: 'Interno' },
              { value: 'externo', label: 'Externo' },
            ]}
            className="min-w-[140px]"
          />

          <Select
            label="Módulo"
            value={filters.module || ''}
            onChange={(e) => handleFilterChange('module', e.target.value)}
            options={[
              { value: '', label: 'Todos los módulos' },
              { value: 'core', label: 'Core' },
              { value: 'integration', label: 'Integración' },
              { value: 'ui', label: 'Interfaz' },
            ]}
            className="min-w-[140px]"
          />

          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-sm"
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
    </MaterialCard>
  );
};

export default ReportHeader;
