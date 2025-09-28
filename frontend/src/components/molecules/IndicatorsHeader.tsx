import React from 'react';
import ProviderSelector from './ProviderSelector';

interface IndicatorsHeaderProps {
  darkMode: boolean;
  selectedProvider: string;
  availableProviders: string[];
  loading: boolean;
  error: string | null;
  onProviderChange: (provider: string) => void;
}

const IndicatorsHeader: React.FC<IndicatorsHeaderProps> = ({
  darkMode,
  selectedProvider,
  availableProviders,
  loading,
  error,
  onProviderChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
        Indicadores de Gestión (KPIs)
      </h1>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <ProviderSelector
          selectedProvider={selectedProvider}
          availableProviders={availableProviders}
          loading={loading}
          onProviderChange={onProviderChange}
          darkMode={darkMode}
        />
        
        {/* Estados de carga y error */}
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Cargando...
              </span>
            </div>
          )}
          
          {error && (
            <div className={`text-sm px-3 py-1 rounded-md ${
              darkMode ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndicatorsHeader;
