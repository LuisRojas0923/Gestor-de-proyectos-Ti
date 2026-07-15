import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('DataTable — filtros remotos', () => {
  it('mantiene abierto el filtro con scroll interno y lo cierra con scroll externo', () => {
    render(
      <DataTable<Row>
        columns={[{ key: 'name', label: 'Nombre', filterable: true }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: rows.map(row => row.name) }}
        onFilterChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nombre' }));
    const search = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.scroll(search.closest('.custom-scrollbar')!);
    expect(search).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(screen.queryByPlaceholderText(/Buscar/i)).not.toBeInTheDocument();
  });

  it('permite operar opciones con botones y conserva selecciones ocultas por búsqueda', () => {
    const onFilterChange = vi.fn();
    render(
      <DataTable<Row>
        columns={[{ key: 'name', label: 'Nombre', filterable: true }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: rows.map(row => row.name) }}
        onFilterChange={onFilterChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nombre' }));
    const primeraOpcion = screen.getByRole('button', { name: 'Actividad A' });
    expect(primeraOpcion).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(primeraOpcion);
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), { target: { value: 'Actividad B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onFilterChange).toHaveBeenCalledWith('name', new Set(['Actividad A', 'Actividad B']));
  });

  it('limpia la busqueda remota al aplicar el filtro', () => {
    const onFilterChange = vi.fn();
    const onFilterSearchChange = vi.fn();
    render(
      <DataTable<Row>
        columns={[{ key: 'name', label: 'Nombre', filterable: true }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: rows.map(row => row.name) }}
        onFilterChange={onFilterChange}
        remoteFilterSearch
        onFilterSearchChange={onFilterSearchChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Nombre/i }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), { target: { value: 'Actividad' } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));

    expect(onFilterSearchChange).toHaveBeenCalledWith('name', 'name', 'Actividad');
    expect(onFilterSearchChange).toHaveBeenCalledWith('name', 'name', '');
  });
});

function createDataTransfer() {
  return {
    effectAllowed: '',
    setData: vi.fn(),
    getData: vi.fn(),
  };
}
