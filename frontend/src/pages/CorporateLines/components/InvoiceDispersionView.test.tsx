import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InvoiceDispersionView } from './InvoiceDispersionView';

vi.mock('../../../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));

describe('InvoiceDispersionView', () => {
  it('bloquea solicitudes duplicadas mientras carga el reporte', () => {
    const pendiente = new Promise<never>(() => undefined);
    const onFetchReport = vi.fn(() => pendiente);
    const onFetchAlerts = vi.fn(() => pendiente);
    render(
      <InvoiceDispersionView
        onImport={vi.fn()}
        onFetchReport={onFetchReport}
        onFetchAlerts={onFetchAlerts}
        onSelectLine={vi.fn()}
        canImport={false}
      />,
    );

    const button = screen.getByRole('button', { name: 'Cargar Reporte' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onFetchReport).toHaveBeenCalledOnce();
    expect(onFetchAlerts).toHaveBeenCalledOnce();
  });

  it('permite gestionar alertas con teclado', async () => {
    const onSelectLine = vi.fn();
    render(
      <InvoiceDispersionView
        onImport={vi.fn()}
        onFetchReport={vi.fn().mockResolvedValue([])}
        onFetchAlerts={vi.fn().mockResolvedValue([
          { id: 1, linea_id: 7, numero: '3001234567', total: 50000 },
        ])}
        onSelectLine={onSelectLine}
        canImport={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cargar Reporte' }));
    const alerta = await screen.findByRole('button', {
      name: 'Gestionar línea 3001234567',
    });
    fireEvent.keyDown(alerta, { key: 'Enter' });

    expect(onSelectLine).toHaveBeenCalledWith(7);
  });
});
