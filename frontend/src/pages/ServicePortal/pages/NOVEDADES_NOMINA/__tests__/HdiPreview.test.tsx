import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  addNotification: vi.fn(),
  axiosGet: vi.fn(),
  axiosPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: mocks.axiosGet,
    post: mocks.axiosPost,
  },
}));

vi.mock('../../../../../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: mocks.addNotification }),
}));

import HdiPreview from '../HdiPreview';

const renderComponent = () => render(
  <MemoryRouter>
    <HdiPreview />
  </MemoryRouter>,
);

describe('HdiPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.axiosGet.mockResolvedValue({ data: { rows: [] } });
  });

  it('acepta un único archivo Excel', async () => {
    renderComponent();
    await waitFor(() => expect(mocks.axiosGet).toHaveBeenCalledTimes(1));

    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls');
    expect(fileInput).not.toHaveAttribute('multiple');
  });

  it('rechaza PDF, notifica, limpia la selección y no procesa', async () => {
    renderComponent();
    await waitFor(() => expect(mocks.axiosGet).toHaveBeenCalledTimes(1));

    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    const validFile = new File(['excel'], 'nomina.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    expect(screen.getByText(/1 seleccionado/i)).toBeInTheDocument();

    const pdf = new File(['%PDF-1.4'], 'nomina.xlsx.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdf] } });

    await waitFor(() => expect(mocks.addNotification).toHaveBeenCalledWith(
      'error',
      'Solo se permite un archivo Excel (.xls o .xlsx).',
    ));
    expect(screen.getByText(/0 seleccionados/i)).toBeInTheDocument();
    expect(fileInput.value).toBe('');

    const processButton = screen.getByRole('button', { name: /Procesar Excel/i });
    expect(processButton).toBeDisabled();
    fireEvent.click(processButton);
    expect(mocks.axiosPost).not.toHaveBeenCalled();
  });
});
