import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HierarchyUser } from '../../../types/hierarchy';
import { AutocompleteUserField } from './AutocompleteUserField';

const createUser = (index: number): HierarchyUser => ({
  id: String(index),
  cedula: `100${String(index).padStart(2, '0')}`,
  nombre: `Usuario ${String(index).padStart(2, '0')}`,
  rol: 'Analista',
  cargo: index === 1 ? 'Coordinador' : null,
});

describe('AutocompleteUserField', () => {
  it('limita a 50 las opciones visibles', () => {
    render(
      <AutocompleteUserField
        label="Usuario"
        value=""
        onChange={vi.fn()}
        users={Array.from({ length: 51 }, (_, index) => createUser(index + 1))}
      />,
    );

    fireEvent.focus(screen.getByPlaceholderText('Nombre del empleado...'));

    expect(screen.getAllByRole('button')).toHaveLength(50);
    expect(screen.getByText('Usuario 50')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 51')).not.toBeInTheDocument();
  });

  it('busca por cedula y selecciona el usuario conservando su cargo', () => {
    const onChange = vi.fn();
    render(
      <AutocompleteUserField
        label="Usuario"
        value=""
        onChange={onChange}
        users={[createUser(1), createUser(2)]}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Cédula...'), { target: { value: '10001' } });

    expect(screen.getByText('10001 · Coordinador')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 02')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('excluye el usuario indicado y usa el rol cuando no hay cargo', () => {
    render(
      <AutocompleteUserField
        label="Usuario"
        value=""
        onChange={vi.fn()}
        users={[createUser(1), createUser(2)]}
        excludeId="1"
      />,
    );

    fireEvent.focus(screen.getByPlaceholderText('Nombre del empleado...'));

    expect(screen.queryByText('Usuario 01')).not.toBeInTheDocument();
    expect(screen.getByText('10002 · Analista')).toBeInTheDocument();
  });
});
