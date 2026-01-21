import React from 'react';
import { Trash2 } from 'lucide-react';
import { DevelopmentWithCurrentStatus } from '../../types';
import { Modal } from '.';
import { Button, Title, Text } from '../atoms';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  development: DevelopmentWithCurrentStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  development,
  onConfirm,
  onCancel,
}) => {
  if (!development) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="md"
      showCloseButton={false}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex-shrink-0 w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <Title variant="h3" weight="medium" className="mb-2">
          ¿Eliminar Desarrollo?
        </Title>
        <Text variant="body2" color="secondary" className="mb-4">
          ¿Estás seguro de que deseas eliminar el desarrollo <strong>"{development.name}"</strong> ({development.id})?
        </Text>
        <Text variant="caption" color="error" weight="medium" className="mb-6">
          ⚠️ Esta acción no se puede deshacer. El desarrollo será eliminado permanentemente.
        </Text>

        <div className="flex space-x-3 w-full">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            className="flex-1"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

