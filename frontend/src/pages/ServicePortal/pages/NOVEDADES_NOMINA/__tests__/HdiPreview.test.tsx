import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  addNotification: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('../../../../../hooks/useApi', () => ({
  useApi: () => ({
    get: mocks.apiGet,
    post: mocks.apiPost,
  }),
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
    mocks.apiGet.mockResolvedValue({ rows: [] });
  });

  it('acepta un único archivo Excel', async () => {
    renderComponent();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1));
    expect(mocks.apiGet).toHaveBeenCalledWith(expect.stringMatching(
      /^\/novedades-nomina\/hdi\/datos\?mes=\d{1,2}&anio=\d{4}$/,
    ));

    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    expect(screen.getByLabelText(/Archivo Excel/i)).toBe(fileInput);
    expect(fileInput).toHaveAccessibleName(/Archivo Excel/i);
    expect(fileInput).toHaveClass('peer');
    expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls');
    expect(fileInput).not.toHaveAttribute('multiple');
  });

  it('rechaza PDF, notifica, limpia la selección y no procesa', async () => {
    renderComponent();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1));

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
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });

  it('procesa el Excel mediante el cliente autenticado', async () => {
    mocks.apiPost.mockResolvedValue({
      rows: [],
      summary: { total_asociados: 0 },
      warnings_detalle: [],
    });
    renderComponent();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1));

    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['excel'], 'nomina.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Procesar Excel/i }));

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledWith(
      '/novedades-nomina/hdi/preview',
      expect.any(FormData),
    ));
    const formData = mocks.apiPost.mock.calls[0][1] as FormData;
    expect((formData.get('files') as File).name).toBe('nomina.xlsx');
    expect(formData.get('mes')).toMatch(/^\d{1,2}$/);
    expect(formData.get('anio')).toMatch(/^\d{4}$/);
    expect(mocks.addNotification).toHaveBeenCalledWith(
      'success',
      'Procesados 0 asociados.',
    );
  });

  it('muestra el diagnóstico seguro devuelto por el backend', async () => {
    mocks.apiPost.mockRejectedValue(new Error(
      "Hoja 'HDI', fila 8: PRIMA ANUAL debe ser mayor que cero.",
    ));
    renderComponent();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1));

    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['excel'], 'nomina.xlsx')] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Procesar Excel/i }));

    await waitFor(() => expect(mocks.addNotification).toHaveBeenCalledWith(
      'error',
      "Hoja 'HDI', fila 8: PRIMA ANUAL debe ser mayor que cero.",
    ));
  });

  it('notifica el error al consultar los datos guardados', async () => {
    mocks.apiGet.mockRejectedValue(new Error('No fue posible consultar los datos HDI.'));

    renderComponent();

    await waitFor(() => expect(mocks.addNotification).toHaveBeenCalledWith(
      'error',
      'No fue posible consultar los datos HDI.',
    ));
  });

  it('descarta respuestas obsoletas al cambiar de periodo', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    mocks.apiGet
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));
    renderComponent();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1));

    const month = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(month, { target: { value: month.value === '1' ? '2' : '1' } });
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(2));

    const response = (nombre: string) => ({
      rows: [{
        cedula: nombre === 'PERIODO NUEVO' ? '2' : '1',
        nombre_asociado: nombre,
        empresa: 'REFRIDCOL',
        valor: 100,
        concepto: 'SEGURO DE VIDA',
      }],
      summary: { total_asociados: 1, total_filas: 1, total_valor: 100 },
      warnings_detalle: [],
    });
    resolveSecond(response('PERIODO NUEVO'));
    expect(await screen.findByText('PERIODO NUEVO')).toBeInTheDocument();

    resolveFirst(response('PERIODO ANTERIOR'));
    await waitFor(() => expect(screen.queryByText('PERIODO ANTERIOR')).not.toBeInTheDocument());
    expect(screen.getByText('PERIODO NUEVO')).toBeInTheDocument();
  });
});
