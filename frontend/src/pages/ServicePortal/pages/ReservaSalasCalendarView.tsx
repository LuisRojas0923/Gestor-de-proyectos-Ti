/**
 * Vista de calendario de reservas (migrada desde PRUEBA ANTI CalendarPage).
 * Usa FullCalendar. Cuando el backend no está disponible muestra mensaje amigable.
 */
import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { Calendar, ArrowLeft, Plus } from 'lucide-react';
import { Title, Text, Button, Icon, Select } from '../../../components/atoms';
import { useReservaSalas } from '../../../hooks/useReservaSalas';
import { useAppContext } from '../../../context/AppContext';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import type { Room, Reservation } from '../../../types/reservaSalas';
import ReservationModal from '../components/ReservationModal';
import ReservationDetailModal from '../components/ReservationDetailModal';

interface ReservaSalasCalendarViewProps {
  onBack: () => void;
}



export const ReservaSalasCalendarView: React.FC<ReservaSalasCalendarViewProps> = ({ onBack }) => {
  const { state } = useAppContext();
  const user = state.user;
  const { addNotification } = useNotifications();
  const {
    rooms,
    reservations,
    loadingRooms,
    loadRooms,
    loadReservations,
    updateReservation,
    error,
  } = useReservaSalas();

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadRooms({ is_active: true });
  }, [loadRooms]);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0]);
    }
  }, [rooms, selectedRoom]);

  useEffect(() => {
    if (selectedRoom) {
      loadReservations({ room_id: selectedRoom.id, status: 'ACTIVE' });
    }
  }, [selectedRoom, loadReservations]);

  const handleDateClick = useCallback((info: DateClickArg) => {
    setSelectedDate(info.dateStr);
    setShowCreateModal(true);
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const eventId = String(info.event.id ?? '');
    const res = reservations.find((r) => String(r.id) === eventId);
    setSelectedReservation(res ?? null);
    setShowDetailModal(true);
  }, [reservations]);

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    if (!user) return;
    const newStart = info.event.start!;
    const durationMs = info.oldEvent?.end && info.oldEvent?.start
      ? info.oldEvent.end.getTime() - info.oldEvent.start.getTime()
      : 60 * 60 * 1000;
    const newEnd = info.event.end ?? new Date(newStart.getTime() + durationMs);
    try {
      await updateReservation(info.event.id, {
        start_datetime: newStart.toISOString(),
        end_datetime: newEnd.toISOString(),
      });
      if (selectedRoom) loadReservations({ room_id: selectedRoom.id, status: 'ACTIVE' });
    } catch (e) {
      info.revert();
      addNotification('error', e instanceof Error ? e.message : 'No se pudo mover la reserva');
    }
  }, [user, updateReservation, selectedRoom, loadReservations, addNotification]);

  const handleEventResize = useCallback(async (info: EventResizeDoneArg) => {
    if (!user) return;
    const newStart = info.event.start!;
    const newEnd = info.event.end!;
    try {
      await updateReservation(info.event.id, {
        start_datetime: newStart.toISOString(),
        end_datetime: newEnd.toISOString(),
      });
      if (selectedRoom) loadReservations({ room_id: selectedRoom.id, status: 'ACTIVE' });
    } catch (e) {
      info.revert();
      addNotification('error', e instanceof Error ? e.message : 'No se pudo redimensionar');
    }
  }, [user, updateReservation, selectedRoom, loadReservations, addNotification]);


  const handleReservationCreated = useCallback(() => {
    setShowCreateModal(false);
    setSelectedDate(null);
    if (selectedRoom) loadReservations({ room_id: selectedRoom.id, status: 'ACTIVE' });
  }, [selectedRoom, loadReservations]);

  const handleReservationUpdated = useCallback(() => {
    setShowDetailModal(false);
    setSelectedReservation(null);
    if (selectedRoom) loadReservations({ room_id: selectedRoom.id, status: 'ACTIVE' });
  }, [selectedRoom, loadReservations]);

  const calendarEvents = reservations.map((r) => ({
    id: String(r.id),
    title: r.title,
    start: new Date(r.start_datetime),
    end: new Date(r.end_datetime),
    backgroundColor: r.status === 'ACTIVE' ? 'var(--color-primary)' : '#6b7280',
    borderColor: r.status === 'ACTIVE' ? 'var(--color-primary)' : '#4b5563',
    editable: r.status === 'ACTIVE' && (r.created_by_document === user?.cedula || user?.role === 'admin'),
  }));

  if (loadingRooms) {
    return (
      <div className="space-y-6 py-6">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold p-0">Volver</Button>
        <div className="flex justify-center items-center min-h-[300px]">
          <Text color="text-secondary">Cargando salas...</Text>
        </div>
      </div>
    );
  }

  if (error || rooms.length === 0) {
    return (
      <div className="space-y-6 py-6">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold p-0">Volver</Button>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <Title variant="h4" weight="bold" className="text-[var(--deep-navy)] dark:text-white mb-2">
            Calendario de reservas
          </Title>
          <Text variant="body1" color="text-secondary">
            {error
              ? 'No se pudo cargar las salas. Comprueba que el servicio de reserva de salas esté disponible.'
              : 'No hay salas disponibles. Cuando el backend esté configurado podrás ver el calendario aquí.'}
          </Text>
        </div>
      </div>
    );
  }

  if (!selectedRoom) {
    return null;
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold p-0">Volver</Button>
          <div className="flex items-center gap-2">
            <Icon name={Calendar} size="lg" color="primary" />
            <Title variant="h3" weight="bold" className="text-[var(--deep-navy)] dark:text-white">
              Calendario de reservas
            </Title>
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => { setSelectedDate(null); setShowCreateModal(true); }}>
          Nueva reserva
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full max-w-lg">
        <Text as="label" variant="body2" weight="bold" color="text-secondary" className="min-w-[56px]">
          Sala:
        </Text>
        <div className="flex-1">
          <Select
            value={selectedRoom?.id ?? ''}
            onChange={(e) => {
              const r = rooms.find((x) => x.id === e.target.value);
              setSelectedRoom(r ?? null);
            }}
            options={rooms.map((room) => ({
              value: room.id,
              label: `${room.name} (Capacidad: ${room.capacity})`,
            }))}
          />
        </div>
      </div>

      <div className="reserva-salas-calendar rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          slotMinTime="07:00:00"
          slotMaxTime="19:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          locale="es"
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          editable
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventOverlap={false}
          height="auto"
        />
      </div>

      {showCreateModal && selectedRoom && (
        <ReservationModal
          room={selectedRoom}
          initialDate={selectedDate}
          onClose={() => { setShowCreateModal(false); setSelectedDate(null); }}
          onSuccess={handleReservationCreated}
        />
      )}

      {showDetailModal && selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => { setShowDetailModal(false); setSelectedReservation(null); }}
          onUpdate={handleReservationUpdated}
        />
      )}
    </div>
  );
};

export default ReservaSalasCalendarView;
