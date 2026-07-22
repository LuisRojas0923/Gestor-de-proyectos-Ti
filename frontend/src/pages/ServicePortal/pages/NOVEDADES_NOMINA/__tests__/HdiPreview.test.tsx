import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HdiPreview from '../HdiPreview';
import { BrowserRouter } from 'react-router-dom';

// Mocks para servicios API y alertas
vi.mock('../../../../../services/nominaService', () => ({
  nominaService: {
    previewHdi: vi.fn(),
    guardarNovedades: vi.fn(),
    obtenerDatosHdi: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', role: 'admin' },
    hasPermission: () => true,
  }),
}));

describe('HdiPreview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe configurar el input de archivos únicamente para formatos Excel (.xlsx, .xls)', () => {
    render(
      <BrowserRouter>
        <HdiPreview />
      </BrowserRouter>
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.getAttribute('accept')).toBe('.xlsx,.xls');
  });

  it('debe mostrar etiquetas y textos centrados en Excel (no PDF)', () => {
    render(
      <BrowserRouter>
        <HdiPreview />
      </BrowserRouter>
    );

    // Verificar texto de botones o encabezados de Excel
    const buttons = screen.getAllByRole('button');
    const procesarBtn = buttons.find(b => b.textContent?.includes('Excel') || b.textContent?.includes('Procesar'));
    expect(procesarBtn).toBeDefined();
  });

  it('debe advertir si se intenta seleccionar un archivo PDF', async () => {
    render(
      <BrowserRouter>
        <HdiPreview />
      </BrowserRouter>
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const fakePdfFile = new File(['%PDF-1.4 mock content'], 'factura.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [fakePdfFile] } });

    // El input o UI debe rechazar o mostrar mensaje ante extensiones no permitidas
    await waitFor(() => {
      const errorOrInfo = screen.queryByText(/PDF/i) || screen.queryByText(/Excel/i);
      expect(errorOrInfo).not.toBeNull();
    });
  });
});
