import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeeklyScheduleEditor from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/WeeklyScheduleEditor';
import { semanaHorarioVacia } from '../pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/types';

describe('WeeklyScheduleEditor', () => {
  it('renderiza siete días y limpia el horario restableciendo cruce nocturno', () => {
    const onChange = vi.fn();
    const dias = semanaHorarioVacia();
    dias[0].cruza_medianoche = true;
    render(<WeeklyScheduleEditor value={dias} onChange={onChange} />);
    expect(screen.getAllByRole('button', { name: /^Limpiar/ })).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar Lun' }));
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ hora_entrada: null, hora_salida: null, minutos_almuerzo: 0, cruza_medianoche: false });
  });

  it('muestra las horas netas por día y el total semanal con horas del backend', () => {
    const dias = semanaHorarioVacia();
    dias.slice(0, 4).forEach((dia) => {
      dia.hora_entrada = '07:30:00';
      dia.hora_salida = '16:30:00';
      dia.minutos_almuerzo = 30;
    });
    dias[4].hora_entrada = '07:30:00';
    dias[4].hora_salida = '16:00:00';
    dias[4].minutos_almuerzo = 30;

    render(
      <WeeklyScheduleEditor
        value={dias}
        onChange={() => undefined}
        showHoursSummary
      />,
    );

    expect(screen.getAllByText('8,5 h')).toHaveLength(4);
    expect(screen.getByText('8 h')).toBeInTheDocument();
    expect(screen.getByText('42 h semanales')).toBeInTheDocument();
  });

  it('marca para revisión un cruce de medianoche incoherente sin sumar 33 horas', () => {
    const dias = semanaHorarioVacia();
    dias[0].cruza_medianoche = true;

    render(
      <WeeklyScheduleEditor
        value={dias}
        onChange={() => undefined}
        showHoursSummary
      />,
    );

    expect(screen.getByText('Revisar')).toBeInTheDocument();
    expect(screen.getByText('1 día por revisar')).toBeInTheDocument();
    expect(screen.queryByText('33 h')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('mantiene oculto el resumen cuando no se solicita', () => {
    render(<WeeklyScheduleEditor value={semanaHorarioVacia()} onChange={() => undefined} />);
    expect(screen.queryByText('Total de la plantilla')).not.toBeInTheDocument();
  });

  it('expone un diálogo accesible y lo cierra con Escape', () => {
    render(<WeeklyScheduleEditor value={semanaHorarioVacia()} onChange={() => undefined} />);
    const trigger = screen.getByRole('button', { name: 'Entrada Lun: 07:30' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Seleccionar entrada lun' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
