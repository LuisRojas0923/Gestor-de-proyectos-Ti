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
});
