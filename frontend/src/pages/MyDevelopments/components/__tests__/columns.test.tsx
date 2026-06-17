import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { getColumns } from '../columns';
import type { DevelopmentRow } from '../columns';

const baseRow: DevelopmentRow = {
  id: 'FD-001',
  name: 'Proyecto Test',
  estado_general: 'En Proceso',
  autoridad: 'USR-1',
  responsable: 'USR-2',
  tareas_completadas: 2,
  tareas_totales: 3,
} as DevelopmentRow;

describe('getColumns — columna de revisión', () => {
  it('NO agrega la columna review si reviewed no se pasa', () => {
    const columns = getColumns(() => undefined);
    expect(columns.find(c => c.key === '__review__')).toBeUndefined();
  });

  it('SÍ agrega la columna review si reviewed se pasa', () => {
    const columns = getColumns(() => undefined, { ids: new Set(), toggle: () => {} });
    expect(columns[0].key).toBe('__review__');
  });

  it('el render del review muestra checked=true si el id está en el Set', () => {
    const columns = getColumns(() => undefined, {
      ids: new Set(['FD-001']),
      toggle: () => {},
    });
    const ReviewCol = columns[0];
    const { container } = render(<>{ReviewCol.render!(baseRow)}</>);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.checked).toBe(true);
    expect(input.getAttribute('aria-label')).toBe('Marcar actividad FD-001 como revisada');
  });

  it('el render del review muestra checked=false si el id NO está en el Set', () => {
    const columns = getColumns(() => undefined, {
      ids: new Set(['OTRO-ID']),
      toggle: () => {},
    });
    const ReviewCol = columns[0];
    const { container } = render(<>{ReviewCol.render!(baseRow)}</>);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  it('el click sobre el checkbox llama a toggle con el id', () => {
    const toggle = vi.fn();
    const columns = getColumns(() => undefined, {
      ids: new Set<string>(),
      toggle,
    });
    const ReviewCol = columns[0];
    const { container } = render(<>{ReviewCol.render!(baseRow)}</>);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(input);
    expect(toggle).toHaveBeenCalledWith('FD-001');
  });

  it('el click sobre el wrapper no propaga (e.stopPropagation en onClick)', () => {
    // El row click de DataTable es la preocupación: si el bubble sube, navega al detalle.
    // Renderizamos el ReviewCol dentro de un div padre con onClick espía;
    // si el wrapper llama stopPropagation, el padre no debe enterarse.
    const parentClick = vi.fn();
    const columns = getColumns(() => undefined, { ids: new Set(), toggle: () => {} });
    const ReviewCol = columns[0];
    render(
      <div onClick={parentClick} data-testid="row">
        {ReviewCol.render!(baseRow)}
      </div>
    );
    const wrapper = screen.getByTestId('review-FD-001');
    fireEvent.click(wrapper);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('muestra el fraccionario de tareas bajo el progreso', () => {
    const columns = getColumns(() => undefined, { ids: new Set(), toggle: () => {} });
    const StatusCol = columns.find(c => c.key === 'status');
    expect(StatusCol?.render).toBeDefined();

    render(<>{StatusCol!.render!(baseRow)}</>);

    expect(screen.getByText('2/3')).toBeInTheDocument();
  });
});
