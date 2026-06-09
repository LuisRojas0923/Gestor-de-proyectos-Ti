import React from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '../atoms/Button';
import { Text } from '../atoms/Text';

interface UpdateAvailableBannerProps {
  onReload: () => void;
}

export const UpdateAvailableBanner: React.FC<UpdateAvailableBannerProps> = ({ onReload }) => {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-md"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Text as="span" variant="body2" color="text-primary" weight="medium">
          Hay una nueva versión del portal. Actualiza para ver los últimos cambios.
        </Text>
        <Button
          variant="primary"
          size="sm"
          icon={RefreshCw}
          onClick={onReload}
          aria-label="Actualizar ahora"
        >
          Actualizar ahora
        </Button>
      </div>
    </div>
  );
};
