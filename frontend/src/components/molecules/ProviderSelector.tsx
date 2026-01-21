import React from 'react';
import { Select, Text } from '../atoms';

interface ProviderSelectorProps {
  selectedProvider: string;
  availableProviders: string[];
  loading: boolean;
  onProviderChange: (provider: string) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  availableProviders,
  loading,
  onProviderChange,
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
      <Text variant="body2" weight="medium" color="secondary">
        Proveedor:
      </Text>
      <Select
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value)}
        options={options}
        disabled={loading}
        className="min-w-[180px]"
      />
    </div>
  );
};

export default ProviderSelector;
