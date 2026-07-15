import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchableSelect } from './SearchableSelect';
import Button from './Button';


describe('SearchableSelect', () => {
  it('permite seleccionar una opción usando solo teclado', async () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        label="Equipo"
        options={[
          { value: '1', label: 'Galaxy' },
          { value: '2', label: 'iPhone' },
        ]}
        onChange={onChange}
      />,
    );

    const combo = screen.getByRole('combobox', { name: 'Equipo' });
    combo.focus();
    fireEvent.keyDown(combo, { key: 'Enter' });
    const search = screen.getByRole('searchbox');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    const option = screen.getByRole('option', { name: 'Galaxy' });
    expect(option).toHaveFocus();
    fireEvent.keyDown(option, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await waitFor(() => expect(combo).toHaveFocus());
  });

  it('cierra el listado y avanza al siguiente control con Tab', async () => {
    render(
      <>
        <SearchableSelect
          label="Equipo"
          options={[{ value: '1', label: 'Galaxy' }]}
          onChange={vi.fn()}
        />
        <Button type="button">Siguiente control</Button>
      </>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Equipo' }));
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Tab' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente control' })).toHaveFocus());
  });

  it('cierra el listado con Escape', () => {
    render(
      <SearchableSelect
        label="Equipo"
        options={[{ value: '1', label: 'Galaxy' }]}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Equipo' }));
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('reserva espacio separado para buscador y lista', () => {
    render(
      <SearchableSelect
        label="Equipo"
        options={Array.from({ length: 20 }, (_, index) => ({
          value: String(index),
          label: `Equipo ${index}`,
        }))}
        onChange={vi.fn()}
      />,
    );
    const combo = screen.getByRole('combobox', { name: 'Equipo' });
    vi.spyOn(combo, 'getBoundingClientRect').mockReturnValue({
      top: 500,
      bottom: 540,
      left: 20,
      right: 260,
      width: 240,
      height: 40,
      x: 20,
      y: 500,
      toJSON: () => ({}),
    });
    fireEvent.click(combo);

    const listbox = screen.getByRole('listbox');
    const popover = listbox.parentElement;
    expect(parseInt(popover?.style.maxHeight || '0', 10)).toBe(
      parseInt(listbox.style.maxHeight, 10) + 60,
    );
  });
});
