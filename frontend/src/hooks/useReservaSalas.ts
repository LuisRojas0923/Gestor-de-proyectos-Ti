/**
 * Hook para API de Reserva de Salas
 */
import { useCallback, useState } from 'react';
import { useApi } from './useApi';
import { API_ENDPOINTS } from '../config/api';
import type {
  Room,
  Reservation,
  ReservationCreate,
  ReservationUpdate,
  ReservationCancelBody,
  RecurringReservationCreate,
} from '../types/reservaSalas';

interface ReservationsParams {
  room_id?: string;
  start_date?: string;
  end_date?: string;
  status?: 'ACTIVE' | 'CANCELLED';
}

export function useReservaSalas() {
  const { get, post, put } = useApi();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(
    async (params?: { capacity_min?: number; resources?: string; is_active?: boolean }) => {
      setLoadingRooms(true);
      setError(null);
      try {
        const q = new URLSearchParams();
        if (params?.capacity_min != null) q.set('capacity_min', String(params.capacity_min));
        if (params?.resources) q.set('resources', params.resources);
        if (params?.is_active != null) q.set('is_active', String(params.is_active));
        const url = `${API_ENDPOINTS.RESERVA_SALAS_ROOMS}${q.toString() ? `?${q}` : ''}`;
        const data = await get(url);
        const list =
          Array.isArray(data)
            ? data
            : data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)
              ? (data as { data: Room[] }).data
              : data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)
                ? (data as { items: Room[] }).items
                : [];
        setRooms(list);
        return list;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar salas');
        return null;
      } finally {
        setLoadingRooms(false);
      }
    },
    [get]
  );

  const loadReservations = useCallback(
    async (params?: ReservationsParams) => {
      setLoadingReservations(true);
      setError(null);
      try {
        const q = new URLSearchParams();
        if (params?.room_id) q.set('room_id', params.room_id);
        if (params?.start_date) q.set('start_date', params.start_date);
        if (params?.end_date) q.set('end_date', params.end_date);
        if (params?.status) q.set('status', params.status);
        const url = `${API_ENDPOINTS.RESERVA_SALAS_RESERVATIONS}${q.toString() ? `?${q}` : ''}`;
        const data = await get(url);
        const list =
          Array.isArray(data)
            ? data
            : data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)
              ? (data as { data: Reservation[] }).data
              : data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)
                ? (data as { items: Reservation[] }).items
                : [];
        setReservations(list);
        return list;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar reservas');
        return null;
      } finally {
        setLoadingReservations(false);
      }
    },
    [get]
  );

  const createReservation = useCallback(
    (body: ReservationCreate) =>
      post(API_ENDPOINTS.RESERVA_SALAS_RESERVATIONS, body) as Promise<Reservation | null>,
    [post]
  );

  const updateReservation = useCallback(
    (id: string, body: ReservationUpdate) =>
      put(API_ENDPOINTS.RESERVA_SALAS_RESERVATION_BY_ID(id), body) as Promise<Reservation | null>,
    [put]
  );

  const cancelReservation = useCallback(
    (id: string, body: ReservationCancelBody) =>
      post(API_ENDPOINTS.RESERVA_SALAS_RESERVATION_CANCEL(id), body) as Promise<Reservation | null>,
    [post]
  );

  const createRecurring = useCallback(
    (body: RecurringReservationCreate) =>
      post(API_ENDPOINTS.RESERVA_SALAS_RECURRING, body) as Promise<{ created_count: number; skipped_count: number } | null>,
    [post]
  );

  return {
    rooms,
    reservations,
    setReservations,
    loadingRooms,
    loadingReservations,
    error,
    loadRooms,
    loadReservations,
    createReservation,
    updateReservation,
    cancelReservation,
    createRecurring,
  };
}
