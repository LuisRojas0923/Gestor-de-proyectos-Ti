import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Text } from '../components/atoms';

const mocks = vi.hoisted(() => ({ permisos: [] as string[] }));
vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({ state: { user: { permissions: mocks.permisos } } }),
}));

import GestionTiempoAsistencia from '../pages/ServicePortal/pages/GestionTiempoAsistencia';
import { OPCIONES_TIEMPO_ASISTENCIA } from '../pages/ServicePortal/pages/GestionTiempoAsistencia/gestionTiempoAsistenciaConfig';

const LocationProbe = () => <Text as="span" aria-label="ruta actual">{useLocation().pathname}</Text>;

const renderHub = (moduleStatus: Record<string, boolean> = {}) => render(
  <MemoryRouter initialEntries={['/service-portal/tiempo-asistencia']}>
    <GestionTiempoAsistencia moduleStatus={moduleStatus} />
    <LocationProbe />
  </MemoryRouter>,
);

describe('Gestión de Tiempo y Asistencia', () => {
  beforeEach(() => { mocks.permisos = []; });

  it('falla cerrado y permite volver al inicio cuando no hay opciones', () => {
    renderHub();
    expect(screen.getByText('No hay opciones disponibles')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Volver al inicio' })[1]);
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/service-portal/inicio');
  });

  it('muestra únicamente biometría para su permiso y navega con un botón accesible', () => {
    mocks.permisos = ['biometria'];
    renderHub();
    const opcion = screen.getByRole('button', { name: /Biometría y asistencia/i });
    expect(opcion).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Planificador semanal/i })).not.toBeInTheDocument();
    fireEvent.click(opcion);
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/service-portal/biometria');
  });

  it('mueve la descripción de cada acceso a un tooltip accesible', () => {
    mocks.permisos = ['biometria'];
    renderHub();

    const descripcion = screen.getByText('Registra tu asistencia y consulta la información habilitada para tu equipo.');
    const tooltip = descripcion.closest('[role="tooltip"]');
    const boton = screen.getByRole('button', { name: 'Biometría y asistencia' });
    expect(tooltip).toBeInTheDocument();
    expect(boton).toHaveAttribute('aria-describedby', tooltip?.id);
  });

  it('agrupa la unión de permisos y oculta secciones vacías', () => {
    mocks.permisos = ['nomina_horas_extras.planificar', 'alcance_empleados.administrar'];
    renderHub();
    expect(screen.getByRole('region', { name: 'Asistencia' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Planificación de horarios' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Horas extras' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Administración' })).toBeInTheDocument();
  });

  it('respeta el estado deshabilitado de horas extras', () => {
    mocks.permisos = ['nomina_horas_extras.leer', 'nomina_horas_extras.plantillas_horario.administrar'];
    renderHub({ nomina_horas_extras: false });
    expect(screen.getByRole('button', { name: /Plantillas de horario/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cálculos/i })).not.toBeInTheDocument();
  });

  it.each(OPCIONES_TIEMPO_ASISTENCIA)('navega desde $id hacia su ruta histórica', (opcion) => {
    mocks.permisos = [opcion.permiso];
    renderHub();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(opcion.titulo, 'i') }));
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent(opcion.ruta);
  });
});
