import { useEffect, useState } from 'react';
import Button from '../../../../../../components/atoms/Button';
import Input from '../../../../../../components/atoms/Input';
import Textarea from '../../../../../../components/atoms/Textarea';
import Modal from '../../../../../../components/molecules/Modal';
import Callout from '../../../../../../components/molecules/Callout';
import WeeklyScheduleEditor from '../../components/WeeklyScheduleEditor';
import type { HorarioSemanalDia, PlantillaHorario, PlantillaHorarioInput } from '../types';
import { semanaHorarioVacia } from '../types';
import { errorTurno } from '../../utils/validarTurno';

interface PlantillaEditorModalProps {
  open: boolean;
  plantilla: PlantillaHorario | null;
  guardando: boolean;
  onClose: () => void;
  onSave: (value: PlantillaHorarioInput) => void;
}

const PlantillaEditorModal = ({ open, plantilla, guardando, onClose, onSave }: PlantillaEditorModalProps) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [dias, setDias] = useState<HorarioSemanalDia[]>(semanaHorarioVacia());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setNombre(plantilla?.nombre ?? '');
    setDescripcion(plantilla?.descripcion ?? '');
    setDias(plantilla?.dias ?? semanaHorarioVacia());
    setError('');
  }, [open, plantilla]);

  const guardar = () => {
    if (!nombre.trim()) return setError('El nombre es obligatorio.');
    const invalido = dias.find((dia) => errorTurno(dia));
    if (invalido) return setError(`Día ${invalido.dia_semana}: ${errorTurno(invalido)}`);
    onSave({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, dias });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={plantilla ? 'Editar plantilla' : 'Nueva plantilla'} size="full" className="max-w-7xl" closeOnOverlayClick={!guardando} closeOnEscape={!guardando} closeButtonDisabled={guardando}>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nombre" value={nombre} maxLength={120} onChange={(event) => setNombre(event.target.value)} disabled={guardando} />
          <Textarea label="Descripción" value={descripcion} maxLength={500} rows={2} onChange={(event) => setDescripcion(event.target.value)} disabled={guardando} />
        </div>
        <WeeklyScheduleEditor value={dias} onChange={setDias} disabled={guardando} showHoursSummary />
        {error && <Callout variant="error" role="alert">{error}</Callout>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button variant="primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar plantilla'}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PlantillaEditorModal;
