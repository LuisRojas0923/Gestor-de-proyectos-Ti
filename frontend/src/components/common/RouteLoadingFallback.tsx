import React from 'react';
import { MaterialCard, Spinner, Text } from '../atoms';

const RouteLoadingFallback: React.FC = () => (
  <Text as="div" className="flex min-h-[320px] items-center justify-center p-4">
    <MaterialCard className="max-w-sm px-5 py-4 shadow-md">
      <Text as="div" className="flex items-center justify-center gap-3">
        <Spinner size="sm" className="text-[var(--color-primary)]" />
        <Text className="text-sm font-medium text-[var(--color-text-secondary)]">
          Cargando modulo...
        </Text>
      </Text>
    </MaterialCard>
  </Text>
);

export default RouteLoadingFallback;
