import React from 'react';
import { Download, RefreshCw, Users } from 'lucide-react';
import { Button } from '../../../components/atoms';

interface PortalActionsProps {
  loading: boolean;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
}

const PortalActions: React.FC<PortalActionsProps> = ({
  loading,
  onRefresh,
  onExport
}) => {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="primary"
        icon={RefreshCw}
        onClick={onRefresh}
        disabled={loading}
        loading={loading}
      >
        Actualizar Informe
      </Button>

      <Button
        variant="outline"
        icon={Download}
        onClick={() => onExport('excel')}
      >
        Exportar Excel
      </Button>

      <Button
        variant="outline"
        icon={Users}
        onClick={() => {/* TODO: Implementar envío por email */ }}
      >
        Enviar por Email
      </Button>
    </div>
  );
};

export default PortalActions;
