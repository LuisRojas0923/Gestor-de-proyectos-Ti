import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { MaterialCard, MaterialButton } from '../../../../components/atoms';

interface ActivityDeleteModalProps {
  isOpen: boolean;
  activity: any | null;
  shouldRollbackStage: boolean;
  darkMode: boolean;
  onRollbackChange: (rollback: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ActivityDeleteModal: React.FC<ActivityDeleteModalProps> = ({
  isOpen,
  activity,
  shouldRollbackStage,
  darkMode,
  onRollbackChange,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className={`${darkMode ? 'bg-black/60' : 'bg-black/40'} fixed inset-0 z-50 flex items-center justify-center`}>
      <MaterialCard elevation={8} className="w-full max-w-md" darkMode={darkMode}>
        <MaterialCard.Header>
          <h3 className={`text-lg font-semibold flex items-center ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            <AlertTriangle size={18} className="mr-2 text-red-500" />
            Confirmar eliminación
          </h3>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mb-4`}>
            ¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.
          </p>
          {activity && (
            <div className={`p-3 rounded-md mb-4 ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start">
                <AlertTriangle size={16} className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'} mr-2 mt-0.5`} />
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                    Esta actividad está en la etapa: <strong>{activity.stage_name}</strong>
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                    Si eliminas esta actividad, el desarrollo permanecerá en esta etapa.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rollbackCheckbox"
              checked={shouldRollbackStage}
              onChange={(e) => onRollbackChange(e.target.checked)}
              className={`h-4 w-4 rounded ${darkMode ? 'bg-neutral-700 border-neutral-600 text-blue-500' : 'border-neutral-300 text-blue-600'} focus:ring-blue-500`}
            />
            <label htmlFor="rollbackCheckbox" className={`ml-2 text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
              También revertir el desarrollo a la etapa anterior
            </label>
          </div>
        </MaterialCard.Content>
        <MaterialCard.Actions>
          <MaterialButton
            variant="outlined"
            color="inherit"
            onClick={onCancel}
          >
            Cancelar
          </MaterialButton>
          <MaterialButton
            variant="contained"
            onClick={onConfirm}
            className={`${darkMode ? '!bg-red-600 hover:!bg-red-700 text-white' : '!bg-red-600 hover:!bg-red-700 text-white'}`}
          >
            Eliminar
          </MaterialButton>
        </MaterialCard.Actions>
      </MaterialCard>
    </div>
  );
};
