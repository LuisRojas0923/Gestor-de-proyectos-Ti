import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from '../DataTable';

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', label: 'Nombre', render: row => row.name },
];

const rows: Row[] = [
  { id: 'A', name: 'Actividad A' },
  { id: 'B', name: 'Actividad B' },
];

describe('DataTable — drag/drop', () => {
  it('renderiza el handle de arrastre cuando isRowDraggable está activo', () => {
    render(
      <DataTable<Row>
        columns={columns}
        data={rows}
        keyExtractor={row => row.id}
        isRowDraggable
      />
    );

    expect(screen.getByLabelText(/Mover fila 1/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mover fila 2/)).toBeInTheDocument();
  });

  it('llama onRowsReorder al soltar una fila sobre otra', () => {
    const onRowsReorder = vi.fn();
    render(
      <DataTable<Row>
        columns={columns}
        data={rows}
        keyExtractor={row => row.id}
        isRowDraggable
        onRowsReorder={onRowsReorder}
      />
    );

    const firstHandle = screen.getByLabelText(/Mover fila 1/);
    const secondRow = screen.getByText('Actividad B').closest('.grid');
    expect(secondRow).not.toBeNull();

    fireEvent.dragStart(firstHandle, { dataTransfer: createDataTransfer() });
    fireEvent.dragOver(secondRow!);
    fireEvent.drop(secondRow!);

    expect(onRowsReorder).toHaveBeenCalledWith(0, 1);
  });
});

describe('DataTable — accesibilidad de filtros', () => {
  it('expone tabla, encabezado y opciones de filtro operables', async () => {
    const onFilterChange = vi.fn();
    render(
      <DataTable<Row>
        columns={[{ key: 'name', label: 'Nombre', filterable: true }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: ['Actividad A', 'Actividad B'] }}
        onFilterChange={onFilterChange}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    const header = screen.getByRole('button', { name: 'Nombre' });
    header.focus();
    fireEvent.click(header);

    const option = screen.getByRole('button', { name: 'Actividad A' });
    expect(option).toHaveAttribute('aria-pressed', 'false');
    expect(within(option).getByText('Actividad A')).toHaveClass('text-left');
    option.focus();
    expect(option).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Nombre' })).not.toBeInTheDocument();
    await waitFor(() => expect(header).toHaveFocus());
  });

  it('alinea a la derecha los textos del filtro cuando se solicita', () => {
    render(
      <DataTable<Row>
        columns={[{ key: 'name', label: 'Nombre', filterable: true }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: ['Actividad A'] }}
        onFilterChange={vi.fn()}
        onSort={vi.fn()}
        filterTextAlign="right"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nombre' }));

    const filter = screen.getByRole('dialog', { name: 'Nombre' });
    expect(within(filter).getByText('Ordenar')).toHaveClass('text-right');
    expect(screen.getByText('Seleccionar Todos')).toHaveClass('text-right', 'flex-1');
    expect(within(filter).getByText('Actividad A')).toHaveClass('text-right', 'flex-1');
    expect(screen.getByPlaceholderText('Buscar...')).toHaveClass('text-right');
  });
});

function createDataTransfer() {
  return {
    effectAllowed: '',
    setData: vi.fn(),
    getData: vi.fn(),
  };
}
