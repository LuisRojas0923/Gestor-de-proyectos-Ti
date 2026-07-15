/**
 * Modal para crear una nueva reserva (migrado desde PRUEBA ANTI).
 * Horario permitido: 7:00 - 18:00 (6 PM).
 */
import React, { useState } from 'react';
import { Button, Input, Text } from '../../../components/atoms';
import { Modal } from '../../../components/molecules';
import { useReservaSalas } from '../../../hooks/useReservaSalas';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
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
  const { createReservation } = useReservaSalas();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: initialDate || new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    title: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const startMins = toMinutes(formData.start_time);
    const endMins = toMinutes(formData.end_time);
    const openMins = toMinutes('07:00');
    const closeMins = toMinutes('18:00');

    if (startMins < openMins || endMins > closeMins) {
      const message = 'Las reservas solo están permitidas entre las 7:00 AM y las 6:00 PM (18:00).';
      setError(message);
      addNotification('error', message);
      setLoading(false);
      return;
    }
    if (startMins >= endMins) {
      const message = 'La hora de fin debe ser posterior a la hora de inicio.';
      setError(message);
      addNotification('error', message);
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
      });
      addNotification('success', 'Reserva creada correctamente');
      onSuccess();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al crear la reserva';
      setError(message);
      addNotification('error', message);
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear reserva'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReservationModal;
