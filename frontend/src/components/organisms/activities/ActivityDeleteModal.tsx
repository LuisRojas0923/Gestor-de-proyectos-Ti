import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Checkbox } from '../../atoms';
import { Modal } from '../../molecules';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="md"
      showCloseButton={false}
      title={
        <span className="flex items-center">
          <AlertTriangle size={18} className="mr-2 text-red-500" />
          Confirmar eliminación
        </span>
      }
    >
      <div className="space-y-4">
        <div>
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
        </div>
        <div className="mt-4">
          <Checkbox
            id="rollbackCheckbox"
            label="También revertir el desarrollo a la etapa anterior"
            checked={shouldRollbackStage}
            onChange={(e) => onRollbackChange(e.target.checked)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
