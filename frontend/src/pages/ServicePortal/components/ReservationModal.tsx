/**
 * Modal para crear una nueva reserva (migrado desde PRUEBA ANTI).
 * Horario laboral: 07:30 - 18:00.
 */
import React, { useState } from 'react';
import { Button, Input, Text } from '../../../components/atoms';
import { Modal } from '../../../components/molecules';
import { useReservaSalas } from '../../../hooks/useReservaSalas';
import { useAppContext } from '../../../context/AppContext';
import type { Room } from '../../../types/reservaSalas';

const toMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

interface ReservationModalProps {
  room: Room;
  initialDate: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ room, initialDate, onClose, onSuccess }) => {
  const { state } = useAppContext();
  const user = state.user;
  const { createReservation } = useReservaSalas();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: initialDate || new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    title: '',
    created_by_name: user?.name || '',
    created_by_document: user?.cedula || user?.id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const startMins = toMinutes(formData.start_time);
    const endMins = toMinutes(formData.end_time);
    const openMins = toMinutes('07:30');
    const closeMins = toMinutes('18:00');

    if (startMins < openMins || startMins >= closeMins || endMins <= openMins || endMins > closeMins) {
      setError('El horario debe estar entre 07:30 y 18:00 (24h).');
      setLoading(false);
      return;
    }
    if (startMins >= endMins) {
      setError('La hora de fin debe ser posterior a la hora de inicio.');
      setLoading(false);
      return;
    }

    try {
      const startDatetime = `${formData.date}T${formData.start_time}:00`;
      const endDatetime = `${formData.date}T${formData.end_time}:00`;
      await createReservation({
        room_id: room.id,
        start_datetime: new Date(startDatetime).toISOString(),
        end_datetime: new Date(endDatetime).toISOString(),
        title: formData.title.trim(),
        created_by_name: formData.created_by_name.trim(),
        created_by_document: formData.created_by_document.trim(),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={`Nueva reserva — ${room.name}`} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
            <Text variant="body2" className="text-red-700 dark:text-red-300">{error}</Text>
          </div>
        )}
        <Text variant="caption" color="text-secondary">Horario laboral: 07:30 - 18:00</Text>
        <Input
          label="Fecha"
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Hora inicio"
            type="time"
            required
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
          <Input
            label="Hora fin"
            type="time"
            required
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
        <Input
          label="Título / Motivo"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ej: Reunión de equipo"
        />
        <Input
          label="Nombre completo"
          required
          value={formData.created_by_name}
          onChange={(e) => setFormData({ ...formData, created_by_name: e.target.value })}
          placeholder="Ej: Juan Pérez"
        />
        <Input
          label="Número de documento"
          required
          value={formData.created_by_document}
          onChange={(e) => setFormData({ ...formData, created_by_document: e.target.value })}
          placeholder="Ej: 1234567890"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear reserva'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReservationModal;
