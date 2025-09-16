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

describe('Requirements Consolidation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('complete requirements workflow integration', async () => {
    renderWithProviders(<MyDevelopments />);
    
    // 1. Navigate to developments page
    await waitFor(() => {
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    // 2. Select a development
    const viewButton = screen.getByRole('button', { name: /ver detalles/i });
    fireEvent.click(viewButton);

    // 3. Verify phases view opens
    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    // 4. Navigate to requirements tab
    const requirementsTab = screen.getByText('Requerimientos');
    fireEvent.click(requirementsTab);

    // 5. Verify requirements tab loads
    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // 6. Test search functionality
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');

    // 7. Test filter functionality
    const statusFilter = screen.getByDisplayValue('Todos los estados');
    fireEvent.change(statusFilter, { target: { value: 'validated' } });
    expect(statusFilter).toHaveValue('validated');

    // 8. Test priority filter
    const priorityFilter = screen.getByDisplayValue('Todas las prioridades');
    fireEvent.change(priorityFilter, { target: { value: 'high' } });
    expect(priorityFilter).toHaveValue('high');

    // 9. Verify filter counter updates
    expect(screen.getByText(/de \d+ requerimientos/)).toBeInTheDocument();

    // 10. Test navigation back to other tabs
    const phasesTab = screen.getByText('Fases');
    fireEvent.click(phasesTab);

    await waitFor(() => {
      expect(screen.getByText('Fases')).toBeInTheDocument();
    });

    // 11. Navigate back to requirements and verify state persistence
    fireEvent.click(requirementsTab);

    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Verify filters are still applied
    expect(screen.getByDisplayValue('validated')).toBeInTheDocument();
    expect(screen.getByDisplayValue('high')).toBeInTheDocument();
  });

  test('requirements tab responsive behavior', async () => {
    // Mock window.innerWidth for mobile testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // Tablet width
    });

    renderWithProviders(<MyDevelopments />);
    
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

    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Verify responsive layout elements are present
    expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Requerimiento')).toBeInTheDocument();
  });

  test('requirements tab dark mode compatibility', async () => {
    renderWithProviders(<MyDevelopments />);
    
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

    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Verify dark mode classes are applied
    const requirementsContainer = screen.getByText('Requerimientos del Desarrollo').closest('div');
    expect(requirementsContainer).toHaveClass('text-white');
  });

  test('requirements tab accessibility', async () => {
    renderWithProviders(<MyDevelopments />);
    
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

    await waitFor(() => {
      expect(screen.getByText('Requerimientos del Desarrollo')).toBeInTheDocument();
    });

    // Test keyboard navigation
    const searchInput = screen.getByPlaceholderText('Buscar');
    searchInput.focus();
    expect(searchInput).toHaveFocus();

    // Test tab navigation
    fireEvent.keyDown(searchInput, { key: 'Tab' });
    
    // Verify accessibility attributes
    expect(screen.getByRole('button', { name: 'Nuevo Requerimiento' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Todos los estados' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Todas las prioridades' })).toBeInTheDocument();
  });

  test('requirements tab error handling', async () => {
    // Mock API error
    const mockApi = {
      get: jest.fn().mockRejectedValue(new Error('API Error')),
    };

    jest.doMock('../hooks/useApi', () => ({
      useApi: () => mockApi,
    }));

    renderWithProviders(<MyDevelopments />);
    
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

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch requirements')).toBeInTheDocument();
    });
  });

  test('requirements tab loading states', async () => {
    // Mock loading state
    const mockApi = {
      get: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
    };

    jest.doMock('../hooks/useApi', () => ({
      useApi: () => mockApi,
    }));

    renderWithProviders(<MyDevelopments />);
    
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

    // Verify loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
