import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TopUsuariosTable from './TopUsuariosTable';

describe('TopUsuariosTable', () => {
  it('muestra usuarios, volumen y estado vacío', () => {
    const { rerender } = render(
      <TopUsuariosTable
        datos={[{
          usuario_id: 'u-1',
          usuario_nombre: 'Ana Torres',
          total: 12,
          ultimo_evento: '2026-07-23T12:00:00Z',
        }]}
      />
    );

    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Usuarios con más actividad' })).toBeInTheDocument();

    rerender(<TopUsuariosTable datos={[]} />);
    expect(screen.getByText('No hay usuarios para este período')).toBeInTheDocument();
  });
});
