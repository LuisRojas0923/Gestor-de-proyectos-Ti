import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EventosPorModulo from './EventosPorModulo';
import PeriodSelector from './PeriodSelector';

describe('accesibilidad de indicadores de auditoría', () => {
  it('asocia nombres accesibles a las fechas personalizadas', () => {
    render(
      <PeriodSelector
        periodo="personalizado"
        setPeriodo={vi.fn()}
        fechaDesde="2026-07-01"
        setFechaDesde={vi.fn()}
        fechaHasta="2026-07-10"
        setFechaHasta={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Fecha inicial')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Fecha final')).toHaveAttribute('type', 'date');
  });

  it('expone y actualiza el estado del acordeón por módulo', () => {
    render(
      <EventosPorModulo
        datos={[{
          modulo: 'service-portal',
          total: 1,
          usuarios_unicos: 1,
          ultimos_eventos: [{
            id: 1,
            timestamp: '2026-07-10T10:00:00',
            usuario_id: 'usuario-1',
            usuario_nombre: 'Usuario Prueba',
            modulo: 'service-portal',
            accion: 'login',
            resultado: 'exito',
          }],
        }]}
      />,
    );

    const trigger = screen.getByRole('button', { name: /portal de servicios ti/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'eventos-modulo-0');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ingresó al sistema')).toBeInTheDocument();
  });
});
