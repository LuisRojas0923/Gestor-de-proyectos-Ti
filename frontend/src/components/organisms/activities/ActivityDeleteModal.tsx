import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Checkbox, Title, Text } from '../../atoms';
import { Modal } from '../../molecules';

interface ActivityDeleteModalProps {
  isOpen: boolean;
  activity: any | null;
  shouldRollbackStage: boolean;
  onRollbackChange: (rollback: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ActivityDeleteModal: React.FC<ActivityDeleteModalProps> = ({
  isOpen,
  activity,
  shouldRollbackStage,
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
        <Title variant="h4" weight="semibold" className="flex items-center">
          <AlertTriangle size={18} className="mr-2 text-red-500" />
          Confirmar eliminación
        </Title>
      }
    >
      <div className="space-y-4">
        <div>
          <Text color="secondary" className="mb-4">
            ¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.
          </Text>
          {activity && (
            <div className="p-3 rounded-md mb-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-start">
                <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
                <div>
                  <Text variant="body2" weight="medium" color="warning" className="dark:text-yellow-300">
                    Esta actividad está en la etapa: <strong>{activity.stage_name}</strong>
                  </Text>
                  <Text variant="caption" color="warning" className="mt-1 dark:text-yellow-400">
                    Si eliminas esta actividad, el desarrollo permanecerá en esta etapa.
                  </Text>
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
