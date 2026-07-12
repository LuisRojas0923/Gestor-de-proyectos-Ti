import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Text } from '../components/atoms';

vi.mock('../services/horasExtrasService', () => ({
  listarCostosOt: vi.fn().mockResolvedValue([]),
  obtenerHorarioSemana: vi.fn().mockResolvedValue({ dias: [] }),
  actualizarHorarioSemana: vi.fn(),
}));
vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));

import CostosOtView from '../pages/ServicePortal/pages/HORAS_EXTRAS/CostosOtView';
import EmpleadosActivosView from '../pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView';
import HorarioSemanaView from '../pages/ServicePortal/pages/HORAS_EXTRAS/HorarioSemanaView';
import PlanificadorHeader from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/PlanificadorHeader';

const LocationProbe = () => {
  const location = useLocation();
  return <Text as="span" aria-label="ruta actual">{location.pathname}{location.search}</Text>;
};

describe('retornos de Tiempo y Asistencia', () => {
  it('lleva una vista HE de primer nivel directamente al hub', async () => {
    render(
      <MemoryRouter initialEntries={['/service-portal/horas-extras/costos-ot']}>
        <Routes>
          <Route path="/service-portal/horas-extras/costos-ot" element={<CostosOtView />} />
          <Route path="/service-portal/tiempo-asistencia" element={<Text>Hub de Tiempo y Asistencia</Text>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No hay costos para los filtros seleccionados.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Tiempo y Asistencia' }));
    expect(screen.getByText('Hub de Tiempo y Asistencia')).toBeInTheDocument();
  });

  it('abre empleados dentro del panel integrado del planificador', () => {
    render(
      <MemoryRouter initialEntries={['/service-portal/horas-extras/empleados']}>
        <Routes>
          <Route path="/service-portal/horas-extras/empleados" element={<EmpleadosActivosView />} />
          <Route path="/service-portal/horas-extras/planificador" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('ruta actual')).toHaveTextContent(
      '/service-portal/horas-extras/planificador?panel=empleados',
    );
  });

  it('regresa el detalle de horario al panel de empleados', async () => {
    render(
      <MemoryRouter initialEntries={['/service-portal/horas-extras/horario/123']}>
        <Routes>
          <Route path="/service-portal/horas-extras/horario/:cedula" element={<HorarioSemanaView />} />
          <Route path="/service-portal/horas-extras/planificador" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Volver al Planificador' }));
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent(
      '/service-portal/horas-extras/planificador?panel=empleados',
    );
  });

  it('lleva el botón atrás del planificador directamente al hub', () => {
    render(
      <MemoryRouter initialEntries={['/service-portal/horas-extras/planificador']}>
        <PlanificadorHeader
          anio={2026}
          semanaIso={28}
          fechaInicio="2026-07-06"
          fechaFin="2026-07-12"
          seleccionadosCount={0}
          preCalculo={null}
          resultado={null}
          onFechaReferenciaChange={vi.fn()}
          horarioSinEmpleados
          novedadMasiva=""
          onAplicarHorario={vi.fn()}
          onLimpiarDias={vi.fn()}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Volver a Tiempo y Asistencia' }));
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/service-portal/tiempo-asistencia');
  });
});
