import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditoriaEstadisticas } from '../../../../types/auditoria';
import AuditoriaIndicadores from '.';
import { useAuditoriaStats } from './hooks/useAuditoriaStats';

vi.mock('./hooks/useAuditoriaStats');
vi.mock('./components/PeriodSelector', () => ({ default: () => <div>Selector de periodo</div> }));
vi.mock('./components/KpiCards', () => ({ default: () => <div>Tarjetas KPI</div> }));
vi.mock('./components/EventosPorModulo', () => ({ default: () => <div>Eventos por modulo</div> }));
vi.mock('./components/TiposFallos', () => ({ default: () => <div>Tipos de fallos</div> }));
vi.mock('./components/ActividadEnTiempo', () => ({ default: () => <div>Actividad en tiempo</div> }));
vi.mock('./components/TopUsuariosTable', () => ({ default: () => <div>Usuarios con más actividad</div> }));
vi.mock('./components/TopRutasTable', () => ({ default: () => <div>Rutas más utilizadas</div> }));
vi.mock('./components/UltimosEventosTable', () => ({ default: () => <div>Últimos eventos</div> }));

const estadisticas: AuditoriaEstadisticas = {
  total_eventos: 12,
  usuarios_unicos: 3,
  total_exitosos: 10,
  total_fallidos: 1,
  total_denegados: 1,
  total_fallos_auth: 1,
  tasa_exito: 83.3,
  modulo_mas_activo: 'auth',
  por_modulo: [],
  tipos_fallos: [],
  por_dia: [],
  top_usuarios: [],
  top_rutas: [],
};

const crearHook = (overrides = {}) => ({
  estadisticas,
  isLoading: false,
  error: null,
  periodo: '30dias' as const,
  setPeriodo: vi.fn(),
  fechaDesde: '',
  setFechaDesde: vi.fn(),
  fechaHasta: '',
  setFechaHasta: vi.fn(),
  recargar: vi.fn(),
  ...overrides,
});

describe('AuditoriaIndicadores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza el dashboard cuando hay estadísticas', () => {
    vi.mocked(useAuditoriaStats).mockReturnValue(crearHook());

    render(<AuditoriaIndicadores />);

    expect(screen.getByText('Tarjetas KPI')).toBeInTheDocument();
    expect(screen.getByText('Eventos por modulo')).toBeInTheDocument();
    expect(screen.getByText('Actividad en tiempo')).toBeInTheDocument();
    expect(screen.getByText('Usuarios con más actividad')).toBeInTheDocument();
    expect(screen.getByText('Rutas más utilizadas')).toBeInTheDocument();
    expect(screen.getByText('Últimos eventos')).toBeInTheDocument();
  });

  it('muestra el error sin renderizar las gráficas', () => {
    vi.mocked(useAuditoriaStats).mockReturnValue(crearHook({
      estadisticas: null,
      error: 'No fue posible consultar auditoría',
    }));

    render(<AuditoriaIndicadores />);

    expect(screen.getByText('No fue posible consultar auditoría')).toBeInTheDocument();
    expect(screen.queryByText('Tarjetas KPI')).not.toBeInTheDocument();
  });

  it('permite solicitar una actualización manual', () => {
    const recargar = vi.fn();
    vi.mocked(useAuditoriaStats).mockReturnValue(crearHook({ recargar }));

    render(<AuditoriaIndicadores />);
    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    expect(recargar).toHaveBeenCalledOnce();
  });
});
