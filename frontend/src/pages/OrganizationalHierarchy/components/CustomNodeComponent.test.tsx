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

  it('permite seleccionar la tarjeta con teclado', () => {
    const data = createData({
      usuario_id: '1',
      usuario: { id: '1', cedula: '10001', nombre: 'Ana Torres', rol: 'Analista' },
      subordinados: [],
    });
    render(<CustomNodeComponent data={data} isConnectable={false} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /torres ana/i }), { key: 'Enter' });

    expect(data.onSelect).toHaveBeenCalledWith('1');
  });

  it('expone el estado de expansión y mantiene un target táctil suficiente', () => {
    const onToggle = vi.fn();
    const data = {
      ...createData({
        usuario_id: '1',
        usuario: { id: '1', cedula: '10001', nombre: 'Ana Torres', rol: 'Analista' },
        subordinados: [],
      }),
      hasChildren: true,
      isExpanded: false,
      onToggle,
    };
    render(<CustomNodeComponent data={data} isConnectable={false} />);

    const expandButton = screen.getByRole('button', { name: 'Expandir rama' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(expandButton).toHaveClass('min-w-11', 'min-h-11');
    fireEvent.keyDown(expandButton, { key: 'Enter' });
    fireEvent.keyDown(expandButton, { key: ' ' });

    expect(data.onSelect).not.toHaveBeenCalled();
    fireEvent.click(expandButton);

    expect(onToggle).toHaveBeenCalledOnce();
    expect(data.onSelect).not.toHaveBeenCalled();
  });
});
