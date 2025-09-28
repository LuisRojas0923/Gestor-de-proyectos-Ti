import React from 'react';
import { MaterialSelect } from '../atoms';

interface ProviderSelectorProps {
  selectedProvider: string;
  availableProviders: string[];
  loading: boolean;
  onProviderChange: (provider: string) => void;
  darkMode: boolean;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  availableProviders,
  loading,
  onProviderChange,
  darkMode
}) => {
  const options = [
    { value: 'all', label: 'Todos los Proveedores' },
    ...availableProviders.map(provider => ({
      value: provider,
      label: provider
    }))
  ];

  return (
    <div className="flex items-center space-x-2">
      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Proveedor:
      </label>
      <MaterialSelect
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value)}
        darkMode={darkMode}
        options={options}
        disabled={loading}
        className="min-w-[180px]"
      />
    </div>
  );
};

export default ProviderSelector;
