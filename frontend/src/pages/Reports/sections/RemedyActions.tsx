import React from 'react';
import { Download, RefreshCw, Users } from 'lucide-react';
import { MaterialButton } from '../../../components/atoms';

interface RemedyActionsProps {
  darkMode: boolean;
  loading: boolean;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
}

const RemedyActions: React.FC<RemedyActionsProps> = ({
  darkMode,
  loading,
  onRefresh,
  onExport
}) => {
  return (
    <div className="flex flex-wrap gap-3">
      <MaterialButton
        variant="contained"
        color="primary"
        icon={RefreshCw}
        onClick={onRefresh}
        disabled={loading}
        darkMode={darkMode}
      >
        Actualizar Informe
      </MaterialButton>
      
      <MaterialButton
        variant="contained"
        color="secondary"
        icon={Download}
        onClick={() => onExport('excel')}
        darkMode={darkMode}
      >
        Exportar Excel
      </MaterialButton>
      
      <MaterialButton
        variant="contained"
        color="secondary"
        icon={Users}
        onClick={() => {/* TODO: Implementar envío por email */}}
        darkMode={darkMode}
      >
        Enviar por Email
      </MaterialButton>
    </div>
  );
};

export default RemedyActions;
