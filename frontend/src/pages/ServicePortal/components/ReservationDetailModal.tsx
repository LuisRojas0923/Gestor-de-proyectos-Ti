/**
 * Modal de detalle de reserva: ver, editar y cancelar (migrado desde PRUEBA ANTI).
 */
import React, { useState } from 'react';
import { Button, Input, Text } from '../../../components/atoms';
import { Modal } from '../../../components/molecules';
import { useReservaSalas } from '../../../hooks/useReservaSalas';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useAppContext } from '../../../context/AppContext';
import type { Reservation } from '../../../types/reservaSalas';

const formatDateTime = (datetime: string): string => {
  return new Date(datetime).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

interface ReservationDetailModalProps {
  reservation: Reservation;
  onClose: () => void;
  onUpdate: () => void;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ reservation, onClose, onUpdate }) => {
  const { state } = useAppContext();
  const user = state.user;
  const { updateReservation, cancelReservation } = useReservaSalas();
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: reservation.start_datetime.split('T')[0],
    start_time: reservation.start_datetime.split('T')[1].substring(0, 5),
    end_time: reservation.end_datetime.split('T')[1].substring(0, 5),
    title: reservation.title,
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const startMins = toMinutes(formData.start_time);
    const endMins = toMinutes(formData.end_time);
    if (startMins < toMinutes('07:00') || endMins > toMinutes('18:00')) {
      const msg = 'Las reservas solo están permitidas entre las 7:00 AM y las 6:00 PM (18:00).';
      setError(msg);
      addNotification('error', msg);
      return;
    }
    if (startMins >= endMins) {
      setError('La hora de fin debe ser posterior a la hora de inicio.');
      addNotification('error', 'La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    setLoading(true);
    try {
      const startDatetime = `${formData.date}T${formData.start_time}:00`;
      const endDatetime = `${formData.date}T${formData.end_time}:00`;
      await updateReservation(reservation.id, {
        start_datetime: new Date(startDatetime).toISOString(),
        end_datetime: new Date(endDatetime).toISOString(),
        title: formData.title,
      });
      addNotification('success', 'Reserva actualizada correctamente');
      onUpdate();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al actualizar';
      setError(message);
      addNotification('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    if (!window.confirm('¿Está seguro de cancelar esta reserva?')) return;
    setLoading(true);
    setError(null);
    try {
      await cancelReservation(reservation.id, {});
      addNotification('success', 'Reserva cancelada correctamente');
      onUpdate();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al cancelar';
      setError(message);
      addNotification('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title="Detalle de reserva" onClose={onClose} size="lg">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
            <Text variant="body2" className="text-red-700 dark:text-red-300">{error}</Text>
          </div>
        )}

        {!isEditing ? (
          <>
            <div className="space-y-2">
              <div><Text variant="caption" color="text-secondary">Inicio</Text><br /><Text variant="body1">{formatDateTime(reservation.start_datetime)}</Text></div>
              <div><Text variant="caption" color="text-secondary">Fin</Text><br /><Text variant="body1">{formatDateTime(reservation.end_datetime)}</Text></div>
              <div><Text variant="caption" color="text-secondary">Título</Text><br /><Text variant="body1">{reservation.title}</Text></div>
              <div><Text variant="caption" color="text-secondary">Organizador</Text><br /><Text variant="body1">{reservation.created_by_name}</Text></div>
              <div><Text variant="caption" color="text-secondary">Estado</Text><br /><Text variant="body1" weight="bold">{reservation.status === 'ACTIVE' ? 'Activa' : 'Cancelada'}</Text></div>
            </div>
            {reservation.status === 'ACTIVE' && (reservation.created_by_document === user?.cedula || user?.role === 'admin') && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setIsEditing(true)}>Editar</Button>
                <Button variant="danger" onClick={handleCancel} disabled={loading}>Cancelar reserva</Button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input label="Fecha" type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Hora inicio" type="time" required value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
              <Input label="Hora fin" type="time" required value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
            </div>
            <Input label="Título" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Actualizando...' : 'Actualizar'}</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ReservationDetailModal;
