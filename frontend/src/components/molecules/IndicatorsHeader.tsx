import React from 'react';
import ProviderSelector from './ProviderSelector';

import { Title, Text } from '../atoms';

interface IndicatorsHeaderProps {
  selectedProvider: string;
  availableProviders: string[];
  loading: boolean;
  error: string | null;
  onProviderChange: (provider: string) => void;
}

const IndicatorsHeader: React.FC<IndicatorsHeaderProps> = ({
  selectedProvider,
  availableProviders,
  loading,
  error,
  onProviderChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <Title variant="h1" weight="bold">
        Indicadores de Gestión (KPIs)
      </Title>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <ProviderSelector
          selectedProvider={selectedProvider}
          availableProviders={availableProviders}
          loading={loading}
          onProviderChange={onProviderChange}
        />

        {/* Estados de carga y error */}
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <Text variant="body2" color="secondary">
                Cargando...
              </Text>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-1">
              <Text variant="body2" color="error">{error}</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndicatorsHeader;
