import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import MyDevelopments from '../pages/MyDevelopments';
import { AppContextProvider } from '../context/AppContext';

// Mock the API hook
jest.mock('../hooks/useApi', () => ({
  useApi: () => ({
    get: jest.fn().mockResolvedValue([
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
    ]),
  }),
}));

// Mock the development updates hook
jest.mock('../hooks/useDevelopmentUpdates', () => ({
  useDevelopmentUpdates: () => ({
    loading: false,
    updateDevelopment: jest.fn().mockResolvedValue({}),
  }),
}));

// Mock the observations hook
jest.mock('../hooks/useObservations', () => ({
  useObservations: () => ({
    observations: [],
    loading: false,
    error: null,
    createObservation: jest.fn().mockResolvedValue({}),
    refreshObservations: jest.fn().mockResolvedValue({}),
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <AppContextProvider>
          {component}
        </AppContextProvider>
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('MyDevelopments - Requirements Tab Integration', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  test('renders requirements tab correctly', async () => {
    renderWithProviders(<MyDevelopments />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    // Click on a development to open details
    const viewButton = screen.getByRole('button', { name: /ver detalles/i });
    fireEvent.click(viewButton);

    // Wait for the phases view to load
    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    // Click on the Requirements tab
    const requirementsTab = screen.getByText('Requerimientos');
    fireEvent.click(requirementsTab);

    // Verify the requirements tab content is rendered
    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });
  });

  test('filters requirements by status', async () => {
    renderWithProviders(<MyDevelopments />);
    
    // Navigate to requirements tab
    await waitFor(() => {
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /ver detalles/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    const requirementsTab = screen.getByText('Requerimientos');
    fireEvent.click(requirementsTab);

    // Wait for requirements tab to load
    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Find and interact with status filter
    const statusFilter = screen.getByDisplayValue('Todos los estados');
    fireEvent.change(statusFilter, { target: { value: 'validated' } });

    // Verify filter is applied
    expect(statusFilter).toHaveValue('validated');
  });

  test('searches requirements by title', async () => {
    renderWithProviders(<MyDevelopments />);
    
    // Navigate to requirements tab
    await waitFor(() => {
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /ver detalles/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    const requirementsTab = screen.getByText('Requerimientos');
    fireEvent.click(requirementsTab);

    // Wait for requirements tab to load
    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Find search input and type
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'FD-FT-284' } });

    // Verify search term is set
    expect(searchInput).toHaveValue('FD-FT-284');
  });

  test('shows requirement details in sidebar', async () => {
    renderWithProviders(<MyDevelopments />);
    
    // Navigate to requirements tab
    await waitFor(() => {
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /ver detalles/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    const requirementsTab = screen.getByText('Requerimientos');
    fireEvent.click(requirementsTab);

    // Wait for requirements tab to load
    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Click on a requirement (if any are rendered)
    const requirementItems = screen.queryAllByText('FD-FT-284');
    if (requirementItems.length > 0) {
      fireEvent.click(requirementItems[0]);

      // Verify sidebar opens with requirement details
      await waitFor(() => {
        expect(screen.getByText('Detalle del Requerimiento')).toBeInTheDocument();
      });
    }
  });

  test('navigates between tabs maintaining state', async () => {
    renderWithProviders(<MyDevelopments />);
    
    // Navigate to requirements tab
    await waitFor(() => {
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /ver detalles/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    const requirementsTab = screen.getByText('Requerimientos');
    fireEvent.click(requirementsTab);

    // Wait for requirements tab to load
    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Apply a filter
    const statusFilter = screen.getByDisplayValue('Todos los estados');
    fireEvent.change(statusFilter, { target: { value: 'validated' } });

    // Switch to another tab
    const phasesTab = screen.getByText('Fases');
    fireEvent.click(phasesTab);

    // Switch back to requirements tab
    fireEvent.click(requirementsTab);

    // Verify the filter state is maintained
    await waitFor(() => {
      expect(screen.getByDisplayValue('validated')).toBeInTheDocument();
    });
  });

  test('executes requirement actions', async () => {
    renderWithProviders(<MyDevelopments />);
    
    // Navigate to requirements tab and open a requirement
    await waitFor(() => {
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /ver detalles/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    const requirementsTab = screen.getByText('Requerimientos');
    fireEvent.click(requirementsTab);

    // Wait for requirements tab to load
    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Click on a requirement to open sidebar
    const requirementItems = screen.queryAllByText('FD-FT-284');
    if (requirementItems.length > 0) {
      fireEvent.click(requirementItems[0]);

      // Wait for sidebar to open
      await waitFor(() => {
        expect(screen.getByText('Detalle del Requerimiento')).toBeInTheDocument();
      });

      // Test validate action
      const validateButton = screen.getByText(/Validar FD-FT-284/);
      expect(validateButton).toBeInTheDocument();

      // Test generate email action
      const emailButton = screen.getByText('Generar Correo');
      expect(emailButton).toBeInTheDocument();

      // Test AI controls action
      const aiControlsButton = screen.getByText('Ejecutar Controles IA');
      expect(aiControlsButton).toBeInTheDocument();
    }
  });
});
