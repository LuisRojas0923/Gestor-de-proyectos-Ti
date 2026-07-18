import React, { useId } from 'react';
import { Trash2 } from 'lucide-react';

import { Button, Icon, Text, Title } from '../../../components/atoms';
import { Modal } from '../../../components/molecules';

interface CorporateDeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CorporateDeleteConfirmModal: React.FC<CorporateDeleteConfirmModalProps> = ({
  isOpen,
  title,
  description,
  isProcessing,
  onConfirm,
  onCancel,
}) => {
  const descriptionId = useId();

  return (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    size="sm"
    showCloseButton={false}
    ariaLabel={title}
    ariaDescribedBy={descriptionId}
    closeOnEscape={!isProcessing}
    closeOnOverlayClick={!isProcessing}
  >
    <div className="space-y-5 text-center">
      <Icon name={Trash2} size="lg" color="error" className="mx-auto" />
      <div className="space-y-2">
        <Title variant="h4">{title}</Title>
        <Text id={descriptionId} variant="body2" color="text-secondary">{description}</Text>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={isProcessing}>
          Eliminar
        </Button>
      </div>
    </div>
  </Modal>
  );
};
