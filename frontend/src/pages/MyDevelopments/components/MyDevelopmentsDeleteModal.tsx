import React from 'react';
import { Title, Text, Button } from '../../../components/atoms';

interface MyDevelopmentsDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleteLoading: boolean;
  name: string;
}

export const MyDevelopmentsDeleteModal: React.FC<MyDevelopmentsDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deleteLoading,
  name,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="p-6 border-b border-[var(--color-border)]">
          <Title variant="h5" weight="bold">Anular actividad</Title>
        </div>
        <div className="p-6 space-y-2">
          <Text variant="body2">
            ¿Estás seguro de que deseas anular la actividad{' '}
            <Text as="span" weight="bold">"{name}"</Text>?
          </Text>
          <Text variant="caption" color="text-secondary">
            La actividad y sus tareas WBS quedarán visibles como anuladas. No se borrarán registros.
          </Text>
        </div>
        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-variant)] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={deleteLoading}>
            Cancelar
          </Button>
          <Button
            variant="custom"
            onClick={onConfirm}
            disabled={deleteLoading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            {deleteLoading ? 'Anulando...' : 'Anular'}
          </Button>
        </div>
      </div>
    </div>
  );
};
export default MyDevelopmentsDeleteModal;
