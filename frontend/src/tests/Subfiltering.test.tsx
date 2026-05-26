import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import DataTable, { DataTableColumn } from '../components/molecules/DataTable';

interface MockData {
  id: number;
  name: string;
  tipo: string;
  description: string;
  creator: string;
}

const mockColumns: DataTableColumn<MockData>[] = [
  {
    key: 'id',
    label: 'ID',
    filterable: true,
    subFilters: [
      { key: 'id', label: 'ID' },
      { key: 'tipo', label: 'Tipo' }
    ]
  },
  {
    key: 'name',
    label: 'Proyecto',
    filterable: true,
    subFilters: [
      { key: 'name_name', label: 'Nombre' },
      { key: 'name_description', label: 'Descripción' },
      { key: 'name_creator', label: 'Creado por' }
    ]
  }
];

const mockData: MockData[] = [
  { id: 1, name: 'Project Alpha', tipo: 'Mejora', description: 'Desc A', creator: 'User X' },
  { id: 2, name: 'Project Beta', tipo: 'Proyecto', description: 'Desc B', creator: 'User Y' }
];

describe('DataTable sub-filtering', () => {
  it('renders table columns correctly', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(row) => String(row.id)}
      />
    );

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Proyecto')).toBeInTheDocument();
  });

  it('opens filter dropdown and displays sub-filter tab buttons', () => {
    const onFilterChange = vi.fn();
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(row) => String(row.id)}
        columnFilters={{}}
        columnOptions={{
          id: ['1', '2'],
          tipo: ['Mejora', 'Proyecto'],
          name_name: ['Project Alpha', 'Project Beta'],
          name_description: ['Desc A', 'Desc B'],
          name_creator: ['User X', 'User Y']
        }}
        onFilterChange={onFilterChange}
      />
    );

    // Click on filter button for 'ID' column
    const idHeaderButton = screen.getByRole('button', { name: /ID/ });
    fireEvent.click(idHeaderButton);

    // Verify sub-filter buttons for 'ID' and 'Tipo' are rendered
    const idButtons = screen.getAllByRole('button', { name: 'ID' });
    expect(idButtons.length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: /tipo/i })).toBeInTheDocument();
  });
});
