import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardView from '../pages/ServicePortal/pages/DashboardView';

const renderDashboard = (permissions: string[]) => {
  const onNavigate = vi.fn();
  render(<DashboardView user={{ role: 'usuario', permissions }} moduleStatus={{}} onNavigate={onNavigate} />);
  return onNavigate;
};

describe('Dashboard de servicios con Tiempo y Asistencia', () => {
  it.each([
    'biometria',
    'nomina_horas_extras.leer',
    'nomina_horas_extras.planificar',
    'nomina_horas_extras.admin',
    'nomina_horas_extras.plantillas_horario.administrar',
    'alcance_empleados.administrar',
  ])('muestra una sola entrada agrupada con el permiso %s', (permiso) => {
    renderDashboard([permiso]);
    expect(screen.getAllByRole('button', { name: /Gestión de Tiempo y Asistencia/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^Plantillas de horario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Alcance de empleados/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Biometría y asistencia/i })).not.toBeInTheDocument();
  });

  it('navega al hub y permite encontrarlo por sus alias', () => {
    const onNavigate = renderDashboard(['biometria']);
    fireEvent.change(screen.getByPlaceholderText('Buscar opción o servicio...'), { target: { value: 'plantillas' } });
    const card = screen.getByRole('button', { name: /Gestión de Tiempo y Asistencia/i });
    fireEvent.click(card);
    expect(onNavigate).toHaveBeenCalledWith('tiempo_asistencia');
  });

  it('no muestra el hub sin permisos navegables', () => {
    renderDashboard(['nomina_horas_extras.confirmar']);
    expect(screen.queryByRole('button', { name: /Gestión de Tiempo y Asistencia/i })).not.toBeInTheDocument();
  });
});
