/**
 * Tipos para Reserva de Salas (portal)
 */
export interface Room {
  id: string;
  name: string;
  capacity: number;
  resources: string[];
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RoomCreate {
  name: string;
  capacity: number;
  resources: string[];
  is_active: boolean;
  notes?: string;
}

export interface RoomUpdate {
  name?: string;
  capacity?: number;
  resources?: string[];
  is_active?: boolean;
  notes?: string;
}

export interface Reservation {
  id: string;
  room_id: string;
  start_datetime: string;
  end_datetime: string;
  title: string;
  status: 'ACTIVE' | 'CANCELLED';
  series_id?: string;
  created_by_name: string;
  created_by_document: string;
  updated_by_name?: string;
  updated_by_document?: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationCreate {
  room_id: string;
  start_datetime: string;
  end_datetime: string;
  title: string;
}

export interface ReservationUpdate {
  start_datetime?: string;
  end_datetime?: string;
  title?: string;
}

export interface ReservationCancelBody {
  // Ahora el backend usa el usuario de la sesión
}

export interface RecurringReservationCreate {
  room_id: string;
  start_time: string;
  end_time: string;
  title: string;
  pattern_type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  pattern_interval: number;
  start_date: string;
  end_date?: string;
  occurrences?: number;
}
