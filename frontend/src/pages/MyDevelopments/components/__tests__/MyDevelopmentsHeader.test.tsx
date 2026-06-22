import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MyDevelopmentsHeader } from '../MyDevelopmentsHeader';

const baseProps = {
  isPortal: false,
  totalCount: 5,
  statusGroups: { 'En Proceso': 2, 'Pendiente': 1, 'Completado': 2 } as Record<string, number>,
  activeFilterCount: 0,
  clearAllFilters: () => {},
  peopleSearch: '',
  setPeopleSearch: () => {},
  onOpenCreateModal: () => {},
  selectedStatus: null as string | null,
  onStatusSelect: () => {},
  reviewedCount: 0,
  clearReviewed: () => {},
  loadedCount: 5,
  hasMore: false,
  loadingMore: false,
  onLoadMore: () => {},
};

const renderWithRouter = (props: React.ComponentProps<typeof MyDevelopmentsHeader>) =>
  render(
    <MemoryRouter>
      <MyDevelopmentsHeader {...props} />
    </MemoryRouter>
  );

describe('MyDevelopmentsHeader — botón "Borrar checks"', () => {
  it('NO muestra el botón si reviewedCount === 0', () => {
    renderWithRouter({ ...baseProps, reviewedCount: 0, clearReviewed: () => {} });
    expect(screen.queryByText(/borrar 0 checks/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /borrar checks/i })).toBeNull();
  });

  it('SÍ muestra el botón con el singular si reviewedCount === 1', () => {
    renderWithRouter({ ...baseProps, reviewedCount: 1, clearReviewed: () => {} });
    expect(screen.getByText(/borrar 1 check\b/i)).toBeInTheDocument();
  });

  it('muestra el plural si reviewedCount > 1', () => {
    renderWithRouter({ ...baseProps, reviewedCount: 3, clearReviewed: () => {} });
    expect(screen.getByText(/borrar 3 checks/i)).toBeInTheDocument();
  });

  it('al hacer click llama a clearReviewed', () => {
    const clearReviewed = vi.fn();
    renderWithRouter({ ...baseProps, reviewedCount: 2, clearReviewed });
    const btn = screen.getByText(/borrar 2 checks/i).closest('button');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);
    expect(clearReviewed).toHaveBeenCalledTimes(1);
  });
});

describe('MyDevelopmentsHeader — botón "Limpiar filtros" (regresión)', () => {
  it('NO muestra el botón de limpiar filtros si activeFilterCount === 0', () => {
    renderWithRouter({ ...baseProps, reviewedCount: 0, clearReviewed: () => {} });
    expect(screen.queryByText(/limpiar 0 filtros/i)).toBeNull();
  });

  it('muestra el botón con el singular si activeFilterCount === 1', () => {
    renderWithRouter({ ...baseProps, activeFilterCount: 1, reviewedCount: 0, clearReviewed: () => {} });
    expect(screen.getByText(/limpiar 1 filtro\b/i)).toBeInTheDocument();
  });
});
