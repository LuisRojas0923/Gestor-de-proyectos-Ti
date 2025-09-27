import React from 'react';
import { DevelopmentWithCurrentStatus } from '../../../../../types';
import { UseFiltersReturn } from '../../../hooks';
import { DevelopmentFilters } from './DevelopmentFilters';
import { DevelopmentStatistics } from './DevelopmentStatistics';
import { DevelopmentTable } from './DevelopmentTable';
import { DevelopmentCards } from './DevelopmentCards';

interface ListViewProps {
  filters: UseFiltersReturn;
  darkMode: boolean;
  onViewDetails: (dev: DevelopmentWithCurrentStatus) => void;
  getStatusColor: (status: string) => string;
  getProgressColor: (stageName: string) => string;
}

export const ListView: React.FC<ListViewProps> = ({
  filters,
  darkMode,
  onViewDetails,
  getStatusColor,
  getProgressColor,
}) => {
  const { groupedDevelopments, groupBy } = filters;

  return (
    <>
      {/* Filtros */}
      <DevelopmentFilters filters={filters} darkMode={darkMode} />

      {/* Estadísticas por Organización */}
      <DevelopmentStatistics 
        groupedDevelopments={groupedDevelopments}
        groupBy={groupBy}
        darkMode={darkMode}
      />

      {/* Contenido Principal - Vista Condicional */}
      <div className="overflow-hidden">
        {/* Desktop Table View */}
        <DevelopmentTable
          groupedDevelopments={groupedDevelopments}
          groupBy={groupBy}
          filters={filters}
          darkMode={darkMode}
          onViewDetails={onViewDetails}
          getStatusColor={getStatusColor}
          getProgressColor={getProgressColor}
        />

        {/* Card View for Tablets and Smaller Laptops */}
        <DevelopmentCards
          groupedDevelopments={groupedDevelopments}
          groupBy={groupBy}
          darkMode={darkMode}
          onViewDetails={onViewDetails}
          getStatusColor={getStatusColor}
        />
      </div>
    </>
  );
};
