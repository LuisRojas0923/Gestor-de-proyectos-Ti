import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { NotificationsProvider } from '../components/notifications/NotificationsContext';
import MyDevelopments from '../pages/MyDevelopments';
import { AppProvider } from '../context/AppContext';

// Mock the API hook
const mockGet = vi.fn().mockResolvedValue([
  {
    id: 'FD-001',
    name: 'Test Development',
    provider: 'Test Provider',
    main_responsible: 'Test User',
    general_status: 'En curso',
    current_stage: { stage_name: '1. Definición' },
    start_date: '2025-01-01',
    estimated_end_date: '2025-02-01',
  }
]);
const mockGetWithHeaders = vi.fn().mockResolvedValue({ 
  data: [{
    id: 'FD-001',
    name: 'Test Development',
    provider: 'Test Provider',
    main_responsible: 'Test User',
    general_status: 'En curso',
    current_stage: { stage_name: '1. Definición' },
    start_date: '2025-01-01',
    estimated_end_date: '2025-02-01',
  }], 
  headers: new Headers({ 'x-total-count': '1' }) 
});
const mockDelete = vi.fn().mockResolvedValue({});
const mockPut = vi.fn().mockResolvedValue({});

vi.mock('../hooks/useApi', () => ({
  useApi: () => ({
    get: mockGet,
    getWithHeaders: mockGetWithHeaders,
    delete: mockDelete,
    put: mockPut,
  }),
}));

// Mock the development updates hook
vi.mock('../hooks/useDevelopmentUpdates', () => ({
  useDevelopmentUpdates: () => ({
    loading: false,
    updateDevelopment: vi.fn().mockResolvedValue({}),
  }),
}));

// Mock the observations hook
vi.mock('../hooks/useObservations', () => ({
  useObservations: () => ({
    observations: [],
    loading: false,
    error: null,
    createObservation: vi.fn().mockResolvedValue({}),
    refreshObservations: vi.fn().mockResolvedValue({}),
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <AppProvider>
          <NotificationsProvider>
            {component}
          </NotificationsProvider>
        </AppProvider>
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('MyDevelopments - Page Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders MyDevelopments page correctly', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Gestión de Actividades')).toBeInTheDocument();
    });

    // Verify the development FD-001 appears in the table
    await waitFor(() => {
      expect(screen.getByText('FD-001')).toBeInTheDocument();
    });
  });

  test('renders status filter chips', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Gestión de Actividades')).toBeInTheDocument();
    });

    // Verify status chip buttons are visible
    expect(screen.getByRole('button', { name: /Pendiente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /En Proceso/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completado/i })).toBeInTheDocument();
  });

  test('people search input works', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Gestión de Actividades')).toBeInTheDocument();
    });

    // Find the people search input by placeholder
    const searchInput = screen.getByPlaceholderText('Autoridad, líder, supervisor o ejecutor...');
    expect(searchInput).toBeInTheDocument();

    // Verify it accepts input
    fireEvent.change(searchInput, { target: { value: 'Test User' } });
    expect(searchInput).toHaveValue('Test User');
  });

  test('renders review checkbox for development', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('FD-001')).toBeInTheDocument();
    });

    // Verify the review checkbox exists
    const checkbox = screen.getByLabelText('Marcar actividad FD-001 como revisada');
    expect(checkbox).toBeInTheDocument();
  });

  test('renders Nueva Actividad button', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('Gestión de Actividades')).toBeInTheDocument();
    });

    // Verify the Nueva Actividad button exists
    expect(screen.getByText('Nueva Actividad')).toBeInTheDocument();
  });

  test('renders action buttons for development', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('FD-001')).toBeInTheDocument();
    });

    // Verify action buttons exist
    expect(screen.getByTitle('Actualizar')).toBeInTheDocument();
    expect(screen.getByTitle('Anular')).toBeInTheDocument();
  });
});
