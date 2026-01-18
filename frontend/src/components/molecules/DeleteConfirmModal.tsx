import React from 'react';
import { Trash2 } from 'lucide-react';
import { DevelopmentWithCurrentStatus } from '../../types';
import { Modal } from '.';
import { Button } from '../atoms';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  development: DevelopmentWithCurrentStatus | null;
  darkMode: boolean; // Mantenemos prop por compatibilidad aunque el sistema usa clases CSS dark:
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

        <h3 className="text-lg font-medium mb-2 text-neutral-900 dark:text-white">
          ¿Eliminar Desarrollo?
        </h3>

        <p className="text-sm mb-4 text-neutral-600 dark:text-neutral-300">
          ¿Estás seguro de que deseas eliminar el desarrollo <strong>"{development.name}"</strong> ({development.id})?
        </p>

        <p className="text-xs mb-6 text-red-600 dark:text-red-400">
          ⚠️ Esta acción no se puede deshacer. El desarrollo será eliminado permanentemente.
        </p>

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

