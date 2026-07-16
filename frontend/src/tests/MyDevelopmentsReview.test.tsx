import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { NotificationsProvider } from '../components/notifications/NotificationsContext';
import MyDevelopments from '../pages/MyDevelopments';
import { AppProvider } from '../context/AppContext';

// Mock the API hook to return multiple developments
const mockGet = vi.fn().mockResolvedValue([
  {
    id: 'DEV-101',
    name: 'Desarrollo de Prueba TDD 1',
    descripcion: 'Una descripcion de prueba',
    estado_general: 'Pendiente',
    creado_por_id: 'USR-1',
    tipo: 'Mejora',
    start_date: '2025-01-01',
    estimated_end_date: '2025-02-01',
  },
  {
    id: 'DEV-102',
    name: 'Desarrollo de Prueba TDD 2',
    descripcion: 'Otra descripcion de prueba',
    estado_general: 'En Proceso',
    creado_por_id: 'USR-2',
    tipo: 'Actividad',
    start_date: '2025-01-01',
    estimated_end_date: '2025-02-01',
  }
]);
const mockGetWithHeaders = vi.fn().mockResolvedValue({
  data: [
    {
      id: 'DEV-101',
      name: 'Desarrollo de Prueba TDD 1',
      descripcion: 'Una descripcion de prueba',
      estado_general: 'Pendiente',
      creado_por_id: 'USR-1',
      tipo: 'Mejora',
      start_date: '2025-01-01',
      estimated_end_date: '2025-02-01',
    },
    {
      id: 'DEV-102',
      name: 'Desarrollo de Prueba TDD 2',
      descripcion: 'Otra descripcion de prueba',
      estado_general: 'En Proceso',
      creado_por_id: 'USR-2',
      tipo: 'Actividad',
      start_date: '2025-01-01',
      estimated_end_date: '2025-02-01',
    }
  ],
  headers: new Headers({ 'x-total-count': '2' })
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

describe('MyDevelopments Review & Filtering (TDD)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('clicking review checkbox toggles reviewed state without throwing errors', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('DEV-101')).toBeInTheDocument();
      expect(screen.getByText('DEV-102')).toBeInTheDocument();
    });

    const checkbox101 = screen.getByLabelText('Marcar actividad DEV-101 como revisada');
    expect(checkbox101).not.toBeChecked();

    fireEvent.click(checkbox101);

    await waitFor(() => {
      expect(checkbox101).toBeChecked();
    });
  });

  test('should allow filtering by review status', async () => {
    renderWithProviders(<MyDevelopments />);

    await waitFor(() => {
      expect(screen.getByText('DEV-101')).toBeInTheDocument();
      expect(screen.getByText('DEV-102')).toBeInTheDocument();
    });

    // Mark DEV-101 as reviewed
    const checkbox101 = screen.getByLabelText('Marcar actividad DEV-101 como revisada');
    fireEvent.click(checkbox101);

    await waitFor(() => {
      expect(checkbox101).toBeChecked();
    });

    // Get the column headers
    // The filter button for __review__ has label '✓' (from columns.tsx label)
    const reviewHeaderFilterButton = screen.getByRole('button', { name: '✓' });
    expect(reviewHeaderFilterButton).toBeInTheDocument();
  });
});
