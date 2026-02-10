/**
 * Vista de Reserva de Salas: muestra el calendario (migrado desde PRUEBA ANTI CalendarPage).
 */
import React from 'react';
import ReservaSalasCalendarView from './ReservaSalasCalendarView';

interface ReservaSalasViewProps {
  onBack: () => void;
}

const ReservaSalasView: React.FC<ReservaSalasViewProps> = ({ onBack }) => {
  return <ReservaSalasCalendarView onBack={onBack} />;
};

export default ReservaSalasView;
