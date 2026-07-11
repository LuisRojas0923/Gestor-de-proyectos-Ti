import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CeldaDiaEditor from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/CeldaDiaEditor';

vi.mock('../services/horasExtrasService', () => ({ buscarOtManoObra: vi.fn() }));

describe('CeldaDiaEditor', () => {
  it('bloquea guardar un turno nocturno incoherente y muestra feedback', () => {
    const onGuardar = vi.fn();
    render(<CeldaDiaEditor
      abierto
      cedula="10"
      diaSemana={1}
      fecha="2026-07-06"
      dia={{ dia_semana: 1, hora_entrada: '22:00', hora_salida: '06:00', minutos_almuerzo: 0, cruza_medianoche: false, novedades: [], asignaciones_ot: [] }}
      onCerrar={() => undefined}
      onGuardar={onGuardar}
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onGuardar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Activa el cruce de medianoche');
  });
});
