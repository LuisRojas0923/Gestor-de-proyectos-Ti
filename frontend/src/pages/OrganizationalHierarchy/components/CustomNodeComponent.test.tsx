import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HierarchyNode } from '../../../types/hierarchy';
import { CustomNodeComponent, type CustomNodeData } from './CustomNodeComponent';

vi.mock('@xyflow/react', () => ({
  Handle: () => <div data-testid="handle" />,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

const createData = (nodeData: HierarchyNode): CustomNodeData => ({
  nodeData,
  level: 0,
  selected: false,
  onSelect: vi.fn(),
  isExpanded: false,
  hasChildren: false,
});

describe('CustomNodeComponent', () => {
  it('muestra el cargo y selecciona el identificador del usuario', () => {
    const data = createData({
      usuario_id: '1',
      usuario: {
        id: '1',
        cedula: '10001',
        nombre: 'Ana Torres',
        rol: 'Analista',
        cargo: 'Coordinadora',
      },
      subordinados: [],
    });

    render(<CustomNodeComponent data={data} isConnectable={false} />);

    expect(screen.getByText('Coordinadora')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Coordinadora'));
    expect(data.onSelect).toHaveBeenCalledWith('1');
  });

  it('usa el rol como fallback y tolera identificadores vacios', () => {
    const data = createData({
      usuario_id: '',
      usuario: {
        id: '',
        cedula: '',
        nombre: '',
        rol: 'Analista',
        cargo: null,
      },
      subordinados: [],
    });

    render(<CustomNodeComponent data={data} isConnectable={false} />);

    expect(screen.getByText('Analista')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Analista'));
    expect(data.onSelect).toHaveBeenCalledWith('');
  });
});
