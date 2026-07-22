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

  it.each([
    ['fila normal', false, 'Enter'],
    ['fila arrastrable', true, ' '],
  ])('activa la %s por teclado', (_label, isRowDraggable, key) => {
    const onRowClick = vi.fn();
    render(
      <DataTable<Row>
        columns={columns}
        data={rows}
        keyExtractor={row => row.id}
        isRowDraggable={isRowDraggable}
        onRowClick={onRowClick}
      />
    );

    fireEvent.keyDown(screen.getByRole('row', { name: 'Actividad A' }), { key });

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});

describe('DataTable — desplazamiento', () => {
  it('mantiene el encabezado alineado con el desplazamiento horizontal del cuerpo', () => {
    render(
      <DataTable<Row>
        columns={columns}
        data={rows}
        keyExtractor={row => row.id}
      />
    );

    const table = screen.getByRole('table');
    const body = screen.getByRole('rowgroup');
    const header = screen.getByRole('button', { name: 'Nombre' }).closest('[role="row"]') as HTMLElement;

    expect(table).toHaveClass('overflow-hidden');
    expect(body).toHaveClass('overflow-auto');
    body.scrollLeft = 240;
    fireEvent.scroll(body);

    expect(header.scrollLeft).toBe(240);
  });

  it('conserva el desplazamiento horizontal cuando no hay resultados', () => {
    render(
      <DataTable<Row>
        columns={columns}
        data={[]}
        keyExtractor={row => row.id}
      />
    );

    const body = screen.getByRole('rowgroup');
    const header = screen.getByRole('button', { name: 'Nombre' }).closest('[role="row"]') as HTMLElement;
    expect(body).toHaveClass('flex-1', 'overflow-auto');
    body.scrollLeft = 180;
    fireEvent.scroll(body);

    expect(header.scrollLeft).toBe(180);
  });
});

describe('DataTable — columnas agrupadas', () => {
  it('muestra el orden activo y ordena por el subfiltro seleccionado', () => {
    const onSort = vi.fn();
    render(
      <DataTable<Row>
        columns={[{
          key: 'name',
          label: 'Empleado',
          filterable: true,
          subFilters: [
            { key: 'name', label: 'Nombre' },
            { key: 'id', label: 'Cédula' },
          ],
        }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: rows.map(row => row.name), id: rows.map(row => row.id) }}
        onFilterChange={vi.fn()}
        activeSortKey="id"
        activeSortDir="asc"
        onSort={onSort}
      />
    );

    const header = screen.getByRole('button', { name: 'Empleado' });
    expect(header.closest('[role="columnheader"]')).toHaveAttribute('aria-sort', 'ascending');
    expect(header.querySelector('.lucide-arrow-up')).not.toBeNull();
    fireEvent.click(header);
    const cedulaFilter = screen.getByRole('button', { name: 'Cédula' });
    fireEvent.click(cedulaFilter);
    expect(cedulaFilter).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTitle('Descendente (Z → A)'));

    expect(onSort).toHaveBeenCalledWith('id', 'desc');
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

  it('no vuelve a filtrar localmente las opciones remotas', () => {
    render(
      <DataTable<Row>
        columns={[{ key: 'name', label: 'Nombre', filterable: true }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: ['Actividad A'] }}
        onFilterChange={vi.fn()}
        remoteFilterSearch
        onFilterSearchChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nombre' }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), {
      target: { value: 'coincidencia difusa' },
    });

    expect(screen.getByRole('button', { name: 'Actividad A' })).toBeInTheDocument();
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
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(createRect(420, 100));
    fireEvent.click(header);

    expect(screen.getByRole('dialog', { name: 'Nombre' })).toHaveStyle({ width: '420px' });
    const option = screen.getByRole('button', { name: 'Actividad A' });
    expect(option).toHaveAttribute('aria-pressed', 'false');
    expect(option).toHaveClass('!justify-start');
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
        filterDropdownMaxWidth={320}
      />
    );

    const header = screen.getByRole('button', { name: 'Nombre' });
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(createRect(420, 100));
    fireEvent.click(header);

    const filter = screen.getByRole('dialog', { name: 'Nombre' });
    const option = within(filter).getByRole('button', { name: 'Actividad A' });
    const optionText = within(option).getByText('Actividad A');
    const optionGroup = optionText.parentElement;
    const selectAllGroup = within(filter).getByText('Seleccionar Todos').parentElement;
    expect(filter).toHaveStyle({ width: '320px', left: '100px' });
    expect(within(filter).getByText('Ordenar')).toHaveClass('text-right');
    expect(option).toHaveClass('!justify-end');
    expect(optionGroup).toHaveClass('inline-flex', 'w-fit', 'max-w-full', 'min-w-0');
    expect(optionGroup?.children).toHaveLength(2);
    expect(selectAllGroup).toHaveClass('inline-flex', 'w-fit', 'max-w-full', 'min-w-0');
    expect(selectAllGroup?.children).toHaveLength(2);
    expect(optionText).toHaveClass('text-right');
    expect(optionText).not.toHaveClass('flex-1');
    expect(screen.getByPlaceholderText('Buscar...')).toHaveClass('text-right');
  });

  it('recalcula el filtro cuando cambia el viewport abierto', async () => {
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    render(
      <DataTable<Row>
        columns={[{ key: 'name', label: 'Nombre', filterable: true }]}
        data={rows}
        keyExtractor={row => row.id}
        columnOptions={{ name: ['Actividad A'] }}
        onFilterChange={vi.fn()}
        filterDropdownMaxWidth={320}
      />
    );

    const header = screen.getByRole('button', { name: 'Nombre' });
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(createRect(420, 100));
    fireEvent.click(header);

    const filter = screen.getByRole('dialog', { name: 'Nombre' });
    expect(filter).toHaveStyle({ width: '320px', left: '100px' });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    fireEvent(window, new Event('resize'));
    await waitFor(() => expect(filter).toHaveStyle({ width: '296px', left: '12px' }));
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth });
  });
});

function createRect(width: number, left: number): DOMRect {
  return {
    width,
    height: 40,
    top: 40,
    bottom: 80,
    left,
    right: left + width,
    x: left,
    y: 40,
    toJSON: () => ({}),
  };
}

function createDataTransfer() {
  return {
    effectAllowed: '',
    setData: vi.fn(),
    getData: vi.fn(),
  };
}
