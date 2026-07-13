import { useEffect, useState } from 'react';
import Button from '../../../../../../components/atoms/Button';
import Input from '../../../../../../components/atoms/Input';
import { Text } from '../../../../../../components/atoms/Text';
import Modal from '../../../../../../components/molecules/Modal';
import type { PlantillaHorario } from '../types';

interface PlantillaActionModalProps {
  plantilla: PlantillaHorario | null;
  accion: 'duplicar' | 'desactivar' | null;
  guardando: boolean;
  onClose: () => void;
  onConfirm: (nombre?: string) => void;
}

const PlantillaActionModal = ({ plantilla, accion, guardando, onClose, onConfirm }: PlantillaActionModalProps) => {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (accion === 'duplicar') setNombre(plantilla ? `${plantilla.nombre} - copia` : '');
  }, [accion, plantilla]);

  const duplicando = accion === 'duplicar';
  return (
    <Modal
      isOpen={accion !== null}
      onClose={onClose}
      title={duplicando ? 'Duplicar plantilla' : 'Desactivar plantilla'}
      size="sm"
      closeOnOverlayClick={!guardando}
      closeOnEscape={!guardando}
      closeButtonDisabled={guardando}
    >
      <div className="space-y-4">
        {duplicando ? (
          <Input
            label="Nombre de la copia"
            value={nombre}
            maxLength={120}
            disabled={guardando}
            onChange={(event) => setNombre(event.target.value)}
          />
        ) : (
          <Text>La plantilla dejará de estar disponible para nuevas aplicaciones. Los horarios ya aplicados no cambiarán.</Text>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button
            variant={duplicando ? 'primary' : 'danger'}
            disabled={guardando || (duplicando && !nombre.trim())}
            onClick={() => onConfirm(duplicando ? nombre.trim() : undefined)}
          >
            {guardando ? 'Procesando...' : duplicando ? 'Crear copia' : 'Desactivar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PlantillaActionModal;
