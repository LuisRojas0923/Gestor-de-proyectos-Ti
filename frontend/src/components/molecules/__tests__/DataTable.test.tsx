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

function createDataTransfer() {
  return {
    effectAllowed: '',
    setData: vi.fn(),
    getData: vi.fn(),
  };
}
