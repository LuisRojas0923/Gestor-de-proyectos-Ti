import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UltimosEventosTable from './UltimosEventosTable';

describe('UltimosEventosTable', () => {
  it('ordena eventos, limita la tabla a 20 y solo presenta el resumen', () => {
    const ultimosEventos = Array.from({ length: 21 }, (_, index) => ({
      id: index + 1,
      timestamp: `2026-07-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
      usuario_id: `u-${index + 1}`,
      usuario_nombre: `Usuario ${index}`,
      modulo: 'auth',
      accion: 'login' as const,
      resultado: 'exito' as const,
    }));

    const { rerender } = render(
      <UltimosEventosTable
        datos={[{
          modulo: 'auth',
          total: 21,
          usuarios_unicos: 21,
          ultimos_eventos: ultimosEventos,
        }]}
      />
    );

    expect(screen.getByText('Usuario 20')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 0')).not.toBeInTheDocument();
    expect(screen.getAllByText('Control de acceso').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inicio de sesión').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Éxito').length).toBeGreaterThan(0);
    expect(screen.getByText('Resumen reciente sin exponer evidencia cruda')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Últimos eventos de auditoría' })).toBeInTheDocument();

    rerender(<UltimosEventosTable datos={[]} />);
    expect(screen.getByText('No hay eventos recientes para este período')).toBeInTheDocument();
  });
});
