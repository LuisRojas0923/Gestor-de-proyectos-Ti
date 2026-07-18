import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EquiposManager } from './EquiposManager';
import { CorporateDeleteConfirmModal } from './CorporateDeleteConfirmModal';
import { LineDetailForm } from './LineDetailForm';
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

  it('permite cargar equipos posteriores al límite inicial', () => {
    const equipos = Array.from({ length: 201 }, (_, index) => ({
      id: index + 1,
      modelo: `Equipo ${index + 1}`,
      estado_fisico: 'BUENO',
    }));
    render(
      <EquiposManager
        equipos={equipos}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText('Equipo 201')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más equipos' }));
    expect(screen.getByText('Equipo 201')).toBeInTheDocument();
  });

  it('bloquea el cierre por overlay mientras elimina', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <CorporateDeleteConfirmModal
        isOpen
        title="¿Eliminar equipo?"
        description="Esta acción no se puede deshacer"
        isProcessing
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const overlay = container.ownerDocument.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('deshabilita los campos cuando el usuario solo puede consultar', () => {
    render(
      <LineDetailForm
        formData={{ linea: '3001234567', empresa: 'CLARO', estatus: 'ACTIVA' }}
        equipos={[]}
        employeeAlerts={{}}
        isCreating={false}
        onBack={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        canEdit={false}
        isProcessing={false}
        onInputChange={vi.fn()}
        activeSubTab="general"
        setActiveSubTab={vi.fn()}
        companyOptions={[]}
      />,
    );

    expect(screen.getByLabelText('Número de Línea Móvil')).toBeDisabled();
    expect(screen.getByLabelText('Empresa Responsable')).toBeDisabled();
    expect(screen.getByLabelText('Estado de la Línea')).toBeDisabled();
  });
});
