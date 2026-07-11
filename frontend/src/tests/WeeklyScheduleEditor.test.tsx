import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeeklyScheduleEditor from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/WeeklyScheduleEditor';
import { semanaHorarioVacia } from '../pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/types';

describe('WeeklyScheduleEditor', () => {
  it('renderiza siete días y marca franco restableciendo cruce nocturno', () => {
    const onChange = vi.fn();
    const dias = semanaHorarioVacia();
    dias[0].cruza_medianoche = true;
    render(<WeeklyScheduleEditor value={dias} onChange={onChange} />);
    expect(screen.getAllByRole('button', { name: /^Franco/ })).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Franco Lun' }));
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ hora_entrada: null, hora_salida: null, minutos_almuerzo: 0, cruza_medianoche: false });
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
