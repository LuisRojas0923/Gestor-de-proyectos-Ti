import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EquiposManager } from './EquiposManager';
import { PersonasManager } from './PersonasManager';

vi.mock('../../../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));


describe('gestores de líneas corporativas', () => {
  it('muestra carga real y no expone datos ERP simulados', () => {
    render(
      <PersonasManager
        personas={[]}
        isLoading
        error={null}
        onRetry={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Cargando personas...')).toBeInTheDocument();
    expect(screen.queryByText(/Simulado/i)).not.toBeInTheDocument();
  });

  it('abre confirmación accesible antes de eliminar un equipo', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <EquiposManager
        equipos={[{ id: 1, modelo: 'Galaxy', estado_fisico: 'BUENO' }]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar equipo Galaxy' }));

    expect(screen.getByRole('dialog', { name: '¿Eliminar equipo?' })).toBeInTheDocument();
    expect(screen.getByText('¿Eliminar equipo?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(1));
  });

  it('cierra la confirmación con Escape y restaura el foco', async () => {
    render(
      <EquiposManager
        equipos={[{ id: 1, modelo: 'Galaxy', estado_fisico: 'BUENO' }]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Eliminar equipo Galaxy' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('distingue error de un directorio vacío', () => {
    const onRetry = vi.fn();
    render(
      <PersonasManager
        personas={[]}
        isLoading={false}
        error="No fue posible cargar"
        onRetry={onRetry}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('No fue posible cargar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
