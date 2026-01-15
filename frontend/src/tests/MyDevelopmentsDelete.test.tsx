import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import MyDevelopments from '../pages/MyDevelopments';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { useDevelopmentUpdates } from '../hooks/useDevelopmentUpdates';
import { useObservations } from '../hooks/useObservations';
import { Development } from '../types';

// Mock de las dependencias
vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: vi.fn() })
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

vi.mock('../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../hooks/useDevelopmentUpdates', () => ({
  useDevelopmentUpdates: vi.fn(),
}));

vi.mock('../hooks/useObservations', () => ({
  useObservations: vi.fn(),
}));

// Mock de los componentes hijos
vi.mock('../components/common/ExcelImporter', () => ({
  default: ({ onImport }: { onImport: (data: unknown[]) => void }) => (
    <div data-testid="excel-importer">
      <button onClick={() => onImport([])}>Importar</button>
    </div>
  ),
}));

vi.mock('../components/development', () => ({
  DevelopmentPhases: ({ developmentId }: { developmentId: string }) => (
    <div data-testid="development-phases">Fases para {developmentId}</div>
  ),
  DevelopmentTimeline: ({ currentDevelopment }: { currentDevelopment: Development | null }) => (
    <div data-testid="development-timeline">Timeline para {currentDevelopment?.id}</div>
  ),
}));

vi.mock('../components/development/RequirementsTab', () => ({
  default: ({ developmentId }: { developmentId: string }) => (
    <div data-testid="requirements-tab">Requerimientos para {developmentId}</div>
  ),
}));

describe('MyDevelopments - Función de Eliminar', () => {
  const mockDevelopment = {
    id: 'TEST-001',
    name: 'Desarrollo de Prueba',
    provider: 'Proveedor Test',
    main_responsible: 'Responsable Test',
    general_status: 'En curso',
    current_stage: {
      stage_name: '2. Análisis',
      id: 2,
    },
    description: 'Descripción de prueba',
    module: 'Módulo Test',
    type: 'Desarrollo',
    environment: 'Test',
    remedy_link: 'https://remedy.test.com/TEST-001',
    estimated_end_date: '2024-12-31',
    current_phase_id: 1,
    current_stage_id: 2,
    stage_progress_percentage: 50,
  };

  const mockDeleteRequest = vi.fn();
  const mockGetRequest = vi.fn();
  const mockUpdateDevelopment = vi.fn();
  const mockCreateObservation = vi.fn();
  const mockRefreshObservations = vi.fn();

  beforeEach(() => {
    // Reset de todos los mocks
    vi.clearAllMocks();

    // Mock del contexto de la aplicación
    (useAppContext as Mock).mockReturnValue({
      state: { darkMode: false },
    });

    // Mock del hook useApi
    (useApi as Mock).mockReturnValue({
      get: mockGetRequest,
      delete: mockDeleteRequest,
      loading: false,
      error: null,
    });

    // Mock del hook useDevelopmentUpdates
    (useDevelopmentUpdates as Mock).mockReturnValue({
      loading: false,
      updateDevelopment: mockUpdateDevelopment,
    });

    // Mock del hook useObservations
    (useObservations as Mock).mockReturnValue({
      observations: [],
      loading: false,
      error: null,
      createObservation: mockCreateObservation,
      refreshObservations: mockRefreshObservations,
    });

    // Mock de fetch global para las peticiones
    globalThis.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería mostrar el modal de confirmación al hacer clic en eliminar', async () => {
    // Configurar mock para cargar desarrollos
    mockGetRequest.mockResolvedValue([mockDevelopment]);

    render(<MyDevelopments />);

    // Esperar a que se carguen los desarrollos
    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
    });

    // Buscar el botón de menú (tres puntos)
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);

    // Buscar el botón de eliminar
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Verificar que se muestra el modal de confirmación
    expect(screen.getByText('¿Cancelar Desarrollo?')).toBeInTheDocument();
    expect(screen.getByText(/¿Estás seguro de que deseas cancelar el desarrollo/)).toBeInTheDocument();
    expect(screen.getByText('"Desarrollo de Prueba" (TEST-001)')).toBeInTheDocument();
  });

  it('debería cancelar la eliminación al hacer clic en Cancelar', async () => {
    mockGetRequest.mockResolvedValue([mockDevelopment]);

    render(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
    });

    // Abrir menú y hacer clic en eliminar
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Hacer clic en Cancelar
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    // Verificar que el modal se cerró
    expect(screen.queryByText('¿Cancelar Desarrollo?')).not.toBeInTheDocument();

    // Verificar que no se llamó a la función de actualizar
    expect(mockUpdateDevelopment).not.toHaveBeenCalled();
  });

  it('debería cancelar el desarrollo exitosamente', async () => {
    // Configurar mock para cargar desarrollos
    mockGetRequest.mockResolvedValue([mockDevelopment]);

    // Configurar mock para la actualización exitosa
    mockUpdateDevelopment.mockResolvedValue({
      ...mockDevelopment,
      general_status: 'Cancelado',
      current_stage: { stage_name: '0. Cancelado', id: 11 }
    });

    render(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
    });

    // Abrir menú y hacer clic en eliminar
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Hacer clic en confirmar cancelación
    const confirmButton = screen.getByText('Cancelar');
    fireEvent.click(confirmButton);

    // Verificar que se llamó a la función de actualizar con los datos correctos
    await waitFor(() => {
      expect(mockUpdateDevelopment).toHaveBeenCalledWith('TEST-001', {
        name: 'Desarrollo de Prueba',
        description: 'Descripción de prueba',
        current_stage_id: 11
      });
    });

    // Verificar que el modal se cerró
    expect(screen.queryByText('¿Cancelar Desarrollo?')).not.toBeInTheDocument();
  });

  it('debería manejar errores al cancelar desarrollo', async () => {
    mockGetRequest.mockResolvedValue([mockDevelopment]);

    // Configurar mock para error en la actualización
    const errorMessage = 'Error al cancelar el desarrollo';
    mockUpdateDevelopment.mockRejectedValue(new Error(errorMessage));

    render(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
    });

    // Abrir menú y hacer clic en eliminar
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Hacer clic en confirmar cancelación
    const confirmButton = screen.getByText('Cancelar');
    fireEvent.click(confirmButton);

    // Verificar que se llamó a la función de actualizar
    await waitFor(() => {
      expect(mockUpdateDevelopment).toHaveBeenCalledWith('TEST-001', {
        name: 'Desarrollo de Prueba',
        description: 'Descripción de prueba',
        current_stage_id: 11
      });
    });
  });

  it('debería actualizar la lista local después de cancelar exitosamente', async () => {
    const initialDevelopments = [mockDevelopment, {
      id: 'TEST-002',
      name: 'Otro Desarrollo',
      provider: 'Proveedor Test',
      main_responsible: 'Responsable Test',
      general_status: 'Pendiente',
      current_stage: { stage_name: '1. Definición', id: 1 },
    }];

    mockGetRequest.mockResolvedValue(initialDevelopments);
    mockUpdateDevelopment.mockResolvedValue({
      ...mockDevelopment,
      general_status: 'Cancelado',
      current_stage: { stage_name: '0. Cancelado', id: 11 }
    });

    render(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
      expect(screen.getByText('Otro Desarrollo')).toBeInTheDocument();
    });

    // Abrir menú y hacer clic en eliminar
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Hacer clic en confirmar cancelación
    const confirmButton = screen.getByText('Cancelar');
    fireEvent.click(confirmButton);

    // Verificar que el desarrollo cancelado se actualiza en la lista
    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
      expect(screen.getByText('Otro Desarrollo')).toBeInTheDocument();
      // El desarrollo debería mostrar estado "Cancelado"
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });
  });

  it('debería limpiar la selección si se cancela el desarrollo seleccionado', async () => {
    mockGetRequest.mockResolvedValue([mockDevelopment]);
    mockUpdateDevelopment.mockResolvedValue({
      ...mockDevelopment,
      general_status: 'Cancelado',
      current_stage: { stage_name: '0. Cancelado', id: 11 }
    });

    render(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
    });

    // Hacer clic en ver detalles para seleccionar el desarrollo
    const viewButton = screen.getByRole('button', { name: /eye/i });
    fireEvent.click(viewButton);

    // Verificar que se cambió a la vista de fases
    await waitFor(() => {
      expect(screen.getByText('Fases para TEST-001')).toBeInTheDocument();
    });

    // Abrir menú y hacer clic en eliminar
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Hacer clic en confirmar cancelación
    const confirmButton = screen.getByText('Cancelar');
    fireEvent.click(confirmButton);

    // Verificar que se regresa a la vista de lista
    await waitFor(() => {
      expect(screen.queryByText('Fases para TEST-001')).not.toBeInTheDocument();
      expect(screen.getByText('Selecciona un Desarrollo')).toBeInTheDocument();
    });
  });

  it('debería usar la función de actualización correcta', async () => {
    mockGetRequest.mockResolvedValue([mockDevelopment]);
    mockUpdateDevelopment.mockResolvedValue({
      ...mockDevelopment,
      general_status: 'Cancelado',
      current_stage: { stage_name: '0. Cancelado', id: 11 }
    });

    render(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
    });

    // Abrir menú y hacer clic en eliminar
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Hacer clic en confirmar cancelación
    const confirmButton = screen.getByText('Cancelar');
    fireEvent.click(confirmButton);

    // Verificar que se usa la función de actualización correcta
    await waitFor(() => {
      expect(mockUpdateDevelopment).toHaveBeenCalledWith('TEST-001', {
        name: 'Desarrollo de Prueba',
        description: 'Descripción de prueba',
        current_stage_id: 11
      });
    });
  });

  it('debería mostrar el ícono de advertencia en el modal de confirmación', async () => {
    mockGetRequest.mockResolvedValue([mockDevelopment]);

    render(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Prueba')).toBeInTheDocument();
    });

    // Abrir menú y hacer clic en eliminar
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    // Verificar que se muestra el ícono de advertencia
    expect(screen.getByText('⚠️ El desarrollo se marcará como cancelado y no se podrá reactivar fácilmente.')).toBeInTheDocument();
  });
});
