import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TopRutasTable from './TopRutasTable';

describe('TopRutasTable', () => {
  it('muestra la ruta, el conteo de fallos y un nombre accesible', () => {
    const { rerender } = render(
      <TopRutasTable
        datos={[{
          ruta: '/api/v2/auditoria/estadisticas',
          accion: 'consultar',
          total: 20,
          fallos: 2,
        }]}
      />
    );

    expect(screen.getByText('/api/v2/auditoria/estadisticas')).toBeInTheDocument();
    expect(screen.getByText('Consulta')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Rutas más utilizadas' })).toBeInTheDocument();

    rerender(<TopRutasTable datos={[]} />);
    expect(screen.getByText('No hay rutas para este período')).toBeInTheDocument();
  });
});
